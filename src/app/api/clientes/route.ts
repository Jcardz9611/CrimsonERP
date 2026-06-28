import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireEmpresaSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''

  const clientes = await prisma.cliente.findMany({
    where: {
      empresaId: session.empresaId,
      activo: true,
      ...(search && {
        OR: [
          { nombre: { contains: search, mode: 'insensitive' } },
          { rfc: { contains: search, mode: 'insensitive' } },
          { razonSocial: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(clientes)
}

export async function POST(request: NextRequest) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { nombre, rfc, razonSocial, email, telefono, calle, colonia, ciudad, estado, codigoPostal, regimenFiscal } = body

  if (!nombre || !rfc || !razonSocial) {
    return NextResponse.json({ error: 'Nombre, RFC y razón social son requeridos' }, { status: 400 })
  }

  const cliente = await prisma.cliente.create({
    data: {
      nombre,
      rfc: rfc.toUpperCase(),
      razonSocial,
      email,
      telefono,
      calle,
      colonia,
      ciudad,
      estado,
      codigoPostal,
      regimenFiscal,
      empresaId: session.empresaId,
    },
  })

  return NextResponse.json(cliente, { status: 201 })
}
