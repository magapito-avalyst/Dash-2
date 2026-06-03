import { getDashboardRouteAliasTarget } from '@/lib/dashboard-routes'
import { notFound, redirect } from 'next/navigation'

export default async function DashboardSectionAliasPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params
  const target = getDashboardRouteAliasTarget(section)

  if (target) {
    redirect(target)
  }

  notFound()
}
