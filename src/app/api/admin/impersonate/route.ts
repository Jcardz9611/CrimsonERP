import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, signToken, verifyToken } from '@/lib/auth'

// POST /api/admin/impersonate — entrar al workspace de una empresa
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.rol !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { empresaId } = await request.json()
  if (!empresaId) return NextResponse.json({ error: 'empresaId requerido' }, { status: 400 })

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } })
  if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

  // Token de impersonación: contexto de la empresa + marca del superadmin
  const impToken = await signToken({
    userId: session.userId,
    empresaId: empresa.id,
    empresa: empresa.nombre,
    email: session.email,
    rol: 'ADMIN',
    impersonatedBy: session.userId,
  })

  const originalToken = request.cookies.get('erp_session')?.value ?? ''

  const res = NextResponse.json({ ok: true })
  // Guardar sesión original para poder restaurarla
  res.cookies.set('erp_admin_session', originalToken, { httpOnly: true, path: '/', maxAge: 60 * 60 * 8 })
  res.cookies.set('erp_session', impToken, { httpOnly: true, path: '/', maxAge: 60 * 60 * 8 })
  return res
}

// DELETE /api/admin/impersonate — salir del workspace y volver a /admin
export async function DELETE(request: NextRequest) {
  const originalToken = request.cookies.get('erp_admin_session')?.value
  if (!originalToken) {
    return NextResponse.json({ error: 'No hay sesión de admin guardada' }, { status: 400 })
  }

  const adminSession = await verifyToken(originalToken)
  if (!adminSession || adminSession.rol !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Sesión admin inválida' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('erp_session', originalToken, { httpOnly: true, path: '/', maxAge: 60 * 60 * 8 })
  res.cookies.delete('erp_admin_session')
  return res
}
