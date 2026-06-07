import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/session'

export default async function Home() {
  const isAdmin = await getAdminSession()
  if (isAdmin) {
    redirect('/admin')
  }
  redirect('/admin-login')
}
