import { NextResponse } from 'next/server'

export const revalidate = 60 * 60

export async function GET() {
  try {
    const response = await fetch('https://dof.gob.mx/indicadores.php', {
      next: { revalidate },
    })
    if (!response.ok) throw new Error(`DOF respondió ${response.status}`)

    const html = await response.text()
    const indicador = html.match(/>UDIS<\/span>\s*<br\s*\/?\s*>\s*([\d.]+)/i)
    const fecha = html.match(/Tipo de Cambio y Tasas al\s+(\d{2}\/\d{2}\/\d{4})/i)
    const valor = Number(indicador?.[1])
    if (!Number.isFinite(valor) || valor <= 0) throw new Error('No se encontró un valor UDI válido')

    return NextResponse.json({ valor, fecha: fecha?.[1] || null, fuente: 'DOF / Banco de México' }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch (error) {
    return NextResponse.json({ error: 'No fue posible consultar el valor UDI de Banco de México' }, { status: 502 })
  }
}
