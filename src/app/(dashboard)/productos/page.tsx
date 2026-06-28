'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import {
  SearchInput, BtnPrimary, BtnEdit, BtnDelete,
  TableCard, Th, Td, TrEmpty,
  Modal, Field, inputCls, ErrorMsg, PageHeader,
} from '@/components/ui'

interface Producto {
  id: string
  nombre: string
  descripcion: string | null
  precio: string
  tasaIva: string
  claveSAT: string | null
  claveUnidad: string | null
  unidad: string | null
}

const FORM_INICIAL = {
  nombre: '', descripcion: '', precio: '', tasaIva: '0.16',
  claveSAT: '', claveUnidad: 'H87', unidad: 'Pieza',
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function fetchProductos(q = '') {
    setLoading(true)
    const res = await fetch(`/api/productos?search=${encodeURIComponent(q)}`)
    setProductos(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchProductos() }, [])
  useEffect(() => {
    const t = setTimeout(() => fetchProductos(search), 300)
    return () => clearTimeout(t)
  }, [search])

  function openNew() { setForm(FORM_INICIAL); setEditId(null); setError(''); setShowModal(true) }
  function openEdit(p: Producto) {
    setForm({ nombre: p.nombre, descripcion: p.descripcion ?? '', precio: p.precio, tasaIva: p.tasaIva, claveSAT: p.claveSAT ?? '', claveUnidad: p.claveUnidad ?? 'H87', unidad: p.unidad ?? 'Pieza' })
    setEditId(p.id); setError(''); setShowModal(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este producto?')) return
    await fetch(`/api/productos/${id}`, { method: 'DELETE' })
    fetchProductos(search)
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault(); setSaving(true); setError('')
    const url = editId ? `/api/productos/${editId}` : '/api/productos'
    const res = await fetch(url, {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, precio: Number(form.precio), tasaIva: Number(form.tasaIva) }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error al guardar') }
    else { setShowModal(false); fetchProductos(search) }
    setSaving(false)
  }

  function set(k: keyof typeof FORM_INICIAL) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  return (
    <>
      <PageHeader
        title="Productos"
        subtitle={`${productos.length} producto${productos.length !== 1 ? 's' : ''} registrado${productos.length !== 1 ? 's' : ''}`}
        actions={
          <BtnPrimary onClick={openNew}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nuevo producto
          </BtnPrimary>
        }
      />

      <div className="p-6 space-y-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o clave..." />

        <TableCard>
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Producto', 'Descripción', 'Precio', 'IVA', 'Clave SAT', 'Unidad', ''].map(h => <Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">Cargando...</td></tr>
              ) : productos.length === 0 ? (
                <TrEmpty cols={7} msg="No hay productos registrados" />
              ) : productos.map(p => (
                <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                  <Td className="text-gray-900 font-medium">{p.nombre}</Td>
                  <Td className="text-gray-500 max-w-xs truncate">{p.descripcion ?? <span className="text-gray-300">—</span>}</Td>
                  <Td className="font-semibold text-gray-900 tabular-nums">{formatCurrency(p.precio)}</Td>
                  <Td>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${Number(p.tasaIva) > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      {(Number(p.tasaIva) * 100).toFixed(0)}%
                    </span>
                  </Td>
                  <Td className="text-gray-500 font-mono text-xs">{p.claveSAT ?? <span className="text-gray-300">—</span>}</Td>
                  <Td className="text-gray-500">{p.unidad}</Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <BtnEdit onClick={() => openEdit(p)} />
                      <BtnDelete onClick={() => handleDelete(p.id)} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>

      {showModal && (
        <Modal title={editId ? 'Editar producto' : 'Nuevo producto'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Field label="Nombre" required>
              <input value={form.nombre} onChange={set('nombre')} required className={inputCls} />
            </Field>
            <Field label="Descripción">
              <textarea value={form.descripcion} onChange={set('descripcion')} rows={2} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Precio" required>
                <input type="number" step="any" min="0" value={form.precio} onChange={set('precio')} required
                  onFocus={e => e.target.select()} className={inputCls} />
              </Field>
              <Field label="Tasa IVA">
                <select value={form.tasaIva} onChange={set('tasaIva')} className={inputCls}>
                  <option value="0.16">16%</option>
                  <option value="0.08">8%</option>
                  <option value="0">0% (Exento)</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Clave SAT">
                <input value={form.claveSAT} onChange={set('claveSAT')} placeholder="ej. 81112200" className={`${inputCls} font-mono`} />
              </Field>
              <Field label="Unidad">
                <input value={form.unidad} onChange={set('unidad')} className={inputCls} />
              </Field>
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
                {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Crear producto'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
