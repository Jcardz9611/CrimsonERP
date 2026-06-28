import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireEmpresaSession } from '@/lib/auth'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/cotizaciones/[id]'>) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await ctx.params

  const cotizacion = await prisma.cotizacion.findFirst({
    where: { id, empresaId: session.empresaId },
    include: {
      cliente: true,
      items: { include: { producto: true } },
    },
  })

  if (!cotizacion) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json(cotizacion)
}

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/cotizaciones/[id]'>) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const { estatus } = await request.json()

  const result = await prisma.cotizacion.updateMany({
    where: { id, empresaId: session.empresaId },
    data: { estatus },
  })

  if (result.count === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
