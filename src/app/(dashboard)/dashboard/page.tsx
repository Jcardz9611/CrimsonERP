import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { VentasChart, CotizChart, DonutChart } from '@/components/dashboard/DashboardCharts'
import { formatDate } from '@/lib/utils'

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

function getLast6Months() {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ date: d, label: d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }) })
  }
  return months
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const eid = session.empresaId ?? ''

  const now = new Date()
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1)
  const inicioMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [
    totalClientes, totalProductos, totalCotizaciones,
    ventasMesActual, ventasMesAnterior,
    cotizacionesPorEstatus, facturaReciente,
  ] = await Promise.all([
    prisma.cliente.count({ where: { empresaId: eid, activo: true } }),
    prisma.producto.count({ where: { empresaId: eid, activo: true } }),
    prisma.cotizacion.count({ where: { empresaId: eid } }),
    prisma.factura.aggregate({
      where: { empresaId: eid, estatus: 'TIMBRADA', createdAt: { gte: inicioMes } },
      _sum: { total: true }, _count: true,
    }),
    prisma.factura.aggregate({
      where: { empresaId: eid, estatus: 'TIMBRADA', createdAt: { gte: inicioMesAnterior, lt: inicioMes } },
      _sum: { total: true },
    }),
    prisma.cotizacion.groupBy({ by: ['estatus'], where: { empresaId: eid }, _count: true }),
    prisma.factura.findMany({
      where: { empresaId: eid },
      include: { cliente: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  // Ventas por mes (últimos 6)
  const meses = getLast6Months()
  const facturasPorMes = await Promise.all(
    meses.map(({ date }) =>
      prisma.factura.aggregate({
        where: {
          empresaId: eid, estatus: 'TIMBRADA',
          createdAt: { gte: date, lt: new Date(date.getFullYear(), date.getMonth() + 1, 1) },
        },
        _sum: { total: true },
      })
    )
  )
  const cotizacionesPorMes = await Promise.all(
    meses.map(({ date }) =>
      prisma.cotizacion.count({
        where: {
          empresaId: eid,
          createdAt: { gte: date, lt: new Date(date.getFullYear(), date.getMonth() + 1, 1) },
        },
      })
    )
  )

  const ventasData = meses.map(({ label }, i) => ({
    mes: label,
    total: Number(facturasPorMes[i]._sum.total ?? 0),
  }))
  const cotizData = meses.map(({ label }, i) => ({
    mes: label,
    total: cotizacionesPorMes[i],
  }))

  // Top 5 clientes
  const topClientes = await prisma.factura.groupBy({
    by: ['clienteId'],
    where: { empresaId: eid, estatus: 'TIMBRADA' },
    _sum: { total: true },
    _count: true,
    orderBy: { _sum: { total: 'desc' } },
    take: 5,
  })
  const clienteIds = topClientes.map(t => t.clienteId)
  const clientesInfo = await prisma.cliente.findMany({ where: { id: { in: clienteIds } }, select: { id: true, nombre: true } })
  const clienteMap = Object.fromEntries(clientesInfo.map(c => [c.id, c.nombre]))

  const ventasMesN = Number(ventasMesActual._sum.total ?? 0)
  const ventasMesAntN = Number(ventasMesAnterior._sum.total ?? 0)
  const tendencia = ventasMesAntN > 0 ? ((ventasMesN - ventasMesAntN) / ventasMesAntN) * 100 : null

  const estatusData = [
    { name: 'Pendiente', value: 0, color: '#f59e0b' },
    { name: 'Aprobada', value: 0, color: '#10b981' },
    { name: 'Rechazada', value: 0, color: '#ef4444' },
    { name: 'Facturada', value: 0, color: '#6366f1' },
  ]
  cotizacionesPorEstatus.forEach(e => {
    const map: Record<string, number> = { PENDIENTE: 0, APROBADA: 1, RECHAZADA: 2, FACTURADA: 3 }
    const idx = map[e.estatus]
    if (idx !== undefined) estatusData[idx].value = e._count
  })

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-5">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Clientes activos"
            value={totalClientes}
            icon={<IconUsuarios />}
            color="blue"
          />
          <KpiCard
            label="Productos"
            value={totalProductos}
            icon={<IconProductos />}
            color="emerald"
          />
          <KpiCard
            label="Cotizaciones"
            value={totalCotizaciones}
            icon={<IconCotizacion />}
            color="violet"
          />
          <KpiCard
            label="Facturas timbradas"
            value={ventasMesActual._count}
            icon={<IconFactura />}
            color="amber"
            sub="este mes"
          />
        </div>

        {/* Ventas del mes — card grande */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-sm font-medium text-gray-500">Ventas del mes</p>
              <p className="text-4xl font-bold text-gray-900 mt-1">{fmt(ventasMesN)}</p>
            </div>
            {tendencia !== null && (
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${
                tendencia >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
              }`}>
                {tendencia >= 0 ? '↑' : '↓'} {Math.abs(tendencia).toFixed(1)}%
                <span className="font-normal text-xs ml-0.5">vs mes anterior</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-5">{fmt(ventasMesAntN)} el mes anterior</p>
          <VentasChart data={ventasData} />
        </div>

        {/* Fila: Cotizaciones por mes + Donut estatus */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-4">Cotizaciones por mes</p>
            <CotizChart data={cotizData} />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-4">Estatus de cotizaciones</p>
            {totalCotizaciones > 0
              ? <DonutChart data={estatusData.filter(d => d.value > 0)} />
              : <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">Sin cotizaciones aún</div>
            }
          </div>
        </div>

        {/* Fila: Top clientes + Facturas recientes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Top clientes por facturación</p>
            </div>
            {topClientes.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-400">Sin facturas timbradas</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {topClientes.map((t, i) => (
                  <li key={t.clienteId} className="flex items-center gap-3 px-6 py-3">
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                      {clienteMap[t.clienteId] ?? 'Desconocido'}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">
                      {fmt(Number(t._sum.total ?? 0))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Facturas recientes</p>
            </div>
            {facturaReciente.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-400">Sin facturas aún</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {facturaReciente.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{f.cliente.nombre}</p>
                      <p className="text-xs text-gray-400">{f.serie}{f.folio} · {formatDate(f.createdAt.toISOString())}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{fmt(Number(f.total))}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        f.estatus === 'TIMBRADA' ? 'bg-emerald-50 text-emerald-700' :
                        f.estatus === 'CANCELADA' ? 'bg-red-50 text-red-600' :
                        'bg-yellow-50 text-yellow-700'
                      }`}>{f.estatus}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const colorMap = {
  blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600',    bar: 'bg-blue-500' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', bar: 'bg-emerald-500' },
  violet:  { bg: 'bg-violet-50',  icon: 'text-violet-600',  bar: 'bg-violet-500' },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   bar: 'bg-amber-500' },
}

function KpiCard({ label, value, icon, color, sub }: {
  label: string; value: number; icon: React.ReactNode
  color: keyof typeof colorMap; sub?: string
}) {
  const c = colorMap[color]
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${c.bar} rounded-l-2xl`} />
      <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.icon} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-3xl font-bold text-gray-900 tabular-nums">{value.toLocaleString('es-MX')}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconUsuarios() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
}
function IconProductos() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
}
function IconCotizacion() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
}
function IconFactura() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
}
