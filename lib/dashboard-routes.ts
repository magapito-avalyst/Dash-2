const DASHBOARD_ROOT = 'dashboard'

const dashboardRouteAliases: Record<string, string> = {
  '': '/dashboard',
  ad: '/dashboard/ads',
  ads: '/dashboard/ads',
  content: '/dashboard/conteudo',
  conteudo: '/dashboard/conteudo',
  crm: '/dashboard/crm',
  geral: '/dashboard',
  overview: '/dashboard',
  project: '/dashboard/projetos',
  projects: '/dashboard/projetos',
  projeto: '/dashboard/projetos',
  projetos: '/dashboard/projetos',
  visaogeral: '/dashboard',
  'visao-geral': '/dashboard',
  'visao_geral': '/dashboard',
}

function normalizeRouteSegment(segment: string) {
  return decodeURIComponent(segment)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function isDashboardPathname(pathname: string) {
  const [firstSegment] = pathname.split('/').filter(Boolean)
  return normalizeRouteSegment(firstSegment || '') === DASHBOARD_ROOT
}

export function getDashboardRouteAliasTarget(section: string) {
  return dashboardRouteAliases[normalizeRouteSegment(section)] || null
}

export function getCanonicalDashboardPathname(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const [firstSegment, section] = segments

  if (normalizeRouteSegment(firstSegment || '') !== DASHBOARD_ROOT) {
    return null
  }

  if (!section) {
    return '/dashboard'
  }

  return getDashboardRouteAliasTarget(section)
}
