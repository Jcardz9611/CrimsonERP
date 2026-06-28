'use client'

import dynamic from 'next/dynamic'

const VentasAreaChart = dynamic(() => import('./Charts').then(m => m.VentasAreaChart), { ssr: false })
const CotizacionesBarChart = dynamic(() => import('./Charts').then(m => m.CotizacionesBarChart), { ssr: false })
const EstatusDonut = dynamic(() => import('./Charts').then(m => m.EstatusDonut), { ssr: false })

interface MesData { mes: string; total: number }
interface EstatusData { name: string; value: number; color: string }

export function VentasChart({ data }: { data: MesData[] }) {
  return <VentasAreaChart data={data} />
}

export function CotizChart({ data }: { data: MesData[] }) {
  return <CotizacionesBarChart data={data} />
}

export function DonutChart({ data }: { data: EstatusData[] }) {
  return <EstatusDonut data={data} />
}
