# Importación de COBRANZA_2026.xlsx

Pasa las 8 hojas del Excel (PENDIENTES, 5 DIAS, PAGADAS, PAGG HDI MAY, PAGG AXA MAY,
CANCELADAS X FALTA DE PAGO, NO SE VAN A PAGAR, CASTORES) a clientes, pólizas y recibos.

## Cómo correrlo
1. Antes: la base vacía (`supabase-limpieza-inicio.sql` ya corrido).
2. Supabase → SQL Editor: abre `supabase-importar-cobranza-2026-parte-1.sql`, copia todo, ejecuta.
   Repite con las partes 2 a 7, en orden. La parte 7 termina con una tabla de comprobación:
   clientes 1596 · pólizas 4614 · recibos 6049 (545 pendientes o vencidos, 8 por validar,
   4849 pagados, 647 cancelados).
3. Publica el cambio de `contexts/supabase-context.tsx` (sin él la app sólo ve 1000 pólizas y 1000 recibos).

Cada parte va en una transacción y usa identificadores fijos: si una falla, no se guarda nada
de esa parte y se puede volver a correr sin duplicar.

## Cómo quedaron los datos
- PENDIENTES → recibos pendientes (o vencidos si ya pasó el último día de pago). Si el comentario
  dice que ya se pagó ("PAGADA EL 26 OCT"…), queda **por validar** (morado) para que se valide.
- PAGADAS, PAGG HDI MAY, PAGG AXA MAY y CASTORES → recibos pagados. La fecha de pago se toma del
  comentario cuando empieza con día y mes ("16ENE APLICADA").
- CANCELADAS X FALTA DE PAGO → recibo cancelado y póliza "Cancelada (falta de pago)".
- NO SE VAN A PAGAR → recibo cancelado; la póliza queda cancelada si ya no tiene nada pendiente.
- 5 DIAS → su comentario se agrega a la póliza y "CLIENTE DE" queda como agente.
- Flotillas: cada inciso es su propia póliza (`5343 INC 170`), porque cada inciso tiene su propio
  pagador y recibo. También queda dado de alta como unidad de la flotilla.
- Si una póliza aparece con dos vigencias (2025 y 2026), la anterior queda como `… (VIG 2025)`
  con estatus "renovada" y ligada a la actual.
- Vigencia, forma de pago y número de recibo se calculan con las fechas y el "# RECIBO" del Excel.
- Importe: el del Excel; si falta, el de otro recibo de la misma póliza; si no hay ninguno, $0 con
  la nota "Importe pendiente de capturar". Teléfono de clientes: "Pendiente".
- Cada recibo dice en sus notas de qué hoja y renglón del Excel salió.

`cobranza-2026-no-importado.csv`: 157 renglones que no se pudieron pasar (sin ninguna fecha, o del
seguimiento de 5 DIAS sin póliza que coincida). Hay que darlos de alta a mano.

`generador/`: el programa que produjo los SQL (`python3 build.py COBRANZA_2026.xlsx salida`).

## Actualización v2 (2026-11-02): importes recuperados
El generador ahora también lee importes que antes se perdían: los de CANCELADAS X FALTA DE PAGO y
NO SE VAN A PAGAR (en COMENTARIOS o DAGON), los que traen "MXN"/"USD" en el texto (los de USD quedan
en dólares), los de CASTORES al final del comentario y los que Google Sheets convirtió en "fecha"
(3838.12 → año 3838 mes 12). Ya se aplicó a la base con `supabase-actualizar-importes-v2.sql`
(sólo tocó recibos/pólizas que nadie había editado). Las partes 1-7 ya son la versión v2;
las anteriores están en `_respaldo_sql_v1/`.
