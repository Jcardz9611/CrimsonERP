'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useTheme } from '@/lib/theme'
import {
  SearchInput, BtnPrimary,
  TableCard, Th, Td, TrEmpty, Badge,
  Modal, Field, inputCls, ErrorMsg, PageHeader,
} from '@/components/ui'

function EyeBtn({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="ml-1 text-gray-400 hover:text-gray-600 inline-flex align-middle" title={open ? 'Ocultar' : 'Mostrar'}>
      {open
        ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
      }
    </button>
  )
}

interface Cotizacion {
  id: string; folio: string
  cliente: { nombre: string; rfc: string }
  total: string
  estatus: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'FACTURADA'
  createdAt: string
}
interface Cliente { id: string; nombre: string; rfc: string }
interface Producto { id: string; nombre: string; precio: string; tasaIva: string; descripcion: string | null; unidad: string | null; claveUnidad: string | null }
interface ItemForm {
  productoId: string; descripcion: string; cantidad: number; precioUnitario: number
  descuento: number; subtotal: number; iva: number; total: number
  tasaIva: number; unidad: string; claveUnidad: string
}

const UNIDADES = [
  { clave: 'H87', nombre: 'Pieza' }, { clave: 'KGM', nombre: 'Kilogramo' },
  { clave: 'GRM', nombre: 'Gramo' }, { clave: 'LTR', nombre: 'Litro' },
  { clave: 'MTR', nombre: 'Metro' }, { clave: 'MTK', nombre: 'Metro cuadrado' },
  { clave: 'M3', nombre: 'Metro cúbico' }, { clave: 'BG', nombre: 'Bolsa' },
  { clave: 'XBX', nombre: 'Caja' }, { clave: 'E48', nombre: 'Servicio' },
]

const cellCls = "px-2 py-1 border border-gray-200 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"

