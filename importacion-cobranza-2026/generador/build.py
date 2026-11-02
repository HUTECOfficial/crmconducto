"""Construye clientes, pólizas y recibos a partir del Excel y escribe el SQL de importación.

Uso: python3 build.py COBRANZA_2026.xlsx carpeta_salida
"""
import collections
import csv
import datetime as dt
import json
import os
import re
import sys
import uuid

from parse import HOY, clave, leer, sin_acentos, txt
from group import add_months, cia_db, construir, ramo_db, vigencias

NS = uuid.UUID('6f1d7c1e-2b7a-4c55-9a43-c0b2a2026110')
ORIGEN = 'COBRANZA_2026.xlsx'
MARCA = 'Importado de COBRANZA_2026.xlsx'

PRIORIDAD = {'pagado': 5, 'cancelado': 4, 'por_validar': 3, 'vencido': 2, 'pendiente': 1}

RE_PAGADO = re.compile(r'\bPAGAD[AO]S?\b|SE REALIZ[OÓ] EL PAGO|ENVI[OÓ] COMPROBANTE|\bAPLICAD[AO]\b', re.I)
RE_NO_PAGADO = re.compile(r'\bNO\s+(SE\s+)?(HA\s+)?(PAG|APLIC|CONFIRM)|SIN\s+CONFIRMA|PENDIENTE DE PAGO|RECHAZ', re.I)


def uid(*parts):
    return str(uuid.uuid5(NS, '|'.join(str(p) for p in parts)))


def forma_pago(total):
    return {1: 'anual', 2: 'semestral', 3: 'trimestral', 4: 'trimestral', 6: 'mensual', 12: 'mensual'}.get(total, 'anual')


def tipo_pago(formas):
    s = sin_acentos(' '.join(formas)).upper()
    if 'DOMICIL' in s or 'CARGO AUTOM' in s:
        return 'domiciliacion'
    if 'TARJETA' in s:
        return 'tarjeta'
    return None


def estado_registro(r):
    hoja = r['hoja']
    if hoja in ('PAGADAS', 'PAGG HDI MAY', 'PAGG AXA MAY', 'CASTORES'):
        return 'pagado'
    if hoja in ('CANCELADAS X FALTA DE PAGO', 'NO SE VAN A PAGAR'):
        return 'cancelado'
    com = r['comentarios'] or ''
    if RE_PAGADO.search(com) and not RE_NO_PAGADO.search(com):
        return 'por_validar'
    return 'vencido' if r['limite'] < HOY else 'pendiente'


def nombre_mejor(nombres):
    nombres = [n for n in nombres if n]
    if not nombres:
        return 'SIN NOMBRE (REVISAR)'
    c = collections.Counter(nombres)
    top = c.most_common(1)[0][0]
    # Si hay una versión más larga que empieza igual (nombre recortado en el Excel), usarla.
    largos = [n for n in c if clave(n).startswith(clave(top)) and len(n) > len(top)]
    return max(largos, key=len) if largos else top


def fusionar(rs):
    """Une renglones que son el mismo recibo (mismo n/total, límite a <= 5 días)."""
    rs = sorted(rs, key=lambda r: (r['recibo'], r['limite']))
    grupos = []
    for r in rs:
        r['_estado'] = estado_registro(r)
        g = next((g for g in grupos if g['recibo'] == r['recibo'] and abs((g['limite'] - r['limite']).days) <= 5
                  # mismo inciso con otro importe = otro cobro (endoso), no un duplicado
                  and not (r['importe'] and any(x['importe'] and x['ikey'] == r['ikey'] and abs(x['importe'] - r['importe']) > 0.01 for x in g['rs']))), None)
        if g is None:
            grupos.append({'recibo': r['recibo'], 'limite': r['limite'], 'emision': r['emision'], 'rs': [r]})
        else:
            g['rs'].append(r)
    for g in grupos:
        rs_g = g['rs']
        g['estado'] = max((r['_estado'] for r in rs_g), key=lambda e: PRIORIDAD[e])
        principal = next(r for r in rs_g if r['_estado'] == g['estado'])
        g['principal'] = principal
        g['limite'] = principal['limite']
        g['emision'] = principal['emision']
        # importes: distintos incisos con importes distintos se suman (recibo + endoso)
        por_inciso = {}
        for r in rs_g:
            if r['importe']:
                por_inciso.setdefault(r['ikey'], r['importe'])
        g['importe'] = round(sum(por_inciso.values()), 2) if por_inciso else None
        g['hojas'] = sorted({r['hoja'] for r in rs_g})
        g['filas'] = [f"{r['hoja']}#{r['fila']}" for r in rs_g]
        com = []
        for r in sorted(rs_g, key=lambda r: -PRIORIDAD[r['_estado']]):
            if r['comentarios'] and r['comentarios'] not in com:
                com.append(r['comentarios'])
        g['comentarios'] = ' | '.join(com)
        g['recordatorios'] = sorted({d for r in rs_g for d in r['recordatorios']})
        g['inferido'] = any(r.get('_inferido') for r in rs_g)
        fp = None
        if g['estado'] == 'pagado':
            from parse import fecha_pago_comentario
            for r in rs_g:
                fp = fecha_pago_comentario(r['comentarios'], r['limite'])
                if fp:
                    break
        g['fecha_pago'] = fp
    return grupos


