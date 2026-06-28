import { prisma } from '@/lib/prisma'

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default async function AdminDashboardPage() {
  const [totalEmpresas, totalUsuarios, totalFacturas, totalCotizaciones, facturasTimbradas] =
    await Promise.all([
      prisma.empresa.count(),
      prisma.usuario.count({ where: { rol: { not: 'SUPERADMIN' } } }),
      prisma.factura.count(),
      prisma.cotizacion.count(),
      prisma.factura.aggregate({
        where: { estatus: 'TIMBRADA' },
        _sum: { total: true },
        _count: true,
      }),
    ])

  const topEmpresas = await prisma.empresa.findMany({
    include: {
      _count: { select: { facturas: true, cotizaciones: true } },
      facturas: { where: { estatus: 'TIMBRADA' }, select: { total: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const totalFacturado = Number(facturasTimbradas._sum.total ?? 0)

  function fmt(n: number) {
    return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Métricas globales</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Empresas registradas" value={totalEmpresas} />
        <StatCard label="Usuarios activos" value={totalUsuarios} sub="sin contar superadmin" />
        <StatCard label="Facturas timbradas" value={facturasTimbradas._count} sub={`de ${totalFacturas} totales`} />
        <StatCard label="Total facturado" value={fmt(totalFacturado)} sub="CFDIs timbrados" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Empresas</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {['Empresa', 'RFC', 'Cotizaciones', 'Facturas', 'Facturado', 'Acciones'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {topEmpresas.map((e) => {
              const facturado = e.facturas.reduce((s, f) => s + Number(f.total), 0)
              return (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: e.colorPrimario ?? '#6366f1' }} />
                      <span className="text-sm font-medium text-gray-900">{e.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{e.rfc}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{e._count.cotizaciones}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{e._count.facturas}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{fmt(facturado)}</td>
                  <td className="px-4 py-3">
                    <a href={`/admin/empresas`} className="text-violet-600 hover:underline text-sm">
                      Gestionar →
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        Total cotizaciones en el sistema: {totalCotizaciones}
      </p>
    </div>
  )
}
