import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireEmpresaSession } from '@/lib/auth'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/clientes/[id]'>) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await ctx.params

  const cliente = await prisma.cliente.findFirst({
    where: { id, empresaId: session.empresaId },
  })

  if (!cliente) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json(cliente)
}

export async function PUT(request: NextRequest, ctx: RouteContext<'/api/clientes/[id]'>) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const body = await request.json()

  const cliente = await prisma.cliente.updateMany({
    where: { id, empresaId: session.empresaId },
    data: {
      nombre: body.nombre,
      rfc: body.rfc?.toUpperCase(),
      razonSocial: body.razonSocial,
      email: body.email,
      telefono: body.telefono,
      calle: body.calle,
      colonia: body.colonia,
      ciudad: body.ciudad,
      estado: body.estado,
      codigoPostal: body.codigoPostal,
      regimenFiscal: body.regimenFiscal,
    },
  })

  if (cliente.count === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/clientes/[id]'>) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await ctx.params

  await prisma.cliente.updateMany({
    where: { id, empresaId: session.empresaId },
    data: { activo: false },
  })

  return NextResponse.json({ ok: true })
}
