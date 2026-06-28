import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireEmpresaSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''

  const cotizaciones = await prisma.cotizacion.findMany({
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

  return NextResponse.json(cotizaciones)
}

export async function POST(request: NextRequest) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { clienteId, notas, validezDias, items } = body

  if (!clienteId || !items?.length) {
    return NextResponse.json({ error: 'Cliente e items son requeridos' }, { status: 400 })
  }

  const count = await prisma.cotizacion.count({ where: { empresaId: session.empresaId } })
  const folio = `COT-${String(count + 1).padStart(5, '0')}`

  const subtotal = items.reduce((s: number, i: { subtotal: number }) => s + i.subtotal, 0)
  const iva = items.reduce((s: number, i: { iva: number }) => s + i.iva, 0)
  const total = subtotal + iva

  const cotizacion = await prisma.cotizacion.create({
    data: {
      folio,
      clienteId,
      empresaId: session.empresaId,
      subtotal,
      iva,
      total,
      notas,
      validezDias: validezDias ?? 30,
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
          unidad?: string
          claveUnidad?: string
        }) => ({
          productoId: item.productoId,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          descuento: item.descuento ?? 0,
          subtotal: item.subtotal,
          iva: item.iva,
          total: item.total,
          unidad: item.unidad ?? 'Pieza',
          claveUnidad: item.claveUnidad ?? 'H87',
        })),
      },
    },
    include: { items: true, cliente: true },
  })

  return NextResponse.json(cotizacion, { status: 201 })
}
