'use client'

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import type { PieLabelRenderProps } from 'recharts'

// ─── Área: ventas por mes ─────────────────────────────────────────────────────

interface VentasMes { mes: string; total: number }

const customTooltipStyle = {
  backgroundColor: '#1e293b',
  border: 'none',
  borderRadius: '8px',
  color: '#f1f5f9',
  fontSize: '13px',
  padding: '8px 12px',
}

function fmtMXN(v: unknown) {
  return Number(v ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

export function VentasAreaChart({ data }: { data: VentasMes[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={customTooltipStyle}
          formatter={(v) => [fmtMXN(v), 'Ventas']}
        />
        <Area type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2.5} fill="url(#gradVentas)" dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Barras: cotizaciones por mes ─────────────────────────────────────────────

export function CotizacionesBarChart({ data }: { data: VentasMes[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={20}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={customTooltipStyle} formatter={(v) => [Number(v ?? 0), 'Cotizaciones']} />
        <Bar dataKey="total" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Donut: estatus de cotizaciones ──────────────────────────────────────────

interface EstatusData { name: string; value: number; color: string }

const RADIAN = Math.PI / 180
function renderLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props
  if ((percent ?? 0) < 0.05) return null
  const ir = Number(innerRadius ?? 0)
  const or = Number(outerRadius ?? 0)
  const ma = Number(midAngle ?? 0)
  const radius = ir + (or - ir) * 0.5
  const x = Number(cx ?? 0) + radius * Math.cos(-ma * RADIAN)
  const y = Number(cy ?? 0) + radius * Math.sin(-ma * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${((percent ?? 0) * 100).toFixed(0)}%`}
    </text>
  )
}

export function EstatusDonut({ data }: { data: EstatusData[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
          dataKey="value" labelLine={false} label={renderLabel}
          >
          {data.map((entry) => (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 11, color: '#64748b' }}>{value}</span>}
        />
        <Tooltip contentStyle={customTooltipStyle} formatter={(v, name) => [Number(v ?? 0), name]} />
      </PieChart>
    </ResponsiveContainer>
  )
}
