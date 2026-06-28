import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.rol !== 'SUPERADMIN') redirect('/login')

  return (
    <div className="flex h-full bg-gray-100">
      <AdminSidebar email={session.email} />
      <main className="flex-1 ml-56 flex flex-col min-h-screen overflow-auto">
        {children}
      </main>
    </div>
  )
}
