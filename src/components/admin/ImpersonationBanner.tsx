'use client'

import { useState } from 'react'

export default function ImpersonationBanner({ empresa }: { empresa: string }) {
  const [loading, setLoading] = useState(false)

  async function salir() {
    setLoading(true)
    await fetch('/api/admin/impersonate', { method: 'DELETE' })
    window.location.href = '/admin'
  }

  return (
    <div className="flex items-center justify-between bg-amber-500 text-white px-4 py-2 text-sm font-medium">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span>Modo diagnóstico — estás viendo como <strong>{empresa}</strong></span>
      </div>
      <button
        onClick={salir}
        disabled={loading}
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-50 px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
      >
        {loading ? 'Saliendo...' : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Salir al panel admin
          </>
        )}
      </button>
    </div>
  )
}
