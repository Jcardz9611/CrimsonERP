import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/lib/theme'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ERP Sistema',
  description: 'Sistema ERP para gestión empresarial',
}

// Runs synchronously before React to avoid flash of wrong theme
const themeScript = `
(function(){
  try {
    var t = JSON.parse(localStorage.getItem('erp_theme') || '{}');
    if (t.darkMode) document.documentElement.classList.add('dark');
    var c = JSON.parse(localStorage.getItem('erp_empresa_colors') || '{}');
    var primary = c.primary || '#2563EB';
    var secondary = c.secondary || '#64748b';
    document.documentElement.style.setProperty('--primary', primary);
    document.documentElement.style.setProperty('--primary-dark', primary);
    document.documentElement.style.setProperty('--sidebar-active', primary);
    document.documentElement.style.setProperty('--secondary', secondary);
  } catch(e) {}
})();
`

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full`}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
