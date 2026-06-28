import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireEmpresaSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''

  const facturas = await prisma.factura.findMany({
    where: {
      empresaId: session.empresaId,
      ...(search && {
        OR: [
          { folio: { contains: search, mode: 'insensitive' } },
          { cliente: { nombre: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    },
    include: { cliente: { select: { nombre: true, rfc: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(facturas)
}

export async function POST(request: NextRequest) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { clienteId, cotizacionId, formaPago, metodoPago, usoCFDI, items } = body

  if (!clienteId || !items?.length) {
    return NextResponse.json({ error: 'Cliente e items son requeridos' }, { status: 400 })
  }

  const count = await prisma.factura.count({ where: { empresaId: session.empresaId } })
  const folio = String(count + 1)

  const subtotal = items.reduce((s: number, i: { subtotal: number }) => s + i.subtotal, 0)
  const iva = items.reduce((s: number, i: { iva: number }) => s + i.iva, 0)
  const total = subtotal + iva

  const factura = await prisma.factura.create({
    data: {
      folio,
      clienteId,
      empresaId: session.empresaId,
      cotizacionId: cotizacionId ?? null,
      subtotal,
      iva,
      total,
      formaPago: formaPago ?? '99',
      metodoPago: metodoPago ?? 'PPD',
      usoCFDI: usoCFDI ?? 'G01',
      items: {
        create: items.map((item: {
          productoId: string
          descripcion: string
          cantidad: number
          precioUnitario: number
          descuento: number
          subtotal: number
          iva: number
          total: number
          claveSAT?: string
          claveUnidad?: string
          unidad?: string
        }) => ({
          productoId: item.productoId,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          descuento: item.descuento ?? 0,
          subtotal: item.subtotal,
          iva: item.iva,
          total: item.total,
          claveSAT: item.claveSAT,
          claveUnidad: item.claveUnidad ?? 'H87',
          unidad: item.unidad ?? 'Pieza',
        })),
      },
    },
    include: { items: true, cliente: true },
  })

  if (cotizacionId) {
    await prisma.cotizacion.update({
      where: { id: cotizacionId },
      data: { estatus: 'FACTURADA' },
    })
  }

  return NextResponse.json(factura, { status: 201 })
}