def numerar(grupos, inicio, total_decl):
    """Asigna número de recibo único dentro de la vigencia."""
    meses = 12 // total_decl
    usados = collections.Counter(g['recibo'][0] for g in grupos)
    if all(v == 1 for v in usados.values()) and all(g['recibo'][1] == total_decl for g in grupos):
        for g in grupos:
            g['n'] = g['recibo'][0]
        return total_decl, False
    # Hay choques o totales distintos: número según la fecha dentro de la vigencia.
    ocupados = set()
    extra = []
    for g in sorted(grupos, key=lambda g: g['limite']):
        k = 0
        while k < total_decl - 1 and add_months(inicio, meses * (k + 1)) <= g['emision']:
            k += 1
        n = k + 1
        if n in ocupados:
            extra.append(g)
        else:
            g['n'] = n
            ocupados.add(n)
    tope = max(total_decl, max(ocupados) if ocupados else 0)
    for g in extra:
        tope += 1
        g['n'] = tope
    return tope, True


def construir_todo(path):
    recs, seguimiento = leer(path)
    unidades = construir(recs)

    clientes = {}
    polizas = []
    pagos = []
    unidades_flotilla = []
    no_importados = []
    companias_usadas = set()
    numeros_usados = collections.Counter()

    # compañía/ramo por póliza (mayoría), para renglones con esas columnas vacías o movidas
    por_numero = collections.defaultdict(list)
    for (pkey, ik), rs in unidades.items():
        por_numero[pkey].extend(rs)

    def mayoria(rs, f):
        c = collections.Counter(v for v in (f(r) for r in rs) if v)
        return c.most_common(1)[0][0] if c else None

    for (pkey, ikey), rs in sorted(unidades.items()):
        hermanos = por_numero[pkey]
        compania = mayoria(rs, lambda r: cia_db(r['cia'])) or mayoria(hermanos, lambda r: cia_db(r['cia']))
        ramo = mayoria(rs, lambda r: ramo_db(r['ramo'])) or mayoria(hermanos, lambda r: ramo_db(r['ramo']))
        if not compania:
            compania = 'Compañía por definir'
        if not ramo:
            ramo = 'autos' if compania == 'Qualitas' else 'danos'
        companias_usadas.add(compania)
        num_display = mayoria(rs, lambda r: txt(r['poliza']).upper()) or pkey
        inciso_display = mayoria(rs, lambda r: r['inciso'] if r['ikey'] else None) or ''

        grupos_vig, sin_fecha = vigencias(rs)
        for r in sin_fecha:
            no_importados.append((r, 'Sin fecha de pago ni de inicio del recibo'))
        if not grupos_vig:
            continue

        anterior_id = None
        for idx, vg in enumerate(grupos_vig):
            actual = idx == len(grupos_vig) - 1
            inicio = vg['inicio']
            fin = add_months(inicio, 12)
            tot = collections.Counter(r['recibo'][1] for r in vg['rs'])
            total_decl = tot.most_common(1)[0][0]
            recibos = fusionar(vg['rs'])
            total, renumerado = numerar(recibos, inicio, total_decl)

            numero = num_display
            if ikey:
                numero = f"{num_display} INC {ikey}"
            if not actual:
                numero = f"{numero} (VIG {inicio.year})"
            numeros_usados[numero] += 1
            if numeros_usados[numero] > 1:
                numero = f"{numero} #{numeros_usados[numero]}"

            pid = uid('poliza', pkey, ikey, inicio.isoformat())
            nombre = nombre_mejor([r['nombre'] for r in vg['rs']]) if vg['rs'] else nombre_mejor([r['nombre'] for r in rs])
            ckey = clave(nombre)
            if ckey not in clientes:
                clientes[ckey] = {'id': uid('cliente', ckey), 'nombre': nombre}
            cid = clientes[ckey]['id']

            # importe de referencia de la vigencia (para recibos sin importe)
            conocidos = [g['importe'] for g in recibos if g['importe']]
            ref_importe = collections.Counter(conocidos).most_common(1)[0][0] if conocidos else None

            # Recibos anteriores al primero que aparece, en la vigencia vigente con pendientes: se asumen pagados.
            tiene_pend = any(g['estado'] in ('pendiente', 'vencido', 'por_validar') for g in recibos)
            asumidos = []
            if actual and tiene_pend and not renumerado:
                presentes = {g['n'] for g in recibos}
                meses = 12 // total
                for n in range(1, min(presentes)):
                    if n in presentes:
                        continue
                    em = add_months(inicio, meses * (n - 1))
                    asumidos.append({'n': n, 'emision': em, 'limite': em + (recibos[0]['limite'] - recibos[0]['emision']),
                                     'estado': 'pagado', 'importe': None, 'asumido': True, 'comentarios': '',
                                     'recordatorios': [], 'fecha_pago': None, 'hojas': [], 'filas': [], 'recibo': (n, total)})
            todos = sorted(recibos + asumidos, key=lambda g: g['n'])

            filas_pago = []
            for g in todos:
                monto = g['importe']
                nota = []
                if g.get('asumido'):
                    nota.append('Recibo anterior a los pendientes del Excel; se asume pagado.')
                else:
                    nota.append(f"Excel: {', '.join(g['filas'])}.")
                    if g['recibo'] != (g['n'], total):
                        nota.append(f"En el Excel venía como recibo {g['recibo'][0]}/{g['recibo'][1]}.")
                    if g.get('inferido'):
                        nota.append('Número de recibo deducido por la fecha.')
                if monto is None:
                    if ref_importe:
                        monto = ref_importe
                        nota.append('Importe estimado con otro recibo de la misma póliza.')
                    else:
                        monto = 0
                        nota.append('Importe pendiente de capturar.')
                if g['estado'] == 'cancelado':
                    hoja_c = 'CANCELADAS X FALTA DE PAGO' if 'CANCELADAS X FALTA DE PAGO' in g['hojas'] else 'NO SE VAN A PAGAR'
                    motivo = ('Cancelado por falta de pago' if hoja_c.startswith('CANCELADAS') else 'No se va a pagar') + (f": {g['comentarios']}" if g['comentarios'] else '')
                else:
                    motivo = None
                filas_pago.append({
                    'id': uid('pago', pid, g['n']),
                    'poliza_id': pid, 'cliente_id': cid,
                    'monto': round(monto, 2),
                    'estatus': g['estado'],
                    'numero_recibo': g['n'], 'total_recibos': total,
                    'anualidad': 1,
                    'fecha_emision': g['emision'], 'fecha_limite': g['limite'],
                    'fecha_pago': g['fecha_pago'] if g['estado'] == 'pagado' else None,
                    'notas': ' '.join(nota + ([f"Comentarios: {g['comentarios']}"] if g['comentarios'] and g['estado'] != 'cancelado' else []))[:2000],
                    'motivo_cancelacion': motivo[:1000] if motivo else None,
                    'hojas': g['hojas'], 'recordatorios': g['recordatorios'], 'comentarios': g['comentarios'],
                    'registrado': g['estado'] in ('pagado', 'por_validar'),
                })
            pagos.extend(filas_pago)

            total_prima = round(sum(p['monto'] for p in filas_pago), 2)
            cobrada = round(sum(p['monto'] for p in filas_pago if p['estatus'] == 'pagado'), 2)
            activos = [p for p in filas_pago if p['estatus'] in ('pendiente', 'vencido', 'por_validar')]
            ultimo = max(filas_pago, key=lambda p: p['fecha_limite'])
            hojas = sorted({h for p in filas_pago for h in p['hojas']})

            cancelacion_motivo = None
            if not actual:
                estatus = 'renovada'
            elif activos:
                estatus = 'activa'
            elif ultimo['estatus'] == 'cancelado' and 'CANCELADAS X FALTA DE PAGO' in ultimo['hojas']:
                estatus, cancelacion_motivo = 'cancelada-falta-pago', 'falta-pago'
            elif ultimo['estatus'] == 'cancelado':
                estatus, cancelacion_motivo = 'cancelada', 'otro'
            else:
                estatus = 'activa'

            en_curso = min(activos, key=lambda p: p['numero_recibo']) if activos else None
            fechas_rec = None
            comentarios = ultimo['comentarios'] or None
            if en_curso:
                rec = en_curso['recordatorios'][:3]
                fechas_rec = {'reciboId': en_curso['id']}
                for i, d in enumerate(rec, start=1):
                    fechas_rec[f'fecha{i}'] = d.isoformat()
                comentarios = en_curso['comentarios'] or None

            formas = [r['forma'] for r in vg['rs'] if r.get('forma')]
            dagon = any((r['dagon'] or '') == 'SI' for r in vg['rs'])
            ceros = sum(1 for p in filas_pago if p['monto'] == 0)
            notas = f"{MARCA} (hojas: {', '.join(hojas) or 'ninguna'}) el {HOY.isoformat()}. Vigencia calculada a partir de los recibos."
            if ceros:
                notas += f" {ceros} recibo(s) sin importe: capturar el importe."
            if renumerado:
                notas += ' Los números de recibo se ordenaron por fecha porque el Excel los repetía.'
            if formas:
                notas += f" Forma de pago en Excel: {'; '.join(sorted(set(formas)))}."

            pol = {
                'id': pid, 'cliente_id': cid, 'compania': compania, 'ramo': ramo,
                'numero_poliza': numero[:200],
                'vigencia_inicio': inicio, 'vigencia_fin': fin,
                'prima': total_prima, 'prima_emitida': total_prima, 'prima_total': total_prima,
                'prima_cobrada': cobrada,
                'forma_pago': forma_pago(total_decl),
                'estatus': estatus, 'cancelacion_motivo': cancelacion_motivo,
                'renovacion_estado': 'renovada' if not actual else 'sin_iniciar',
                'renovada_desde_id': anterior_id if actual else None,
                'renovada_a_id': None,
                'fecha_emision': inicio,
                'inciso_endoso': inciso_display or None,
                'nombre_asegurado': nombre,
                'ultimo_dia_pago': (en_curso or ultimo)['fecha_limite'],
                'numero_recibo': f"{(en_curso or ultimo)['numero_recibo']}/{total}",
                'prima_total_recibo': (en_curso or ultimo)['monto'] or None,
                'registro_sistema_cobranza': dagon,
                'fechas_recordatorio': fechas_rec,
                'comentarios': comentarios[:4000] if comentarios else None,
                'notas': notas,
                'tipo_pago': tipo_pago(formas),
                'agente': None,
                'pkey': pkey, 'ikey': ikey, 'actual': actual,
            }
            if not actual:
                pol['renovada_a_id'] = uid('poliza', pkey, ikey, grupos_vig[idx + 1]['inicio'].isoformat())
            polizas.append(pol)
            if ramo == 'flotilla' and ikey:
                unidades_flotilla.append({'id': uid('unidad', pid), 'poliza_id': pid, 'numero_inciso': inciso_display or ikey, 'descripcion': nombre})
            anterior_id = pid

    # ---- 5 DIAS: comentarios de seguimiento y agente ----
    seg_sin_poliza = []
    por_pkey = collections.defaultdict(list)
    for p in polizas:
        if p['actual']:
            por_pkey[p['pkey']].append(p)
    for s in seguimiento:
        k = clave(s['poliza'])
        objetivo = por_pkey.get(k, [])
        if not objetivo:
            seg_sin_poliza.append(s)
            continue
        texto = f"[Seguimiento 5 DÍAS, {s['limite_txt'] or 'sin fecha'}] {s['comentarios']}".strip()
        agente = s['agente_o_inciso'] if s['agente_o_inciso'] and not re.search(r'\d', s['agente_o_inciso']) else None
        for p in objetivo:
            p['comentarios'] = (texto + (' | ' + p['comentarios'] if p['comentarios'] else ''))[:4000]
            if agente:
                p['agente'] = agente.upper()

    return {
        'clientes': list(clientes.values()), 'polizas': polizas, 'pagos': pagos,
        'unidades_flotilla': unidades_flotilla, 'companias': sorted(companias_usadas),
        'no_importados': no_importados, 'seg_sin_poliza': seg_sin_poliza, 'recs': recs,
    }


