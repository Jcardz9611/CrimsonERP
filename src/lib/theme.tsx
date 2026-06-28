'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface ThemeState {
  primaryColor: string
  secondaryColor: string
  darkMode: boolean
  showAmounts: boolean
}

interface ThemeCtxType extends ThemeState {
  setPrimaryColor: (color: string) => void
  setSecondaryColor: (color: string) => void
  savePrimaryColor: (color: string) => void
  saveSecondaryColor: (color: string) => void
  toggleDark: () => void
  toggleAmounts: () => void
}

const DEFAULTS: ThemeState = {
  primaryColor: '#2563EB',
  secondaryColor: '#64748b',
  darkMode: false,
  showAmounts: true,
}

const PREF_KEY = 'erp_theme'           // darkMode, showAmounts
const COLORS_KEY = 'erp_empresa_colors' // cached empresa colors

const ThemeCtx = createContext<ThemeCtxType | null>(null)

function applyCSSVars(primary: string, secondary: string) {
  const root = document.documentElement
  root.style.setProperty('--primary', primary)
  // approximate dark variant: raw value stored, hover handled by globals
  root.style.setProperty('--primary-dark', primary)
  root.style.setProperty('--sidebar-active', primary)
  root.style.setProperty('--secondary', secondary)
}

async function fetchEmpresaColors(): Promise<{ colorPrimario: string; colorSecundario: string } | null> {
  try {
    const res = await fetch('/api/empresa/tema')
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function saveEmpresaColors(patch: { colorPrimario?: string; colorSecundario?: string }) {
  try {
    await fetch('/api/empresa/tema', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  } catch {
    // silent — UI already updated
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeState>(DEFAULTS)

  useEffect(() => {
    // Load user prefs (darkMode, showAmounts) from localStorage
    let prefs: Partial<ThemeState> = {}
    try { prefs = JSON.parse(localStorage.getItem(PREF_KEY) || '{}') } catch { /* noop */ }

    // Apply cached empresa colors immediately to avoid flash
    let cachedPrimary = DEFAULTS.primaryColor
    let cachedSecondary = DEFAULTS.secondaryColor
    try {
      const cached = JSON.parse(localStorage.getItem(COLORS_KEY) || '{}')
      if (cached.primary) cachedPrimary = cached.primary
      if (cached.secondary) cachedSecondary = cached.secondary
    } catch { /* noop */ }

    const initial: ThemeState = {
      ...DEFAULTS,
      ...prefs,
      primaryColor: cachedPrimary,
      secondaryColor: cachedSecondary,
    }
    setState(initial)
    applyCSSVars(initial.primaryColor, initial.secondaryColor)
    document.documentElement.classList.toggle('dark', !!initial.darkMode)

    // Then fetch real colors from DB
    fetchEmpresaColors().then(data => {
      if (!data) return
      const primary = data.colorPrimario
      const secondary = data.colorSecundario
      setState(prev => ({ ...prev, primaryColor: primary, secondaryColor: secondary }))
      applyCSSVars(primary, secondary)
      localStorage.setItem(COLORS_KEY, JSON.stringify({ primary, secondary }))
    })
  }, [])

  function updatePref(patch: Partial<Pick<ThemeState, 'darkMode' | 'showAmounts'>>) {
    setState(prev => {
      const next = { ...prev, ...patch }
      if ('darkMode' in patch) document.documentElement.classList.toggle('dark', !!patch.darkMode)
      const prefs = { darkMode: next.darkMode, showAmounts: next.showAmounts }
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs))
      return next
    })
  }

  // Update CSS var immediately (called on input onChange)
  function setPrimaryColor(color: string) {
    setState(prev => ({ ...prev, primaryColor: color }))
    applyCSSVars(color, state.secondaryColor)
  }

  function setSecondaryColor(color: string) {
    setState(prev => ({ ...prev, secondaryColor: color }))
    applyCSSVars(state.primaryColor, color)
  }

  // Persist to DB (called on input onBlur)
  function savePrimaryColor(color: string) {
    localStorage.setItem(COLORS_KEY, JSON.stringify({ primary: color, secondary: state.secondaryColor }))
    saveEmpresaColors({ colorPrimario: color })
  }

  function saveSecondaryColor(color: string) {
    localStorage.setItem(COLORS_KEY, JSON.stringify({ primary: state.primaryColor, secondary: color }))
    saveEmpresaColors({ colorSecundario: color })
  }

  return (
    <ThemeCtx.Provider value={{
      ...state,
      setPrimaryColor,
      setSecondaryColor,
      savePrimaryColor,
      saveSecondaryColor,
      toggleDark: () => updatePref({ darkMode: !state.darkMode }),
      toggleAmounts: () => updatePref({ showAmounts: !state.showAmounts }),
    }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export function useTheme(): ThemeCtxType {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider')
  return ctx
}
