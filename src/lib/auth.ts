import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET no está definido. Configúralo en las variables de entorno.')
}
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

export interface SessionPayload {
  userId: string
  empresaId: string | null
  empresa: string | null
  email: string
  rol: 'SUPERADMIN' | 'ADMIN' | 'USUARIO'
  impersonatedBy?: string // superadmin userId when accessing a company workspace
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('erp_session')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) throw new Error('No autorizado')
  return session
}

export async function requireEmpresaSession(): Promise<(SessionPayload & { empresaId: string }) | null> {
  const session = await getSession()
  if (!session || !session.empresaId) return null
  return session as SessionPayload & { empresaId: string }
}