# ------------------------------------------------------------------ SQL
def q(v):
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return 'TRUE' if v else 'FALSE'
    if isinstance(v, (int, float)):
        return repr(round(v, 2)) if isinstance(v, float) else str(v)
    if isinstance(v, (dt.date, dt.datetime)):
        return f"'{v.isoformat()}'"
    if isinstance(v, (dict, list)):
        return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    return "'" + str(v).replace("'", "''") + "'"


COLORES = {'Seguros Atlas': '#1F4E79', 'BX+ Seguros': '#6D2077', 'ANA Seguros': '#0072CE', 'Pan-American Life': '#003DA5',
           'Plan Seguro': '#00A3AD', 'BUPA': '#0079C8', 'Seguros Monterrey New York Life': '#002F6C', 'CRABI': '#FF5A00',
           'GMX Seguros': '#004B8D', 'Compañía por definir': '#64748b'}


def escribir_sql(data, salida):
    os.makedirs(salida, exist_ok=True)
    partes = []

    cab = """-- =====================================================
-- IMPORTACIÓN DE COBRANZA 2026 (COBRANZA_2026.xlsx) — PARTE {n} DE {t}
-- Ejecutar en Supabase → SQL Editor, en orden (parte 1, 2, 3...), cada parte completa.
-- Cada parte va en una transacción: si algo falla no se guarda nada de esa parte
-- y se puede volver a correr (no duplica: usa identificadores fijos).
-- =====================================================
"""
    # Todas las sentencias en orden; al final se reparten en partes de ~1 MB.
    L = []
    L.append("-- Compañías que falten (las que ya existen se respetan)")
    for c in data['companias']:
        L.append(f"INSERT INTO companias (nombre, color) SELECT {q(c)}, {q(COLORES.get(c, '#64748b'))} WHERE NOT EXISTS (SELECT 1 FROM companias WHERE lower(nombre) = lower({q(c)}));")
    L.append("")
    L.append("-- Clientes (teléfono y correo quedan por completar)")
    filas = [f"({q(c['id'])}, {q(c['nombre'])}, 'Pendiente', CURRENT_DATE, 'activo', {q(MARCA + ' — completar datos de contacto.')})" for c in data['clientes']]
    for i in range(0, len(filas), 500):
        L.append("INSERT INTO clientes (id, nombre, telefono, fecha_registro, estatus, notas) VALUES\n" + ",\n".join(filas[i:i + 500]) + "\nON CONFLICT (id) DO NOTHING;")
    L.append("")
    L.append("-- Pólizas")
    cols = ['id', 'cliente_id', 'compania_id', 'ramo', 'numero_poliza', 'vigencia_inicio', 'vigencia_fin', 'prima', 'prima_emitida',
            'prima_total', 'prima_cobrada', 'forma_pago', 'estatus', 'cancelacion_motivo', 'renovacion_estado', 'fecha_emision',
            'inciso_endoso', 'nombre_asegurado', 'ultimo_dia_pago', 'numero_recibo', 'prima_total_recibo', 'registro_sistema_cobranza',
            'comentarios', 'notas', 'tipo_pago', 'agente', 'divisas']
    vals = []
    for p in data['polizas']:
        comp = f"(SELECT id FROM companias WHERE lower(nombre) = lower({q(p['compania'])}) LIMIT 1)"
        vals.append("(" + ", ".join([q(p['id']), q(p['cliente_id']), comp, q(p['ramo']), q(p['numero_poliza']), q(p['vigencia_inicio']),
                                       q(p['vigencia_fin']), q(p['prima']), q(p['prima_emitida']), q(p['prima_total']), q(p['prima_cobrada']),
                                       q(p['forma_pago']), q(p['estatus']), q(p['cancelacion_motivo']), q(p['renovacion_estado']),
                                       q(p['fecha_emision']), q(p['inciso_endoso']), q(p['nombre_asegurado']), q(p['ultimo_dia_pago']),
                                       q(p['numero_recibo']), q(p['prima_total_recibo']), q(p['registro_sistema_cobranza']),
                                       q(p['comentarios']), q(p['notas']), q(p['tipo_pago']), q(p['agente']), "'MXN'"]) + ")")
    for i in range(0, len(vals), 300):
        L.append(f"INSERT INTO polizas ({', '.join(cols)}) VALUES\n" + ",\n".join(vals[i:i + 400]) + "\nON CONFLICT (id) DO NOTHING;")
    L.append("")
    L.append("-- Enlaces de renovación entre vigencias de la misma póliza")
    for p in data['polizas']:
        if p['renovada_a_id']:
            L.append(f"UPDATE polizas SET renovada_a_id = {q(p['renovada_a_id'])} WHERE id = {q(p['id'])};")
        if p['renovada_desde_id']:
            L.append(f"UPDATE polizas SET renovada_desde_id = {q(p['renovada_desde_id'])} WHERE id = {q(p['id'])};")
    L.append("")
    L.append("-- Flotillas: un registro por póliza de flotilla y su inciso")
    L.append("INSERT INTO flotillas (poliza_id, nombre)\nSELECT id, 'Flotilla ' || numero_poliza FROM polizas\nWHERE ramo = 'flotilla' AND notas LIKE " + q(MARCA + '%') + "\nON CONFLICT (poliza_id) DO NOTHING;")
    uf = [f"({q(u['poliza_id'])}, {q(u['numero_inciso'])}, {q(u['descripcion'])})" for u in data['unidades_flotilla']]
    for i in range(0, len(uf), 800):
        L.append("INSERT INTO flotilla_unidades (flotilla_id, numero_inciso, descripcion)\nSELECT f.id, v.inciso, v.descripcion FROM (VALUES\n" + ",\n".join(uf[i:i + 800]) +
                 "\n) AS v(poliza_id, inciso, descripcion)\nJOIN flotillas f ON f.poliza_id = v.poliza_id::uuid\nON CONFLICT DO NOTHING;")
    # ---- Recibos ----
    pcols = ['id', 'poliza_id', 'cliente_id', 'monto', 'fecha_pago', 'metodo_pago', 'estatus', 'notas', 'numero_recibo', 'total_recibos',
             'anualidad', 'moneda', 'fecha_emision', 'fecha_limite', 'registrado_en', 'validado_en', 'cancelado_en', 'motivo_cancelacion']
    pv = []
    for p in data['pagos']:
        reg = None
        if p['registrado']:
            reg = f"{(p['fecha_pago'] or p['fecha_limite']).isoformat()} 12:00:00-06"
        val = reg if p['estatus'] == 'pagado' else None
        canc = f"{HOY.isoformat()} 12:00:00-06" if p['estatus'] == 'cancelado' else None
        pv.append("(" + ", ".join([q(p['id']), q(p['poliza_id']), q(p['cliente_id']), q(p['monto']), q(p['fecha_pago']), 'NULL', q(p['estatus']),
                                     q(p['notas']), str(p['numero_recibo']), str(p['total_recibos']), '1', "'MXN'", q(p['fecha_emision']),
                                     q(p['fecha_limite']), q(reg), q(val), q(canc), q(p['motivo_cancelacion'])]) + ")")
    por_parte = 2500
    for j in range(0, len(pv), 500):
        L.append(f"INSERT INTO pagos ({', '.join(pcols)}) VALUES\n" + ",\n".join(pv[j:j + 500]) + "\nON CONFLICT (id) DO NOTHING;")

    # ---- Recordatorios del recibo en curso ----
    L.append("-- Recordatorios del recibo en curso (van ligados al id del recibo)")
    fr = [f"({q(p['id'])}, {q(p['fechas_recordatorio'])})" for p in data['polizas'] if p['fechas_recordatorio']]
    for i in range(0, len(fr), 800):
        L.append("UPDATE polizas p SET fechas_recordatorio = v.f FROM (VALUES\n" + ",\n".join(fr[i:i + 800]) + "\n) AS v(id, f) WHERE p.id = v.id::uuid;")
    verificacion = (f"""
-- Comprobación: debe coincidir con lo que dice el resumen de la importación
SELECT 'clientes' AS que, count(*) FROM clientes WHERE notas LIKE {q(MARCA + '%')}
UNION ALL SELECT 'polizas', count(*) FROM polizas WHERE notas LIKE {q(MARCA + '%')}
UNION ALL SELECT 'recibos', count(*) FROM pagos pg JOIN polizas p ON p.id = pg.poliza_id WHERE p.notas LIKE {q(MARCA + '%')}
UNION ALL SELECT 'recibos pendientes o vencidos', count(*) FROM pagos pg JOIN polizas p ON p.id = pg.poliza_id WHERE p.notas LIKE {q(MARCA + '%')} AND pg.estatus IN ('pendiente','vencido')
UNION ALL SELECT 'recibos por validar', count(*) FROM pagos pg JOIN polizas p ON p.id = pg.poliza_id WHERE p.notas LIKE {q(MARCA + '%')} AND pg.estatus = 'por_validar'
UNION ALL SELECT 'recibos pagados', count(*) FROM pagos pg JOIN polizas p ON p.id = pg.poliza_id WHERE p.notas LIKE {q(MARCA + '%')} AND pg.estatus = 'pagado'
UNION ALL SELECT 'recibos cancelados', count(*) FROM pagos pg JOIN polizas p ON p.id = pg.poliza_id WHERE p.notas LIKE {q(MARCA + '%')} AND pg.estatus = 'cancelado';""")

    LIMITE = 1_100_000
    actual, tam = [], 0
    for st in L:
        if actual and tam + len(st) > LIMITE and not st.startswith('--'):
            partes.append(actual)
            actual, tam = [], 0
        actual.append(st)
        tam += len(st)
    if actual:
        partes.append(actual)
    partes = [["BEGIN;", ""] + p + ["", "COMMIT;"] for p in partes]
    partes[-1].append(verificacion)

    rutas = []
    for n, L in enumerate(partes, start=1):
        ruta = os.path.join(salida, f"supabase-importar-cobranza-2026-parte-{n}.sql")
        with open(ruta, 'w', encoding='utf-8') as fh:
            fh.write(cab.format(n=n, t=len(partes)) + "\n" + "\n".join(L) + "\n")
        rutas.append(ruta)
    return rutas


