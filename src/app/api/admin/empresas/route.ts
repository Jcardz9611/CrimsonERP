import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getSession()
  if (!session || session.rol !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const empresas = await prisma.empresa.findMany({
    include: {
      _count: {
        select: { usuarios: true, clientes: true, cotizaciones: true, facturas: true },
      },
      facturas: {
        select: { total: true, estatus: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const result = empresas.map((e) => {
    const facturado = e.facturas
      .filter((f) => f.estatus === 'TIMBRADA')
      .reduce((sum, f) => sum + Number(f.total), 0)
    return {
      id: e.id,
      nombre: e.nombre,
      rfc: e.rfc,
      razonSocial: e.razonSocial,
      ciudad: e.ciudad,
      estado: e.estado,
      colorPrimario: e.colorPrimario,
      createdAt: e.createdAt,
      _count: e._count,
      facturadoTotal: facturado,
    }
  })

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.rol !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const {
    nombre, rfc, razonSocial, regimenFiscal, codigoPostal,
    calle, colonia, ciudad, estado,
    adminNombre, adminEmail, adminPassword,
  } = body

  if (!nombre || !rfc || !razonSocial || !regimenFiscal || !codigoPostal || !adminEmail || !adminPassword) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const exists = await prisma.empresa.findUnique({ where: { rfc } })
  if (exists) return NextResponse.json({ error: 'RFC ya registrado' }, { status: 409 })

  const emailExists = await prisma.usuario.findUnique({ where: { email: adminEmail } })
  if (emailExists) return NextResponse.json({ error: 'Email ya registrado' }, { status: 409 })

  const hash = await bcrypt.hash(adminPassword, 10)

  const empresa = await prisma.empresa.create({
    data: {
      nombre, rfc, razonSocial, regimenFiscal, codigoPostal,
      calle, colonia, ciudad, estado,
      usuarios: {
        create: {
          nombre: adminNombre || nombre,
          email: adminEmail,
          password: hash,
          rol: 'ADMIN',
        },
      },
    },
    include: { usuarios: { select: { id: true, email: true } } },
  })

  return NextResponse.json(empresa, { status: 201 })
}
