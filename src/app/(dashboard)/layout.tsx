import Sidebar from '@/components/layout/Sidebar'
import ImpersonationBanner from '@/components/admin/ImpersonationBanner'
import { getSession } from '@/lib/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  return (
    <div className="flex h-full">
      <Sidebar empresa={session?.empresa ?? ''} usuario={session?.email ?? ''} />
      <main className="flex-1 ml-64 flex flex-col min-h-screen overflow-auto">
        {session?.impersonatedBy && (
          <ImpersonationBanner empresa={session.empresa ?? ''} />
        )}
        {children}
      </main>
    </div>
  )
}
