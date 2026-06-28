'use client'

import { useEffect, useState, useCallback } from 'react'
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

interface Factura {
  id: string; folio: string; serie: string
  cliente: { nombre: string; rfc: string }
  total: string
  estatus: 'PENDIENTE' | 'TIMBRADA' | 'CANCELADA'
  uuid: string | null; createdAt: string
}
interface Cliente { id: string; nombre: string; rfc: string; razonSocial: string; codigoPostal: string | null; regimenFiscal: string | null }
interface Producto { id: string; nombre: string; precio: string; tasaIva: string; descripcion: string | null; claveSAT: string | null; claveUnidad: string | null; unidad: string | null }
interface ItemForm {
  productoId: string; descripcion: string; cantidad: number; precioUnitario: number
  descuento: number; subtotal: number; iva: number; total: number
  tasaIva: number; claveSAT: string; claveUnidad: string; unidad: string
}

const UNIDADES = [
  { clave: 'H87', nombre: 'Pieza' }, { clave: 'KGM', nombre: 'Kilogramo' },
  { clave: 'GRM', nombre: 'Gramo' }, { clave: 'LTR', nombre: 'Litro' },
  { clave: 'MTR', nombre: 'Metro' }, { clave: 'MTK', nombre: 'Metro cuadrado' },
  { clave: 'M3', nombre: 'Metro cúbico' }, { clave: 'BG', nombre: 'Bolsa' },
  { clave: 'XBX', nombre: 'Caja' }, { clave: 'E48', nombre: 'Servicio' },
]

const USO_CFDI = [
  { code: 'G01', label: 'G01 - Adquisición de mercancias' },
  { code: 'G02', label: 'G02 - Devoluciones, descuentos o bonificaciones' },
  { code: 'G03', label: 'G03 - Gastos en general' },
  { code: 'I01', label: 'I01 - Construcciones' },
  { code: 'I02', label: 'I02 - Mobilario y equipo de oficina' },
  { code: 'I03', label: 'I03 - Equipo de transporte' },
  { code: 'I04', label: 'I04 - Equipo de computo y accesorios' },
  { code: 'P01', label: 'P01 - Por definir' },
  { code: 'S01', label: 'S01 - Sin efectos fiscales' },
]

const FORMA_PAGO = [
  { code: '01', label: '01 - Efectivo' },
  { code: '02', label: '02 - Cheque nominativo' },
  { code: '03', label: '03 - Transferencia electrónica' },
  { code: '04', label: '04 - Tarjeta de crédito' },
  { code: '28', label: '28 - Tarjeta de débito' },
  { code: '99', label: '99 - Por definir' },
]

const cellCls = "px-2 py-1 border border-gray-200 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"

