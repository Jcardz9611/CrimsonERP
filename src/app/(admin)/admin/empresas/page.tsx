'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Empresa {
  id: string
  nombre: string
  rfc: string
  razonSocial: string
  ciudad: string | null
  estado: string | null
  colorPrimario: string | null
  createdAt: string
  facturadoTotal: number
  _count: { usuarios: number; clientes: number; cotizaciones: number; facturas: number }
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

export default function AdminEmpresasPage() {
  const router = useRouter()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [entering, setEntering] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre: '', rfc: '', razonSocial: '', regimenFiscal: '601',
    codigoPostal: '', calle: '', colonia: '', ciudad: '', estado: '',
    adminNombre: '', adminEmail: '', adminPassword: '',
  })

  async function fetchEmpresas() {
    setLoading(true)
    const res = await fetch('/api/admin/empresas')
    const data = await res.json()
    setEmpresas(data)
    setLoading(false)
  }

  useEffect(() => { fetchEmpresas() }, [])

  function setField(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/empresas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Error al crear')
    } else {
      setShowModal(false)
      setForm({ nombre: '', rfc: '', razonSocial: '', regimenFiscal: '601', codigoPostal: '', calle: '', colonia: '', ciudad: '', estado: '', adminNombre: '', adminEmail: '', adminPassword: '' })
      fetchEmpresas()
    }
    setSaving(false)
  }

  async function entrarComoEmpresa(id: string) {
    setEntering(id)
    const res = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresaId: id }),
    })
    if (res.ok) {
      window.location.href = '/dashboard'
    } else {
      alert('Error al entrar como empresa')
      setEntering(null)
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Empresas</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nueva empresa
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {['Empresa', 'RFC', 'Ubicación', 'Usuarios', 'Clientes', 'Facturas', 'Facturado', 'Acciones'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Cargando...</td></tr>
            ) : empresas.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Sin empresas registradas</td></tr>
            ) : empresas.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: e.colorPrimario ?? '#6366f1' }} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{e.nombre}</p>
                      <p className="text-xs text-gray-400">{e.razonSocial}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-mono text-gray-600">{e.rfc}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{[e.ciudad, e.estado].filter(Boolean).join(', ') || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-700 text-center">{e._count.usuarios}</td>
                <td className="px-4 py-3 text-sm text-gray-700 text-center">{e._count.clientes}</td>
                <td className="px-4 py-3 text-sm text-gray-700 text-center">{e._count.facturas}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{fmt(e.facturadoTotal)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => entrarComoEmpresa(e.id)}
                    disabled={entering === e.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-100 text-violet-700 hover:bg-violet-200 disabled:opacity-50 transition-colors"
                  >
                    {entering === e.id ? 'Entrando...' : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Entrar como
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Nueva empresa</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Datos fiscales</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Nombre comercial *', key: 'nombre' },
                    { label: 'RFC *', key: 'rfc' },
                    { label: 'Razón social *', key: 'razonSocial' },
                    { label: 'Código postal *', key: 'codigoPostal' },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                      <input
                        value={form[key as keyof typeof form]}
                        onChange={(e) => setField(key as keyof typeof form, e.target.value)}
                        required={label.endsWith('*')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Régimen fiscal *</label>
                    <select
                      value={form.regimenFiscal}
                      onChange={(e) => setField('regimenFiscal', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="601">601 - General de Ley Personas Morales</option>
                      <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                      <option value="626">626 - Régimen Simplificado de Confianza</option>
                      <option value="616">616 - Sin obligaciones fiscales</option>
                    </select>
                  </div>
                  {[
                    { label: 'Ciudad', key: 'ciudad' },
                    { label: 'Estado', key: 'estado' },
                    { label: 'Calle', key: 'calle' },
                    { label: 'Colonia', key: 'colonia' },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                      <input
                        value={form[key as keyof typeof form]}
                        onChange={(e) => setField(key as keyof typeof form, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Usuario administrador</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Nombre', key: 'adminNombre' },
                    { label: 'Email *', key: 'adminEmail' },
                    { label: 'Contraseña *', key: 'adminPassword' },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                      <input
                        type={key === 'adminPassword' ? 'password' : 'text'}
                        value={form[key as keyof typeof form]}
                        onChange={(e) => setField(key as keyof typeof form, e.target.value)}
                        required={label.endsWith('*')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg">
                  {saving ? 'Creando...' : 'Crear empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
