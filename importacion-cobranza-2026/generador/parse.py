"""Lectura y normalización del Excel COBRANZA_2026.xlsx.

Cada renglón útil se convierte en un dict con campos homogéneos, sin importar
la hoja de la que venga ni las columnas movidas.
"""
import datetime as dt
import re
import unicodedata
import warnings

import openpyxl

warnings.filterwarnings('ignore')

HOY = dt.date(2026, 11, 2)

MESES = {'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6, 'JUL': 7,
         'AGO': 8, 'SEP': 9, 'SEPT': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12}


def txt(v):
    if v is None:
        return ''
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    if isinstance(v, (dt.datetime, dt.date)):
        return v.strftime('%Y-%m-%d')
    return re.sub(r'\s+', ' ', str(v)).strip()


def sin_acentos(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')


def clave(s):
    return re.sub(r'[^A-Z0-9]', '', sin_acentos(txt(s)).upper())


def fecha(v):
    """Fecha real (no un recibo convertido por Excel). Acepta datetime o 'dd/mm/aaaa'."""
    if isinstance(v, dt.datetime):
        d = v.date()
    elif isinstance(v, dt.date):
        d = v
    elif isinstance(v, str):
        m = re.fullmatch(r'\s*(\d{1,2})/(\d{1,2})/(\d{4})\s*', v)
        if not m:
            return None
        try:
            d = dt.date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        except ValueError:
            return None
    else:
        return None
    if not (2024 <= d.year <= 2029):
        return None
    return d


TOTALES_VALIDOS = {1, 2, 3, 4, 6, 12}


def recibo(v):
    """Número de recibo 'n/total'. Excel convirtió muchos a fecha (día=n, mes=total)."""
    if v is None:
        return None
    if isinstance(v, (dt.datetime, dt.date)):
        n, t = v.day, v.month
    else:
        s = txt(v).replace(' ', '')
        m = re.fullmatch(r'(\d{1,2})/(\d{1,2})(?:/\d{2,4})?', s) or re.fullmatch(r'(\d{1,2})DE(\d{1,2})', s.upper())
        if not m:
            return None
        n, t = int(m.group(1)), int(m.group(2))
    if t in TOTALES_VALIDOS and 1 <= n <= t:
        return (n, t)
    return None


def es_recibo_fecha(v):
    """Un datetime que en realidad es un recibo convertido (año 2025/2026 y día <= mes)."""
    return isinstance(v, dt.datetime) and recibo(v) is not None


def es_usd(v):
    return isinstance(v, str) and re.search(r'\b(USD|DLS|DOLARES|DÓLARES)\b', v.upper()) is not None


def importe(v):
    if v is None:
        return None
    if isinstance(v, dt.datetime) and v.year > 2100 and v.day == 1:
        # Google Sheets tomó '3838.12' como año.mes: el importe es año + mes/100
        return round(v.year + v.month / 100, 2)
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return round(float(v), 2) if v > 0 else None
    s = re.sub(r'(?i)\s*(MXN|M\.N\.|USD|DLS|D[OÓ]LARES)\.?\s*$', '', txt(v)).replace('$', '').replace(' ', '')
    if not s:
        return None
    # '$18,870,08' -> coma como separador decimal al final
    s = re.sub(r',(\d{2})$', r'.\1', s) if re.search(r',\d{2}$', s) and '.' not in s else s
    s = s.replace(',', '')
    if re.fullmatch(r'\d+(\.\d+)?', s):
        val = round(float(s), 2)
        return val if val > 0 else None
    return None


def importe_al_final(com):
    m = re.search(r'\|\s*\$?\s*([\d,]+\.\d{2})\s*$', txt(com))
    return importe(m.group(1)) if m else None


def fecha_pago_comentario(com, ref):
    """'16ENE APLICADA...' -> fecha más cercana a ref con ese día/mes."""
    if not com or not ref:
        return None
    m = re.match(r'\s*(\d{1,2})\s*(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEPT|SEP|OCT|NOV|DIC)\b', sin_acentos(com).upper())
    if not m:
        return None
    dia, mes = int(m.group(1)), MESES[m.group(2)]
    mejores = []
    for anio in (ref.year - 1, ref.year, ref.year + 1):
        try:
            mejores.append(dt.date(anio, mes, dia))
        except ValueError:
            pass
    if not mejores:
        return None
    d = min(mejores, key=lambda x: abs((x - ref).days))
    if abs((d - ref).days) > 120 or d > HOY:
        return None
    return d


def numero_poliza(v):
    s = txt(v).upper().replace(' ', '')
    return s


def filas(ws, desde=2, ncol=20):
    for i, r in enumerate(ws.iter_rows(min_row=desde, values_only=True), start=desde):
        r = list(r[:ncol]) + [None] * max(0, ncol - len(r))
        if any(v is not None and txt(v) != '' for v in r[:6]):
            yield i, r


def unir_comentarios(*vals):
    partes = []
    for v in vals:
        s = txt(v)
        if s and s not in partes:
            partes.append(s)
    return ' | '.join(partes)


def base(hoja, fila, r, pol, inc, cia, ramo, nombre):
    return {
        'hoja': hoja, 'fila': fila,
        'poliza': numero_poliza(pol), 'inciso': txt(inc), 'cia': txt(cia).upper(),
        'ramo': txt(ramo).upper(), 'nombre': txt(nombre),
        'emision': None, 'limite': None, 'recibo': None, 'importe': None,
        'dagon': None, 'recordatorios': [], 'tipo': '', 'forma': '', 'comentarios': '',
        'agente': '',
    }


def leer(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    out = []

    # ---------------- PENDIENTES ----------------
    for i, r in filas(wb['PENDIENTES '], ncol=17):
        d = base('PENDIENTES', i, r, r[0], r[1], r[2], r[3], r[4])
        d['emision'] = fecha(r[5])
        d['limite'] = fecha(r[6])
        d['recibo'] = recibo(r[7])
        d['importe'] = importe(r[8])
        d['usd'] = es_usd(r[8])
        d['dagon'] = txt(r[9]).upper() or None
        d['recordatorios'] = [x for x in (fecha(v) for v in r[10:14]) if x]
        d['tipo'] = txt(r[14]).upper()
        d['forma'] = txt(r[15])
        d['comentarios'] = txt(r[16])
        d['estado'] = 'pendiente'
        out.append(d)

    # ---------------- PAGADAS ----------------
    for i, r in filas(wb['PAGADAS'], ncol=18):
        d = base('PAGADAS', i, r, r[0], r[1], r[2], r[3], r[4])
        c5, c6, c7 = r[5], r[6], r[7]
        d['recibo'] = recibo(c7) or (recibo(c6) if not fecha(c6) or es_recibo_fecha(c6) else None)
        f5, f6 = fecha(c5), fecha(c6)
        if f6 and not (txt(c6) == txt(c7)) and not (isinstance(c6, str)):
            # col 5 = inicio del recibo, col 6 = último día de pago
            d['emision'], d['limite'] = f5, f6
        else:
            # col 6 duplicaba el recibo: col 5 es el último día de pago
            d['limite'] = f5
        imp = importe(r[8])
        d['importe'] = imp
        d['usd'] = es_usd(r[8])
        d['dagon'] = txt(r[9]).upper() or None
        d['recordatorios'] = [x for x in (fecha(v) for v in r[10:13]) if x]
        d['comentarios'] = unir_comentarios(*[v for v in r[13:18] if isinstance(v, str)])
        d['estado'] = 'pagado'
        out.append(d)

    # ---------------- PAGG HDI MAY / PAGG AXA MAY ----------------
    for hoja in ('PAGG HDI MAY', 'PAGG AXA MAY'):
        for i, r in filas(wb[hoja], ncol=15):
            d = base(hoja, i, r, r[0], r[1], r[2], r[3], r[4])
            d['emision'] = fecha(r[5])
            d['limite'] = fecha(r[6])
            d['recibo'] = recibo(r[7])
            d['importe'] = importe(r[8])
            d['usd'] = es_usd(r[8])
            d['dagon'] = txt(r[9]).upper() or None
            d['recordatorios'] = [x for x in (fecha(v) for v in r[10:13]) if x]
            d['comentarios'] = unir_comentarios(*[v for v in r[13:15] if isinstance(v, str)])
            d['estado'] = 'pagado_o_pendiente'  # se decide al cruzar con PAGADAS
            out.append(d)

    # ---------------- CANCELADAS X FALTA DE PAGO ----------------
    for i, r in filas(wb['CANCELADAS X FALTA DE PAGO'], ncol=17):
        d = base('CANCELADAS X FALTA DE PAGO', i, r, r[0], r[1], r[2], r[3], r[4])
        d['limite'] = fecha(r[5])
        d['recibo'] = recibo(r[6])
        # el importe viene a veces en COMENTARIOS (col 7) o en DAGON (col 8)
        d['importe'] = importe(r[7]) or importe(r[8])
        d['usd'] = es_usd(r[7]) or es_usd(r[8])
        d['dagon'] = (txt(r[8]).upper() or None) if not importe(r[8]) else None
        d['recordatorios'] = [x for x in (fecha(v) for v in r[9:12]) if x]
        d['comentarios'] = unir_comentarios(*[v for v in [r[7]] + list(r[12:17]) if isinstance(v, str) and not importe(v)])
        d['estado'] = 'cancelado_falta_pago'
        out.append(d)

    # ---------------- NO SE VAN A PAGAR ----------------
    for i, r in filas(wb['NO SE VAN A PAGAR'], ncol=17):
        d = base('NO SE VAN A PAGAR', i, r, r[0], r[1], r[2], r[3], r[4])
        d['limite'] = fecha(r[5])
        d['recibo'] = recibo(r[6])
        d['importe'] = importe(r[7]) or importe(r[8])
        d['usd'] = es_usd(r[7]) or es_usd(r[8])
        d['dagon'] = (txt(r[8]) or txt(r[7]) if not importe(r[7]) else txt(r[8])).upper() or None
        d['recordatorios'] = [x for x in (fecha(v) for v in r[9:12]) if x]
        d['comentarios'] = unir_comentarios(*[v for v in r[12:17] if isinstance(v, str)])
        d['estado'] = 'no_se_paga'
        out.append(d)

    # ---------------- CASTORES ----------------
    for i, r in filas(wb['CASTORES'], ncol=14):
        d = base('CASTORES', i, r, r[0], r[1], r[2], r[3], r[4])
        if not d['cia'] and not d['nombre']:
            # renglones que sólo traen póliza e inciso: heredan del renglón anterior
            prev = next((x for x in reversed(out) if x['hoja'] == 'CASTORES'), None)
            if prev:
                d['cia'], d['ramo'], d['nombre'] = prev['cia'], prev['ramo'], prev['nombre']
        d['limite'] = fecha(r[5])
        d['recibo'] = recibo(r[6])
        d['importe'] = importe(r[7])
        com = [v for v in r[12:14] if v is not None]
        # En esta hoja la columna de comentarios muchas veces trae el importe
        if d['importe'] is None and com and not (isinstance(com[0], dt.datetime) and com[0].year <= 2100) and importe(com[0]):
            d['importe'] = importe(com[0])
            com = com[1:]
        if d['importe'] is None and com and importe_al_final(com[0]):
            d['importe'] = importe_al_final(com[0])
        d['dagon'] = txt(r[8]).upper() or None
        d['recordatorios'] = [x for x in (fecha(v) for v in r[9:12]) if x]
        d['comentarios'] = unir_comentarios(*[v for v in com if isinstance(v, str)])
        d['estado'] = 'castores'
        out.append(d)

    # ---------------- 5 DIAS (seguimiento: sólo comentarios y agente) ----------------
    seguimiento = []
    ws = wb['5 DIAS']
    bloque = None
    for i, r in filas(ws, desde=1, ncol=6):
        c0 = txt(r[0]).upper()
        if c0 == 'CANCELADAS':
            bloque = 'CANCELADAS'
            continue
        if c0 in ('PÓLIZA', 'POLIZA'):
            if bloque != 'CANCELADAS':
                bloque = 'SEGUIMIENTO'
            elif txt(r[1]).upper().startswith('CLIENTE'):
                bloque = 'SEGUIMIENTO'
            continue
        seguimiento.append({
            'hoja': '5 DIAS', 'fila': i, 'bloque': bloque,
            'poliza': numero_poliza(r[0]), 'poliza_txt': txt(r[0]), 'agente_o_inciso': txt(r[1]), 'nombre': txt(r[2]),
            'limite': fecha(r[3]), 'limite_txt': txt(r[3]), 'comentarios': txt(r[4]),
        })
    return out, seguimiento
