import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireEmpresaSession } from '@/lib/auth'

export async function GET() {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const empresa = await prisma.empresa.findUnique({
    where: { id: session.empresaId },
    select: { colorPrimario: true, colorSecundario: true },
  })

  return NextResponse.json({
    colorPrimario: empresa?.colorPrimario ?? '#2563EB',
    colorSecundario: empresa?.colorSecundario ?? '#64748b',
  })
}

export async function PUT(request: NextRequest) {
  const session = await requireEmpresaSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { colorPrimario, colorSecundario } = await request.json()

  const empresa = await prisma.empresa.update({
    where: { id: session.empresaId },
    data: {
      ...(colorPrimario && { colorPrimario }),
      ...(colorSecundario && { colorSecundario }),
    },
    select: { colorPrimario: true, colorSecundario: true },
  })

  return NextResponse.json(empresa)
}
