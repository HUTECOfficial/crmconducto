import { NextResponse, type NextRequest } from 'next/server'
import { addDaysDateOnly, compareDateOnly, todayDateOnly } from '@/lib/date-only'

import { FUENTE_UDI as FUENTE, valorPortadaDof, valorPorFecha, valoresPorRango } from '@/lib/udi-dof'

function respuesta(valor: number, fecha: string, maxAge: number) {
  return NextResponse.json({ valor, fecha, fuente: FUENTE }, {
    headers: { 'Cache-Control': maxAge > 0 ? `public, s-maxage=${maxAge}` : 'no-store' },
  })
}

export async function GET(request: NextRequest) {
  const desde = request.nextUrl.searchParams.get('desde')
  const hasta = request.nextUrl.searchParams.get('hasta')
  if (desde !== null || hasta !== null) {
    if (!desde || !hasta || !/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta) || compareDateOnly(desde, hasta) > 0) {
      return NextResponse.json({ error: 'Indica desde y hasta con formato AAAA-MM-DD' }, { status: 400 })
    }
    try {
      const valores = await valoresPorRango(desde, hasta)
      if (!Object.keys(valores).length) {
        return NextResponse.json({ error: 'Banco de México no tiene valores UDI publicados en ese rango' }, { status: 404 })
      }
      // Se publican valores nuevos cada quincena: una hora de caché basta.
      return NextResponse.json({ valores, fuente: FUENTE }, { headers: { 'Cache-Control': 'public, s-maxage=3600' } })
    } catch {
      return NextResponse.json({ error: 'No fue posible consultar el valor UDI de Banco de México' }, { status: 502 })
    }
  }

  const solicitada = request.nextUrl.searchParams.get('fecha')
  if (solicitada !== null && !/^\d{4}-\d{2}-\d{2}$/.test(solicitada)) {
    return NextResponse.json({ error: 'La fecha debe tener formato AAAA-MM-DD' }, { status: 400 })
  }
  const hoy = todayDateOnly()
  const fecha = solicitada || hoy

  try {
    const valor = await valorPorFecha(fecha) ?? (fecha === hoy ? await valorPortadaDof(hoy) : null)
    if (!valor) {
      return NextResponse.json({ error: `Banco de México aún no publica el valor UDI del ${fecha}` }, { status: 404 })
    }
    const reciente = compareDateOnly(fecha, addDaysDateOnly(hoy, -2)) >= 0
    return respuesta(valor, fecha, reciente ? 0 : 60 * 60 * 24)
  } catch {
    return NextResponse.json({ error: 'No fue posible consultar el valor UDI de Banco de México' }, { status: 502 })
  }
}
