import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireEmpresaSession } from '@/lib/auth'
import { getDocumento } from '@/lib/facturama'

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/facturas/[id]/documento'>
) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const formato = request.nextUrl.searchParams.get('formato') as 'pdf' | 'xml' | null
  if (formato !== 'pdf' && formato !== 'xml') {
    return NextResponse.json({ error: 'formato debe ser pdf o xml' }, { status: 400 })
  }

  const factura = await prisma.factura.findFirst({
    where: { id, empresaId: session.empresaId ?? undefined },
    include: {
      cliente: true,
      empresa: true,
      items: { include: { producto: true } },
    },
  })

  if (!factura) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (factura.estatus !== 'TIMBRADA') {
    return NextResponse.json({ error: 'Factura no timbrada' }, { status: 400 })
  }

  // ── Modo real: obtener de Facturama ────────────────────────────────────────
  if (process.env.TIMBRADO_MOCK !== 'true' && factura.uuid) {
    try {
      const doc = await getDocumento(factura.uuid, formato)
      const buffer = Buffer.from(doc.Content, 'base64')
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': formato === 'pdf' ? 'application/pdf' : 'application/xml',
          'Content-Disposition': `attachment; filename="factura-${factura.folio}.${formato}"`,
        },
      })
    } catch {
      return NextResponse.json({ error: 'No se pudo obtener el documento de Facturama' }, { status: 502 })
    }
  }

  // ── Modo mock: generar documento localmente ────────────────────────────────
  if (formato === 'xml') {
    const xml = generarXMLMock(factura)
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="factura-${factura.folio}.xml"`,
      },
    })
  }

  // PDF como HTML imprimible
  const html = generarHTMLFactura(factura)
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type FacturaConRelaciones = Awaited<ReturnType<typeof prisma.factura.findFirst>> & {
  cliente: { nombre: string; rfc: string; razonSocial: string; regimenFiscal?: string | null; codigoPostal?: string | null; usoCFDI?: string | null }
  empresa: { nombre: string; rfc: string; razonSocial: string; regimenFiscal: string; codigoPostal: string; calle?: string | null; colonia?: string | null; ciudad?: string | null; estado?: string | null }
  items: Array<{ descripcion: string; cantidad: unknown; precioUnitario: unknown; subtotal: unknown; iva: unknown; total: unknown; claveUnidad?: string | null; claveSAT?: string | null }>
}

function n(v: unknown) { return Number(v) }
function fmt(v: unknown) { return n(v).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) }

// ─── Generador XML CFDI 4.0 (mock) ───────────────────────────────────────────

function generarXMLMock(factura: NonNullable<FacturaConRelaciones>) {
  const now = new Date().toISOString().replace(/\.\d+Z$/, '')
  const items = factura.items.map((item, idx) => `
    <cfdi:Concepto ClaveProdServ="${item.claveSAT ?? '01010101'}" NoIdentificacion="${idx + 1}"
      ClaveUnidad="${item.claveUnidad ?? 'H87'}" Descripcion="${escXml(item.descripcion)}"
      ValorUnitario="${n(item.precioUnitario).toFixed(6)}" Cantidad="${n(item.cantidad).toFixed(6)}"
      Importe="${n(item.subtotal).toFixed(6)}" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${n(item.subtotal).toFixed(6)}" Impuesto="002" TipoFactor="Tasa"
            TasaOCuota="0.160000" Importe="${n(item.iva).toFixed(6)}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd"
  Version="4.0"
  Serie="${factura.serie ?? 'A'}"
  Folio="${factura.folio}"
  Fecha="${now}"
  Sello="SIMULADO_MOCK_NO_VALIDO_FISCALMENTE"
  FormaPago="${factura.formaPago ?? '99'}"
  NoCertificado="00000000000000000000"
  Certificado="MOCK"
  SubTotal="${n(factura.subtotal).toFixed(6)}"
  Moneda="${factura.moneda ?? 'MXN'}"
  Total="${n(factura.total).toFixed(6)}"
  TipoDeComprobante="I"
  MetodoPago="${factura.metodoPago ?? 'PPD'}"
  LugarExpedicion="${factura.empresa.codigoPostal}"
  Exportacion="01">
  <cfdi:Emisor Rfc="${factura.empresa.rfc}" Nombre="${escXml(factura.empresa.razonSocial)}" RegimenFiscal="${factura.empresa.regimenFiscal}"/>
  <cfdi:Receptor Rfc="${factura.cliente.rfc}" Nombre="${escXml(factura.cliente.razonSocial)}"
    DomicilioFiscalReceptor="${factura.cliente.codigoPostal ?? '00000'}"
    RegimenFiscalReceptor="${factura.cliente.regimenFiscal ?? '616'}"
    UsoCFDI="${factura.usoCFDI ?? 'G01'}"/>
  <cfdi:Conceptos>${items}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${n(factura.iva).toFixed(6)}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${n(factura.subtotal).toFixed(6)}" Impuesto="002" TipoFactor="Tasa"
        TasaOCuota="0.160000" Importe="${n(factura.iva).toFixed(6)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
      Version="1.1"
      UUID="${factura.uuid}"
      FechaTimbrado="${now}"
      RfcProvCertif="SAT970701NN3"
      SelloCFD="MOCK_NO_VALIDO"
      NoCertificadoSAT="00000000000000000000"
      SelloSAT="MOCK_NO_VALIDO"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`
}

function escXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ─── Generador HTML/PDF (mock) ────────────────────────────────────────────────

function generarHTMLFactura(factura: NonNullable<FacturaConRelaciones>) {
  const filas = factura.items.map((item) => `
    <tr>
      <td>${escXml(item.descripcion)}</td>
      <td style="text-align:center">${item.claveUnidad ?? 'H87'}</td>
      <td style="text-align:right">${n(item.cantidad).toLocaleString('es-MX')}</td>
      <td style="text-align:right">${fmt(item.precioUnitario)}</td>
      <td style="text-align:right">${fmt(item.subtotal)}</td>
      <td style="text-align:right">${fmt(item.iva)}</td>
      <td style="text-align:right"><strong>${fmt(item.total)}</strong></td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Factura ${factura.serie ?? 'A'}${factura.folio}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #222; padding: 24px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .emisor h1 { font-size: 16px; font-weight: bold; }
  .emisor p { color: #555; }
  .folio { text-align: right; }
  .folio .num { font-size: 28px; font-weight: bold; color: #1e40af; }
  .folio .badge { display: inline-block; background: #dcfce7; color: #166534; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: bold; margin-top: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; }
  .box h3 { font-size: 9px; text-transform: uppercase; color: #6b7280; letter-spacing: .05em; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  thead th { background: #1e40af; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
  tbody tr:nth-child(even) { background: #f9fafb; }
  tbody td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }
  .totales { display: flex; justify-content: flex-end; }
  .totales table { width: 240px; }
  .totales td { padding: 3px 8px; }
  .totales .grand { font-size: 14px; font-weight: bold; color: #1e40af; }
  .uuid { margin-top: 20px; padding: 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; font-family: monospace; font-size: 10px; color: #374151; }
  .mock-warn { margin-top: 8px; padding: 6px 10px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; font-size: 10px; color: #92400e; }
  @media print { body { padding: 0; } .mock-warn { display: none; } }
</style>
</head>
<body>
<div class="header">
  <div class="emisor">
    <h1>${escXml(factura.empresa.nombre)}</h1>
    <p>${escXml(factura.empresa.razonSocial)}</p>
    <p>RFC: ${factura.empresa.rfc}</p>
    <p>Régimen: ${factura.empresa.regimenFiscal} · CP ${factura.empresa.codigoPostal}</p>
    ${factura.empresa.ciudad ? `<p>${escXml(factura.empresa.ciudad ?? '')}, ${escXml(factura.empresa.estado ?? '')}</p>` : ''}
  </div>
  <div class="folio">
    <div class="num">${factura.serie ?? 'A'}${factura.folio}</div>
    <div>CFDI de Ingreso</div>
    <div class="badge">TIMBRADA</div>
    <div style="margin-top:8px;color:#555">${new Date(factura.createdAt).toLocaleDateString('es-MX')}</div>
  </div>
</div>

<div class="grid">
  <div class="box">
    <h3>Receptor</h3>
    <p><strong>${escXml(factura.cliente.razonSocial)}</strong></p>
    <p>RFC: ${factura.cliente.rfc}</p>
    <p>Uso CFDI: ${factura.usoCFDI ?? 'G01'}</p>
    ${factura.cliente.codigoPostal ? `<p>CP: ${factura.cliente.codigoPostal}</p>` : ''}
  </div>
  <div class="box">
    <h3>Datos de pago</h3>
    <p>Forma de pago: ${factura.formaPago ?? '99'}</p>
    <p>Método de pago: ${factura.metodoPago ?? 'PPD'}</p>
    <p>Moneda: ${factura.moneda ?? 'MXN'}</p>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Descripción</th>
      <th style="text-align:center">Unidad</th>
      <th style="text-align:right">Cantidad</th>
      <th style="text-align:right">Precio unit.</th>
      <th style="text-align:right">Subtotal</th>
      <th style="text-align:right">IVA</th>
      <th style="text-align:right">Total</th>
    </tr>
  </thead>
  <tbody>${filas}</tbody>
</table>

<div class="totales">
  <table>
    <tr><td>Subtotal:</td><td style="text-align:right">${fmt(factura.subtotal)}</td></tr>
    <tr><td>IVA (16%):</td><td style="text-align:right">${fmt(factura.iva)}</td></tr>
    <tr class="grand"><td><strong>Total:</strong></td><td style="text-align:right"><strong>${fmt(factura.total)}</strong></td></tr>
  </table>
</div>

<div class="uuid">UUID: ${factura.uuid}</div>
<div class="mock-warn">⚠️ Documento generado en modo sandbox — no tiene validez fiscal ante el SAT</div>

<script>window.onload = () => window.print()</script>
</body>
</html>`
}