def escribir_reporte(data, salida):
    ruta = os.path.join(salida, 'cobranza-2026-no-importado.csv')
    with open(ruta, 'w', newline='', encoding='utf-8-sig') as fh:
        w = csv.writer(fh)
        w.writerow(['Hoja', 'Fila', 'Póliza', 'Inciso', 'Nombre', 'Motivo', 'Comentarios'])
        for r, motivo in data['no_importados']:
            w.writerow([r['hoja'], r['fila'], r['poliza'], r['inciso'], r['nombre'], motivo, r['comentarios']])
        for s in data['seg_sin_poliza']:
            w.writerow([s['hoja'], s['fila'], s['poliza_txt'], s['agente_o_inciso'], s['nombre'], 'Seguimiento 5 DÍAS sin póliza que coincida', s['comentarios']])
    return ruta


if __name__ == '__main__':
    data = construir_todo(sys.argv[1])
    salida = sys.argv[2]
    rutas = escribir_sql(data, salida)
    rep = escribir_reporte(data, salida)
    C = collections.Counter
    resumen = {
        'clientes': len(data['clientes']), 'polizas': len(data['polizas']),
        'polizas_por_estatus': dict(C(p['estatus'] for p in data['polizas'])),
        'polizas_por_ramo': dict(C(p['ramo'] for p in data['polizas'])),
        'polizas_por_compania': dict(C(p['compania'] for p in data['polizas'])),
        'recibos': len(data['pagos']), 'recibos_por_estatus': dict(C(p['estatus'] for p in data['pagos'])),
        'recibos_sin_importe': sum(1 for p in data['pagos'] if p['monto'] == 0),
        'recibos_asumidos_pagados': sum(1 for p in data['pagos'] if 'se asume pagado' in p['notas']),
        'unidades_flotilla': len(data['unidades_flotilla']),
        'no_importados': len(data['no_importados']), 'seguimiento_sin_poliza': len(data['seg_sin_poliza']),
        'renglones_excel': len(data['recs']),
        'archivos': [os.path.basename(r) + f" ({os.path.getsize(r)//1024} KB)" for r in rutas + [rep]],
    }
    print(json.dumps(resumen, ensure_ascii=False, indent=1, default=str))
