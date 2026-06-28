import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireEmpresaSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''

  const productos = await prisma.producto.findMany({
    where: {
      empresaId: session.empresaId,
      activo: true,
      ...(search && {
        OR: [
          { nombre: { contains: search, mode: 'insensitive' } },
          { descripcion: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(productos)
}

export async function POST(request: NextRequest) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { nombre, descripcion, precio, tasaIva, claveSAT, claveUnidad, unidad } = body

  if (!nombre || precio === undefined) {
    return NextResponse.json({ error: 'Nombre y precio son requeridos' }, { status: 400 })
  }

  const producto = await prisma.producto.create({
    data: {
      nombre,
      descripcion,
      precio,
      tasaIva: tasaIva ?? 0.16,
      claveSAT,
      claveUnidad: claveUnidad ?? 'H87',
      unidad: unidad ?? 'Pieza',
      empresaId: session.empresaId,
    },
  })

  return NextResponse.json(producto, { status: 201 })
}