export default function FacturacionPage() {
  const { showAmounts, toggleAmounts } = useTheme()
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [clienteId, setClienteId] = useState('')
  const [formaPago, setFormaPago] = useState('99')
  const [metodoPago, setMetodoPago] = useState('PPD')
  const [usoCFDI, setUsoCFDI] = useState('G01')
  const [items, setItems] = useState<ItemForm[]>([])
  const [saving, setSaving] = useState(false)
  const [timbrandoId, setTimbrandoId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const fetchFacturas = useCallback(async (q = '') => {
    setLoading(true)
    const res = await fetch(`/api/facturas?search=${encodeURIComponent(q)}`)
    setFacturas(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchFacturas() }, [fetchFacturas])
  useEffect(() => {
    const t = setTimeout(() => fetchFacturas(search), 300)
    return () => clearTimeout(t)
  }, [search, fetchFacturas])

  async function openNew() {
    const [c, p] = await Promise.all([fetch('/api/clientes').then(r => r.json()), fetch('/api/productos').then(r => r.json())])
    setClientes(c); setProductos(p); setClienteId(''); setFormaPago('99'); setMetodoPago('PPD'); setUsoCFDI('G01'); setItems([]); setError(''); setShowModal(true)
  }

  function addItem() {
    setItems(prev => [...prev, { productoId: '', descripcion: '', cantidad: 1, precioUnitario: 0, descuento: 0, subtotal: 0, iva: 0, total: 0, tasaIva: 0.16, claveSAT: '', claveUnidad: 'H87', unidad: 'Pieza' }])
  }

  function updateItem(index: number, field: string, value: string | number) {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const next = { ...item, [field]: value }
      if (field === 'productoId') {
        const p = productos.find(p => p.id === value)
        if (p) { next.descripcion = p.nombre; next.precioUnitario = Number(p.precio); next.tasaIva = Number(p.tasaIva); next.claveSAT = p.claveSAT ?? ''; next.claveUnidad = p.claveUnidad ?? 'H87'; next.unidad = p.unidad ?? 'Pieza' }
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
    if (!items.length) { setError('Agrega al menos un concepto'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/facturas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clienteId, formaPago, metodoPago, usoCFDI, items }) })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error al guardar') }
    else { setShowModal(false); fetchFacturas(search) }
    setSaving(false)
  }

  async function handleTimbrar(id: string) {
    if (!confirm('¿Timbrar esta factura? Esta acción no se puede deshacer fácilmente.')) return
    setTimbrandoId(id)
    const res = await fetch(`/api/facturas/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'timbrar' }) })
    const data = await res.json()
    setTimbrandoId(null)
    if (!res.ok) { alert('Error al timbrar: ' + data.error) }
    else { alert(`Factura timbrada.\nUUID: ${data.uuid}`); fetchFacturas(search) }
  }

  return (
    <>
      <PageHeader
        title="Facturación"
        subtitle={`${facturas.length} factura${facturas.length !== 1 ? 's' : ''}`}
        actions={
          <BtnPrimary onClick={openNew}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nueva factura
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
                <Th>UUID</Th>
                <Th>Fecha</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">Cargando...</td></tr>
              ) : facturas.length === 0 ? (
                <TrEmpty cols={7} msg="No hay facturas registradas" />
              ) : facturas.map(f => (
                <tr key={f.id} className="hover:bg-blue-50/30 transition-colors">
                  <Td className="font-mono font-semibold text-gray-800">{f.serie}{f.folio}</Td>
                  <Td>
                    <p className="font-medium text-gray-800">{f.cliente.nombre}</p>
                    <p className="text-xs text-gray-400 font-mono">{f.cliente.rfc}</p>
                  </Td>
                  <Td className="font-semibold text-gray-900 tabular-nums">
                    {showAmounts ? formatCurrency(f.total) : '••••••'}
                  </Td>
                  <Td><Badge label={f.estatus} /></Td>
                  <Td className="text-xs text-gray-400 font-mono max-w-[140px] truncate">
                    {f.uuid ? <span title={f.uuid}>{f.uuid.slice(0, 8)}…</span> : <span className="text-gray-300">—</span>}
                  </Td>
                  <Td className="text-gray-400 tabular-nums">{formatDate(f.createdAt)}</Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      {f.estatus === 'PENDIENTE' && (
                        <button onClick={() => handleTimbrar(f.id)} disabled={timbrandoId === f.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 ring-1 ring-indigo-200 disabled:opacity-50 transition-colors">
                          {timbrandoId === f.id ? (
                            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          )}
                          {timbrandoId === f.id ? 'Timbrando...' : 'Timbrar SAT'}
                        </button>
                      )}
                      {f.estatus === 'TIMBRADA' && (
                        <>
                          <a href={`/api/facturas/${f.id}/documento?formato=pdf`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200 transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            PDF
                          </a>
                          <a href={`/api/facturas/${f.id}/documento?formato=xml`} download
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-1 ring-emerald-200 transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                            XML
                          </a>
                        </>
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
        <Modal title="Nueva factura" onClose={() => setShowModal(false)} wide>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cliente" required>
                <select value={clienteId} onChange={e => setClienteId(e.target.value)} required className={inputCls}>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} — {c.rfc}</option>)}
                </select>
              </Field>
              <Field label="Uso CFDI">
                <select value={usoCFDI} onChange={e => setUsoCFDI(e.target.value)} className={inputCls}>
                  {USO_CFDI.map(u => <option key={u.code} value={u.code}>{u.label}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Forma de pago">
                <select value={formaPago} onChange={e => setFormaPago(e.target.value)} className={inputCls}>
                  {FORMA_PAGO.map(f => <option key={f.code} value={f.code}>{f.label}</option>)}
                </select>
              </Field>
              <Field label="Método de pago">
                <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} className={inputCls}>
                  <option value="PUE">PUE - Pago en una sola exhibición</option>
                  <option value="PPD">PPD - Pago en parcialidades o diferido</option>
                </select>
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Conceptos</p>
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
                      <tr><td colSpan={10} className="px-3 py-6 text-center text-sm text-gray-400">Sin conceptos — haz clic en Agregar</td></tr>
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

            <ErrorMsg msg={error} />

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary)' }}>
                {saving ? 'Guardando...' : 'Crear factura'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
