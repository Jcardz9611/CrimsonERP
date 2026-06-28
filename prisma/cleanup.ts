import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Eliminar empresa incorrecta creada por error
  const nueva = await prisma.empresa.findUnique({ where: { rfc: 'MACR030808KH2' } })
  if (nueva) {
    await prisma.cliente.deleteMany({ where: { empresaId: nueva.id } })
    await prisma.producto.deleteMany({ where: { empresaId: nueva.id } })
    await prisma.usuario.deleteMany({ where: { empresaId: nueva.id } })
    await prisma.empresa.delete({ where: { id: nueva.id } })
    console.log('✅ Empresa MACR030808KH2 eliminada')
  } else {
    console.log('ℹ️  Empresa MACR030808KH2 no existe')
  }

  // Limpiar clientes y productos de la empresa original para re-seedear
  const vieja = await prisma.empresa.findUnique({ where: { rfc: 'XAXX010101000' } })
  if (vieja) {
    const c = await prisma.cliente.deleteMany({ where: { empresaId: vieja.id } })
    const p = await prisma.producto.deleteMany({ where: { empresaId: vieja.id } })
    console.log(`✅ Limpiados ${c.count} clientes y ${p.count} productos de XAXX010101000`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
