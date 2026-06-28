import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Header from '@/components/layout/Header'
import { formatCurrency } from '@/lib/utils'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) return null

  const [totalClientes, totalProductos, totalCotizaciones, totalFacturas] =
    await Promise.all([
      prisma.cliente.count({ where: { empresaId: session.empresaId, activo: true } }),
      prisma.producto.count({ where: { empresaId: session.empresaId, activo: true } }),
      prisma.cotizacion.count({ where: { empresaId: session.empresaId } }),
      prisma.factura.count({ where: { empresaId: session.empresaId, estatus: 'TIMBRADA' } }),
    ])

  const ventasMes = await prisma.factura.aggregate({
    where: {
      empresaId: session.empresaId,
      estatus: 'TIMBRADA',
      createdAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
    _sum: { total: true },
  })

  const stats = [
    { label: 'Clientes', value: totalClientes, color: 'bg-blue-500', icon: '👥' },
    { label: 'Productos', value: totalProductos, color: 'bg-emerald-500', icon: '📦' },
    { label: 'Cotizaciones', value: totalCotizaciones, color: 'bg-violet-500', icon: '📋' },
    { label: 'Facturas timbradas', value: totalFacturas, color: 'bg-amber-500', icon: '🧾' },
  ]

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{stat.icon}</span>
                <span className={`${stat.color} text-white text-xs font-medium px-2 py-1 rounded-full`}>
                  Total
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-500 mb-1">Ventas del mes</h2>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(Number(ventasMes._sum.total ?? 0))}
          </p>
        </div>
      </div>
    </>
  )
}
