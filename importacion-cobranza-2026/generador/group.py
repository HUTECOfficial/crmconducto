"""Agrupa los renglones normalizados en unidades de cobro (póliza o póliza+inciso),
vigencias y recibos."""
import collections
import datetime as dt
import re

from parse import HOY, clave, sin_acentos, txt

GRACIA = {'QUALITAS': 0, 'QUALITAS EXP': 0, 'QUALITAS CRM': 0, 'METLIFE': 0}

RAMO_MAP = [
    (r'FLOT', 'flotilla'),
    (r'GMM|GASTOS|SALUD|MEDIC', 'gastos-medicos'),
    (r'VIDA|SVI', 'vida'),
    (r'^AP$|ACCIDENTE', 'accidentes-personales'),
    (r'AUTO|CAMION|PICK|MOTO|LIGEROS', 'autos'),
    (r'HOGAR|CASA', 'hogar'),
    (r'EMPRESA', 'empresa'),
    (r'DAÑO|DANO|R\.?C|RESP|EMBARQUE|TRANSPORTE', 'danos'),
]

# Nombre en el Excel -> nombre de la compañía en la base (las 10 sembradas en supabase-schema.sql
# o una nueva que se crea).
CIA_MAP = [
    (r'^AXA', 'AXA Seguros'),
    (r'^HDI', 'HDI Seguros'),
    (r'^QU[AÁ]LITAS', 'Qualitas'),
    (r'^GNP', 'GNP Seguros'),
    (r'^METLIFE', 'Metlife'),
    (r'^BANORTE', 'Banorte Seguros'),
    (r'^ALLIANZ', 'Allianz'),
    (r'^MAPFRE', 'MAPFRE'),
    (r'^ZURICH', 'Zurich'),
    (r'^CHUBB', 'Chubb'),
    (r'^ATLAS', 'Seguros Atlas'),
    (r'^BX\+', 'BX+ Seguros'),
    (r'^ANA', 'ANA Seguros'),
    (r'^PANAMERICAN', 'Pan-American Life'),
    (r'^PLAN SEGURO', 'Plan Seguro'),
    (r'^BUPA', 'BUPA'),
    (r'^SEGUROS MONTERREY', 'Seguros Monterrey New York Life'),
    (r'^CRABI', 'CRABI'),
    (r'^GMX', 'GMX Seguros'),
]


def ramo_db(ramo):
    r = sin_acentos(ramo).upper()
    for pat, val in RAMO_MAP:
        if re.search(sin_acentos(pat), r):
            return val
    return None


def cia_db(cia):
    c = cia.strip().upper()
    for pat, val in CIA_MAP:
        if re.search(pat, c):
            return val
    return None


def add_months(d, m):
    y, mo = divmod(d.month - 1 + m, 12)
    y += d.year
    mo += 1
    import calendar
    day = min(d.day, calendar.monthrange(y, mo)[1])
    return dt.date(y, mo, day)


def inciso_clave(inc):
    s = txt(inc).upper()
    if s in ('', '0', 'N/A', 'NA'):
        return ''
    primero = re.split(r'\s*[/|]\s*', s)[0]
    return clave(primero) or clave(s)


def gracia(cia):
    return GRACIA.get(cia.strip().upper(), 30)


def fechas_recibo(r):
    """(emision, limite) con respaldo por días de gracia de la compañía."""
    e, l = r['emision'], r['limite']
    g = gracia(r['cia'])
    if e and not l:
        l = e + dt.timedelta(days=g)
    if l and not e:
        e = l - dt.timedelta(days=g)
    if e and l and l < e:
        l = e + dt.timedelta(days=g)
    return e, l


def construir(recs):
    por_poliza = collections.defaultdict(list)
    for r in recs:
        if not r['poliza']:
            continue
        r['pkey'] = clave(r['poliza'])
        r['ikey'] = inciso_clave(r['inciso'])
        r['emision'], r['limite'] = fechas_recibo(r)
        por_poliza[r['pkey']].append(r)

    unidades = {}
    for pkey, rs in por_poliza.items():
        ramos = collections.Counter(ramo_db(r['ramo']) for r in rs if ramo_db(r['ramo']))
        ramo = ramos.most_common(1)[0][0] if ramos else None
        incisos = {r['ikey'] for r in rs if r['ikey']}
        dividir = False
        if ramo == 'flotilla' and len(incisos) > 1:
            dividir = True
        elif len(incisos) > 1:
            # Se divide sólo si dos incisos distintos traen el mismo recibo (cobros separados).
            firmas = collections.defaultdict(set)
            for r in rs:
                if r['ikey'] and r['recibo'] and r['limite']:
                    firmas[(r['recibo'], r['limite'].year, r['limite'].month)].add(r['ikey'])
            dividir = any(len(v) > 1 for v in firmas.values())
        if dividir:
            # los renglones sin inciso se quedan con el inciso más frecuente
            comun = collections.Counter(r['ikey'] for r in rs if r['ikey']).most_common(1)[0][0]
            for r in rs:
                ik = r['ikey'] or comun
                unidades.setdefault((pkey, ik), []).append(r)
        else:
            unidades[(pkey, '')] = rs
    return unidades


def vigencia_inicio(r, total, n):
    meses = 12 // total
    return add_months(r['emision'], -meses * (n - 1))


def vigencias(rs):
    """Agrupa los renglones de una unidad por vigencia anual. Devuelve lista de dicts."""
    con_fecha = [r for r in rs if r['emision']]
    sin_fecha = [r for r in rs if not r['emision']]
    for r in con_fecha:
        n, t = r['recibo'] or (None, None)
        r['_vi'] = vigencia_inicio(r, t, n) if n else None
    # total de recibos más común de la unidad, para inferir n donde falta
    tot = collections.Counter(r['recibo'][1] for r in con_fecha if r['recibo'])
    total_comun = tot.most_common(1)[0][0] if tot else 1
    # vigencia de referencia: la de los renglones con recibo
    ref = sorted(r['_vi'] for r in con_fecha if r['_vi'])
    for r in con_fecha:
        if r['_vi']:
            continue
        meses = 12 // total_comun
        cand = [v for v in ref if v <= r['emision'] < add_months(v, 12)]
        if cand:
            v = cand[-1]
            k = 0
            while add_months(v, meses * (k + 1)) <= r['emision'] and k < total_comun - 1:
                k += 1
            r['recibo'] = (k + 1, total_comun)
            r['_vi'] = v
            r['_inferido'] = True
        else:
            r['recibo'] = (1, 1) if total_comun == 1 else (1, total_comun)
            r['_vi'] = r['emision']
            r['_inferido'] = True
    grupos = []
    for r in sorted(con_fecha, key=lambda x: x['_vi']):
        if grupos and (r['_vi'] - grupos[-1]['inicio']).days < 200:
            grupos[-1]['rs'].append(r)
        else:
            grupos.append({'inicio': r['_vi'], 'rs': [r]})
    for g in grupos:
        # la fecha de inicio más común del grupo
        g['inicio'] = collections.Counter(r['_vi'] for r in g['rs']).most_common(1)[0][0]
    return grupos, sin_fecha
