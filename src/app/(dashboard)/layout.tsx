import AppShell from '@/components/layout/AppShell'
import ImpersonationBanner from '@/components/admin/ImpersonationBanner'
import { getSession } from '@/lib/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  return (
    <AppShell
      empresa={session?.empresa ?? ''}
      usuario={session?.email ?? ''}
      impersonationBanner={
        session?.impersonatedBy
          ? <ImpersonationBanner empresa={session.empresa ?? ''} />
          : undefined
      }
    >
      {children}
    </AppShell>
  )
}
