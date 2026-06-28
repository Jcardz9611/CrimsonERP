import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireEmpresaSession } from '@/lib/auth'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/productos/[id]'>) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await ctx.params

  const producto = await prisma.producto.findFirst({
    where: { id, empresaId: session.empresaId },
  })

  if (!producto) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json(producto)
}

export async function PUT(request: NextRequest, ctx: RouteContext<'/api/productos/[id]'>) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const body = await request.json()

  const result = await prisma.producto.updateMany({
    where: { id, empresaId: session.empresaId },
    data: {
      nombre: body.nombre,
      descripcion: body.descripcion,
      precio: body.precio,
      tasaIva: body.tasaIva,
      claveSAT: body.claveSAT,
      claveUnidad: body.claveUnidad,
      unidad: body.unidad,
    },
  })

  if (result.count === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/productos/[id]'>) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await ctx.params

  await prisma.producto.updateMany({
    where: { id, empresaId: session.empresaId },
    data: { activo: false },
  })

  return NextResponse.json({ ok: true })
}
