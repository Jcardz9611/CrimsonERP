'use client'

import { useTheme } from '@/lib/theme'

function Toggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative flex-shrink-0 w-10 h-6 rounded-full transition-colors focus:outline-none"
      style={{ backgroundColor: active ? 'var(--primary)' : '#6b7280' }}
      aria-pressed={active}
    >
      <span
        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
        style={{ transform: active ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  )
}

function ColorPicker({
  label,
  value,
  onChange,
  onBlur,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur: (v: string) => void
}) {
  return (
    <div className="mb-3">
      <p className="text-xs mb-1.5" style={{ color: 'var(--text-secondary, #6b7280)' }}>{label}</p>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onBlur(e.target.value)}
          className="w-9 h-9 rounded-lg cursor-pointer border-2 border-gray-200 p-0.5 bg-transparent"
          style={{ borderColor: value }}
        />
        <span className="text-xs font-mono" style={{ color: 'var(--text-main, #111827)' }}>
          {value.toUpperCase()}
        </span>
      </label>
    </div>
  )
}

export default function ThemePanel({ onClose }: { onClose: () => void }) {
  const {
    primaryColor, secondaryColor, darkMode,
    setPrimaryColor, setSecondaryColor,
    savePrimaryColor, saveSecondaryColor,
    toggleDark,
  } = useTheme()

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-2 rounded-xl p-4 shadow-2xl z-50"
      style={{
        backgroundColor: darkMode ? '#374151' : '#ffffff',
        border: `1px solid ${darkMode ? '#4b5563' : '#e5e7eb'}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold" style={{ color: darkMode ? '#f9fafb' : '#111827' }}>
          Apariencia
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-300 w-6 h-6 flex items-center justify-center"
        >
          ✕
        </button>
      </div>

      {/* Primary color picker */}
      <ColorPicker
        label="Color primario"
        value={primaryColor}
        onChange={setPrimaryColor}
        onBlur={savePrimaryColor}
      />

      {/* Secondary color picker */}
      <ColorPicker
        label="Color secundario"
        value={secondaryColor}
        onChange={setSecondaryColor}
        onBlur={saveSecondaryColor}
      />

      {/* Dark mode toggle */}
      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: darkMode ? '#4b5563' : '#e5e7eb' }}>
        <span className="text-sm" style={{ color: darkMode ? '#e5e7eb' : '#374151' }}>
          {darkMode ? '🌙 Modo noche' : '☀️ Modo día'}
        </span>
        <Toggle active={darkMode} onToggle={toggleDark} />
      </div>
    </div>
  )
}