export default function CotizacionesPage() {
  const { showAmounts, toggleAmounts } = useTheme()
  const router = useRouter()
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [clienteId, setClienteId] = useState('')
  const [notas, setNotas] = useState('')
  const [validezDias, setValidezDias] = useState(30)
  const [items, setItems] = useState<ItemForm[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [converting, setConverting] = useState<string | null>(null)

  const fetchCotizaciones = useCallback(async (q = '') => {
    setLoading(true)
    const res = await fetch(`/api/cotizaciones?search=${encodeURIComponent(q)}`)
    setCotizaciones(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchCotizaciones() }, [fetchCotizaciones])
  useEffect(() => {
    const t = setTimeout(() => fetchCotizaciones(search), 300)
    return () => clearTimeout(t)
  }, [search, fetchCotizaciones])

  async function openNew() {
    const [c, p] = await Promise.all([fetch('/api/clientes').then(r => r.json()), fetch('/api/productos').then(r => r.json())])
    setClientes(c); setProductos(p); setClienteId(''); setNotas(''); setValidezDias(30); setItems([]); setError(''); setShowModal(true)
  }

  function addItem() {
    setItems(prev => [...prev, { productoId: '', descripcion: '', cantidad: 1, precioUnitario: 0, descuento: 0, subtotal: 0, iva: 0, total: 0, tasaIva: 0.16, unidad: 'Pieza', claveUnidad: 'H87' }])
  }

  function updateItem(index: number, field: string, value: string | number) {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const next = { ...item, [field]: value }
      if (field === 'productoId') {
        const p = productos.find(p => p.id === value)
        if (p) { next.descripcion = p.nombre; next.precioUnitario = Number(p.precio); next.tasaIva = Number(p.tasaIva); next.claveUnidad = p.claveUnidad ?? 'H87'; next.unidad = p.unidad ?? 'Pieza' }
      }
      if (field === 'claveUnidad') { const u = UNIDADES.find(u => u.clave === value); if (u) next.unidad = u.nombre }
      const base = next.precioUnitario * next.cantidad * (1 - next.descuento / 100)
      next.subtotal = base; next.iva = base * next.tasaIva; next.total = base + next.iva
      return next
    }))
  }

  const subtotalTotal = items.reduce((s, i) => s + i.subtotal, 0)
  const ivaTotal = items.reduce((s, i) => s + i.iva, 0)
  const totalTotal = subtotalTotal + ivaTotal

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!items.length) { setError('Agrega al menos un producto'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/cotizaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clienteId, notas, validezDias, items }) })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error al guardar') }
    else { setShowModal(false); fetchCotizaciones(search) }
    setSaving(false)
  }

  async function cambiarEstatus(id: string, estatus: string) {
    await fetch(`/api/cotizaciones/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estatus }) })
    fetchCotizaciones(search)
  }

  async function convertirAVenta(cotId: string) {
    setConverting(cotId)
    try {
      const cot = await fetch(`/api/cotizaciones/${cotId}`).then(r => r.json())
      const factRes = await fetch('/api/facturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: cot.clienteId, cotizacionId: cotId,
          items: cot.items.map((item: {
            productoId: string; descripcion: string; cantidad: string | number
            precioUnitario: string | number; descuento: string | number
            subtotal: string | number; iva: string | number; total: string | number
            claveSAT?: string; claveUnidad?: string; unidad?: string
            producto?: { claveSAT?: string; claveUnidad?: string; unidad?: string }
          }) => ({
            productoId: item.productoId, descripcion: item.descripcion,
            cantidad: Number(item.cantidad), precioUnitario: Number(item.precioUnitario),
            descuento: Number(item.descuento ?? 0), subtotal: Number(item.subtotal),
            iva: Number(item.iva), total: Number(item.total),
            claveSAT: item.claveSAT ?? item.producto?.claveSAT,
            claveUnidad: item.claveUnidad ?? item.producto?.claveUnidad ?? 'H87',
            unidad: item.unidad ?? item.producto?.unidad ?? 'Pieza',
          })),
        }),
      })
      if (!factRes.ok) { const err = await factRes.json(); alert('Error: ' + (err.error ?? 'Desconocido')); return }
      router.push('/facturacion')
    } finally { setConverting(null) }
  }

  return (
    <>
      <PageHeader
        title="Cotizaciones"
        subtitle={`${cotizaciones.length} cotización${cotizaciones.length !== 1 ? 'es' : ''}`}
        actions={
          <BtnPrimary onClick={openNew}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nueva cotización
          </BtnPrimary>
        }
      />

      <div className="p-6 space-y-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por folio o cliente..." />

        <TableCard>
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <Th>Folio</Th>
                <Th>Cliente</Th>
                <Th><span className="inline-flex items-center gap-1">Total <EyeBtn open={showAmounts} onToggle={toggleAmounts} /></span></Th>
                <Th>Estatus</Th>
                <Th>Fecha</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">Cargando...</td></tr>
              ) : cotizaciones.length === 0 ? (
                <TrEmpty cols={6} msg="No hay cotizaciones registradas" />
              ) : cotizaciones.map(c => (
                <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                  <Td className="font-mono font-semibold text-gray-800">{c.folio}</Td>
                  <Td>
                    <p className="font-medium text-gray-800">{c.cliente.nombre}</p>
                    <p className="text-xs text-gray-400 font-mono">{c.cliente.rfc}</p>
                  </Td>
                  <Td className="font-semibold text-gray-900 tabular-nums">
                    {showAmounts ? formatCurrency(c.total) : '••••••'}
                  </Td>
                  <Td><Badge label={c.estatus} /></Td>
                  <Td className="text-gray-400 tabular-nums">{formatDate(c.createdAt)}</Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      {c.estatus === 'PENDIENTE' && (
                        <>
                          <button onClick={() => cambiarEstatus(c.id, 'APROBADA')}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors ring-1 ring-emerald-200">
                            Aprobar
                          </button>
                          <button onClick={() => cambiarEstatus(c.id, 'RECHAZADA')}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors ring-1 ring-red-200">
                            Rechazar
                          </button>
                        </>
                      )}
                      {c.estatus === 'APROBADA' && (
                        <button onClick={() => convertirAVenta(c.id)} disabled={converting === c.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-white shadow-sm disabled:opacity-50 transition-opacity hover:opacity-90"
                          style={{ backgroundColor: 'var(--primary)' }}>
                          {converting === c.id ? 'Creando...' : <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
                            Facturar venta
                          </>}
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>

      {showModal && (
        <Modal title="Nueva cotización" onClose={() => setShowModal(false)} wide>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Field label="Cliente" required>
                  <select value={clienteId} onChange={e => setClienteId(e.target.value)} required className={inputCls}>
                    <option value="">Seleccionar cliente...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} — {c.rfc}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Vigencia (días)">
                <input type="number" min="1" value={validezDias} onChange={e => setValidezDias(Number(e.target.value))} onFocus={e => e.target.select()} className={inputCls} />
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Productos</p>
                <button type="button" onClick={addItem}
                  className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Agregar
                </button>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Producto', 'Descripción', 'Unidad', 'Cant.', 'Precio', 'Dto.%', 'Subtotal', 'IVA', 'Total', ''].map(h => (
                        <th key={h} className="px-2 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.length === 0 ? (
                      <tr><td colSpan={10} className="px-3 py-6 text-center text-sm text-gray-400">Sin productos — haz clic en Agregar</td></tr>
                    ) : items.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-2 py-1.5">
                          <select value={item.productoId} onChange={e => updateItem(i, 'productoId', e.target.value)} required className={`w-32 ${cellCls}`}>
                            <option value="">Seleccionar...</option>
                            {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5"><input value={item.descripcion} onChange={e => updateItem(i, 'descripcion', e.target.value)} className={`w-28 ${cellCls}`} /></td>
                        <td className="px-2 py-1.5">
                          <select value={item.claveUnidad} onChange={e => updateItem(i, 'claveUnidad', e.target.value)} className={`w-24 ${cellCls}`}>
                            {UNIDADES.map(u => <option key={u.clave} value={u.clave}>{u.nombre}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5"><input type="number" min="0.001" step="any" value={item.cantidad} onChange={e => updateItem(i, 'cantidad', Number(e.target.value))} onFocus={e => e.target.select()} className={`w-16 ${cellCls}`} /></td>
                        <td className="px-2 py-1.5"><input type="number" step="any" value={item.precioUnitario} onChange={e => updateItem(i, 'precioUnitario', Number(e.target.value))} onFocus={e => e.target.select()} className={`w-20 ${cellCls}`} /></td>
                        <td className="px-2 py-1.5"><input type="number" min="0" max="100" step="any" value={item.descuento} onChange={e => updateItem(i, 'descuento', Number(e.target.value))} onFocus={e => e.target.select()} className={`w-14 ${cellCls}`} /></td>
                        <td className="px-2 py-1.5 text-xs text-gray-600 tabular-nums">{formatCurrency(item.subtotal)}</td>
                        <td className="px-2 py-1.5 text-xs text-gray-600 tabular-nums">{formatCurrency(item.iva)}</td>
                        <td className="px-2 py-1.5 text-xs font-semibold text-gray-900 tabular-nums">{formatCurrency(item.total)}</td>
                        <td className="px-2 py-1.5">
                          <button type="button" onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                            className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {items.length > 0 && (
                <div className="flex justify-end mt-3">
                  <div className="text-sm text-right space-y-1 min-w-[200px] bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                    <div className="flex justify-between gap-8 text-gray-500"><span>Subtotal</span><span className="font-medium text-gray-700 tabular-nums">{formatCurrency(subtotalTotal)}</span></div>
                    <div className="flex justify-between gap-8 text-gray-500"><span>IVA</span><span className="font-medium text-gray-700 tabular-nums">{formatCurrency(ivaTotal)}</span></div>
                    <div className="flex justify-between gap-8 text-gray-900 font-bold text-base border-t border-gray-200 pt-1"><span>Total</span><span className="tabular-nums">{formatCurrency(totalTotal)}</span></div>
                  </div>
                </div>
              )}
            </div>

            <Field label="Notas">
              <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} className={inputCls} />
            </Field>

            <ErrorMsg msg={error} />

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary)' }}>
                {saving ? 'Guardando...' : 'Crear cotización'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
