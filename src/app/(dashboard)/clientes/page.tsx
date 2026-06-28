'use client'

import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'
import {
  SearchInput, BtnPrimary, BtnEdit, BtnDelete,
  TableCard, Th, Td, TrEmpty,
  Modal, Field, inputCls, ErrorMsg, PageHeader,
} from '@/components/ui'

interface Cliente {
  id: string
  nombre: string
  rfc: string
  razonSocial: string
  email: string | null
  telefono: string | null
  ciudad: string | null
  estado: string | null
  createdAt: string
}

const REGIMENES: Record<string, string> = {
  '601': '601 - General de Ley Personas Morales',
  '603': '603 - Personas Morales con Fines no Lucrativos',
  '605': '605 - Sueldos y Salarios e Ingresos Asimilados',
  '606': '606 - Arrendamiento',
  '607': '607 - Régimen de Enajenación o Adquisición de Bienes',
  '608': '608 - Demás ingresos',
  '610': '610 - Residentes en el Extranjero sin EP en México',
  '611': '611 - Ingresos por Dividendos',
  '612': '612 - Personas Físicas con Actividades Empresariales',
  '614': '614 - Ingresos por intereses',
  '615': '615 - Régimen de los ingresos por obtención de premios',
  '616': '616 - Sin obligaciones fiscales',
  '621': '621 - Incorporación Fiscal',
  '622': '622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
  '623': '623 - Opcional para Grupos de Sociedades',
  '624': '624 - Coordinados',
  '625': '625 - Actividades Empresariales vía Plataformas Tecnológicas',
  '626': '626 - Régimen Simplificado de Confianza',
}

const FORM_INICIAL = {
  nombre: '', rfc: '', razonSocial: '', email: '', telefono: '',
  calle: '', colonia: '', ciudad: '', estado: '', codigoPostal: '', regimenFiscal: '',
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function fetchClientes(q = '') {
    setLoading(true)
    const res = await fetch(`/api/clientes?search=${encodeURIComponent(q)}`)
    setClientes(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchClientes() }, [])
  useEffect(() => {
    const t = setTimeout(() => fetchClientes(search), 300)
    return () => clearTimeout(t)
  }, [search])

  function openNew() { setForm(FORM_INICIAL); setEditId(null); setError(''); setShowModal(true) }
  function openEdit(c: Cliente) {
    setForm({ nombre: c.nombre, rfc: c.rfc, razonSocial: c.razonSocial, email: c.email ?? '', telefono: c.telefono ?? '', calle: '', colonia: '', ciudad: c.ciudad ?? '', estado: c.estado ?? '', codigoPostal: '', regimenFiscal: '' })
    setEditId(c.id); setError(''); setShowModal(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este cliente?')) return
    await fetch(`/api/clientes/${id}`, { method: 'DELETE' })
    fetchClientes(search)
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault(); setSaving(true); setError('')
    const url = editId ? `/api/clientes/${editId}` : '/api/clientes'
    const res = await fetch(url, { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error al guardar') }
    else { setShowModal(false); fetchClientes(search) }
    setSaving(false)
  }

  function set(k: keyof typeof FORM_INICIAL) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: k === 'rfc' ? e.target.value.toUpperCase() : e.target.value }))
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} registrado${clientes.length !== 1 ? 's' : ''}`}
        actions={
          <BtnPrimary onClick={openNew}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nuevo cliente
          </BtnPrimary>
        }
      />

      <div className="p-6 space-y-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, RFC o razón social..." />

        <TableCard>
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Nombre / RFC', 'Razón Social', 'Email', 'Teléfono', 'Ciudad', 'Alta', ''].map(h => <Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">Cargando...</td></tr>
              ) : clientes.length === 0 ? (
                <TrEmpty cols={7} msg="No hay clientes registrados" />
              ) : clientes.map(c => (
                <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                  <Td className="text-gray-900">
                    <p className="font-medium">{c.nombre}</p>
                    <p className="text-xs text-gray-400 font-mono">{c.rfc}</p>
                  </Td>
                  <Td>{c.razonSocial}</Td>
                  <Td>{c.email ?? <span className="text-gray-300">—</span>}</Td>
                  <Td>{c.telefono ?? <span className="text-gray-300">—</span>}</Td>
                  <Td>{c.ciudad ?? <span className="text-gray-300">—</span>}</Td>
                  <Td className="text-gray-400 tabular-nums">{formatDate(c.createdAt)}</Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <BtnEdit onClick={() => openEdit(c)} />
                      <BtnDelete onClick={() => handleDelete(c.id)} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>

      {showModal && (
        <Modal title={editId ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => setShowModal(false)} wide>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre" required>
                <input value={form.nombre} onChange={set('nombre')} required className={inputCls} />
              </Field>
              <Field label="RFC" required>
                <input value={form.rfc} onChange={set('rfc')} required maxLength={13} className={`${inputCls} font-mono`} />
              </Field>
            </div>
            <Field label="Razón Social" required>
              <input value={form.razonSocial} onChange={set('razonSocial')} required className={inputCls} />
            </Field>
            <Field label="Régimen Fiscal">
              <select value={form.regimenFiscal} onChange={set('regimenFiscal')} className={inputCls}>
                <option value="">Seleccionar...</option>
                {Object.entries(REGIMENES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email">
                <input type="email" value={form.email} onChange={set('email')} className={inputCls} />
              </Field>
              <Field label="Teléfono">
                <input value={form.telefono} onChange={set('telefono')} className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Calle">
                <input value={form.calle} onChange={set('calle')} className={inputCls} />
              </Field>
              <Field label="Colonia">
                <input value={form.colonia} onChange={set('colonia')} className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Ciudad">
                <input value={form.ciudad} onChange={set('ciudad')} className={inputCls} />
              </Field>
              <Field label="Estado">
                <input value={form.estado} onChange={set('estado')} className={inputCls} />
              </Field>
              <Field label="C.P.">
                <input value={form.codigoPostal} onChange={set('codigoPostal')} maxLength={5} className={inputCls} />
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
                {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Crear cliente'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
