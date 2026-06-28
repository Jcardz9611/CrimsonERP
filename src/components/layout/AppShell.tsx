'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'

export default function AppShell({
  children,
  empresa,
  usuario,
  impersonationBanner,
}: {
  children: React.ReactNode
  empresa: string
  usuario: string
  impersonationBanner?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-full">
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <Sidebar
        empresa={empresa}
        usuario={usuario}
        mobileOpen={open}
        onClose={() => setOpen(false)}
      />

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen overflow-auto">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-white/10" style={{ background: '#0f172a' }}>
          <button
            onClick={() => setOpen(true)}
            className="p-1.5 rounded-md text-slate-400 hover:text-white transition-colors flex-shrink-0"
            aria-label="Abrir menú"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-white font-semibold text-sm truncate">{empresa || 'ERP Sistema'}</span>
        </div>

        {impersonationBanner}
        {children}
      </main>
    </div>
  )
}
