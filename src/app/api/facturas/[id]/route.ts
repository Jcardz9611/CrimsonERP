import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireEmpresaSession } from '@/lib/auth'
import { timbrarCFDI } from '@/lib/facturama'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/facturas/[id]'>) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await ctx.params

  const factura = await prisma.factura.findFirst({
    where: { id, empresaId: session.empresaId },
    include: {
      cliente: true,
      items: { include: { producto: true } },
      empresa: true,
    },
  })

  if (!factura) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json(factura)
}

export async function POST(request: NextRequest, ctx: RouteContext<'/api/facturas/[id]'>) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const { action } = await request.json()

  if (action !== 'timbrar') {
    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  }

  const factura = await prisma.factura.findFirst({
    where: { id, empresaId: session.empresaId },
    include: { cliente: true, items: { include: { producto: true } }, empresa: true },
  })

  if (!factura) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (factura.estatus === 'TIMBRADA') return NextResponse.json({ error: 'Ya fue timbrada' }, { status: 400 })

  const payload = {
    Serie: factura.serie ?? 'A',
    Folio: factura.folio,
    Currency: factura.moneda ?? 'MXN',
    ExpeditionPlace: factura.empresa.codigoPostal,
    CfdiType: 'I',
    PaymentForm: factura.formaPago ?? '99',
    PaymentMethod: factura.metodoPago ?? 'PPD',
    Receiver: {
      Rfc: factura.cliente.rfc,
      Name: factura.cliente.razonSocial,
      CfdiUse: factura.usoCFDI ?? 'G01',
      FiscalRegime: factura.cliente.regimenFiscal ?? '616',
      TaxZipCode: factura.cliente.codigoPostal ?? '00000',
    },
    Items: factura.items.map((item: typeof factura.items[number]) => ({
      ProductCode: item.claveSAT ?? item.producto.claveSAT ?? '01010101',
      Description: item.descripcion,
      Unit: item.unidad ?? item.producto.unidad ?? 'Pieza',
      UnitCode: item.claveUnidad ?? item.producto.claveUnidad ?? 'H87',
      UnitPrice: Number(item.precioUnitario),
      Quantity: Number(item.cantidad),
      Subtotal: Number(item.subtotal),
      Taxes: Number(item.iva) > 0
        ? [{ Total: Number(item.iva), Name: 'IVA', Base: Number(item.subtotal), Rate: 0.16, IsRetention: false }]
        : [],
      Total: Number(item.total),
    })),
  }

  // Modo simulado: genera UUID falso sin llamar al PAC
  if (process.env.TIMBRADO_MOCK === 'true') {
    const uuid = crypto.randomUUID()
    await prisma.factura.update({
      where: { id },
      data: { estatus: 'TIMBRADA', uuid },
    })
    return NextResponse.json({ ok: true, uuid })
  }

  try {
    const resultado = await timbrarCFDI(payload)

    await prisma.factura.update({
      where: { id },
      data: { estatus: 'TIMBRADA', uuid: resultado.Id },
    })

    return NextResponse.json({ ok: true, uuid: resultado.Id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al timbrar'
    console.error('[timbrar]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
