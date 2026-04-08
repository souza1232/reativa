import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                     'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export interface DashboardMetrics {
  total_contacts: number
  inactive_contacts: number
  active_campaigns: number
  reactivation_rate: number
}

export interface MonthlyPoint {
  month: string
  total: number
}

export interface RevenuePoint {
  month: string
  receita: number
}

export interface InactivityDistribution {
  name: string
  value: number
  color: string
}

export interface CampaignRow {
  id: string
  name: string
  status: string
  sent: number
  delivered: number
  read: number
  replied: number
  conversions: number
  revenue: number
}

export interface TopInactiveContact {
  id: string
  name: string
  phone: string
  total_spent: number
  last_interaction_date: string | null
  days_inactive: number
}

export async function getDashboardMetrics(company_id: string): Promise<DashboardMetrics> {
  const sb = getSupabase()

  const [totalRes, inactiveRes, campaignsRes, convRes, msgsRes] = await Promise.all([
    sb.from('contacts').select('id', { count: 'exact', head: true }).eq('company_id', company_id),
    sb.from('contacts').select('id', { count: 'exact', head: true }).eq('company_id', company_id).eq('status', 'inactive'),
    sb.from('campaigns').select('id', { count: 'exact', head: true }).eq('company_id', company_id).eq('status', 'running'),
    sb.from('conversions').select('id', { count: 'exact', head: true })
      .eq('company_id', company_id)
      .gte('converted_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    sb.from('messages').select('id', { count: 'exact', head: true })
      .eq('company_id', company_id)
      .in('status', ['sent', 'delivered', 'read', 'replied'])
      .gte('sent_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ])

  const sent = msgsRes.count ?? 0
  const converted = convRes.count ?? 0
  const reactivation_rate = sent > 0 ? Math.round((converted / sent) * 100) : 0

  return {
    total_contacts: totalRes.count ?? 0,
    inactive_contacts: inactiveRes.count ?? 0,
    active_campaigns: campaignsRes.count ?? 0,
    reactivation_rate,
  }
}

export async function getReactivationsByMonth(company_id: string): Promise<MonthlyPoint[]> {
  const sb = getSupabase()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)

  const { data } = await sb
    .from('conversions')
    .select('converted_at')
    .eq('company_id', company_id)
    .gte('converted_at', sixMonthsAgo.toISOString())

  const grouped: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    grouped[key] = 0
  }

  for (const row of data ?? []) {
    const d = new Date(row.converted_at)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (key in grouped) grouped[key]++
  }

  return Object.entries(grouped).map(([key, total]) => {
    const [year, month] = key.split('-').map(Number)
    return { month: MONTH_NAMES[month], total }
  })
}

export async function getRevenueByMonth(company_id: string): Promise<RevenuePoint[]> {
  const sb = getSupabase()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)

  const { data } = await sb
    .from('conversions')
    .select('revenue_amount, converted_at')
    .eq('company_id', company_id)
    .gte('converted_at', sixMonthsAgo.toISOString())

  const grouped: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    grouped[key] = 0
  }

  for (const row of data ?? []) {
    const d = new Date(row.converted_at)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (key in grouped) grouped[key] += Number(row.revenue_amount)
  }

  return Object.entries(grouped).map(([key, receita]) => {
    const [year, month] = key.split('-').map(Number)
    return { month: MONTH_NAMES[month], receita: Math.round(receita) }
  })
}

export async function getInactivityDistribution(company_id: string): Promise<InactivityDistribution[]> {
  const sb = getSupabase()
  const now = new Date().toISOString().split('T')[0]

  const { data } = await sb
    .from('contacts')
    .select('last_interaction_date, status')
    .eq('company_id', company_id)
    .neq('status', 'unsubscribed')

  let ativos = 0, d30 = 0, d60 = 0, d90plus = 0

  for (const row of data ?? []) {
    if (!row.last_interaction_date) { d90plus++; continue }
    const days = Math.floor((Date.now() - new Date(row.last_interaction_date).getTime()) / 86400000)
    if (days < 30) ativos++
    else if (days < 60) d30++
    else if (days < 90) d60++
    else d90plus++
  }

  return [
    { name: 'Ativos', value: ativos, color: '#22C55E' },
    { name: '30–60 dias', value: d30, color: '#EAB308' },
    { name: '60–90 dias', value: d60, color: '#F97316' },
    { name: '+90 dias', value: d90plus, color: '#EF4444' },
  ]
}

export async function getRecentCampaigns(company_id: string): Promise<CampaignRow[]> {
  const sb = getSupabase()

  const { data: campaigns } = await sb
    .from('campaigns')
    .select('id, name, status')
    .eq('company_id', company_id)
    .order('created_at', { ascending: false })
    .limit(5)

  if (!campaigns?.length) return []

  const results: CampaignRow[] = []

  for (const c of campaigns) {
    const { data: msgs } = await sb
      .from('messages')
      .select('status')
      .eq('campaign_id', c.id)

    const { data: convs } = await sb
      .from('conversions')
      .select('revenue_amount')
      .eq('campaign_id', c.id)

    const counts = { sent: 0, delivered: 0, read: 0, replied: 0 }
    for (const m of msgs ?? []) {
      if (['sent','delivered','read','replied'].includes(m.status)) counts.sent++
      if (['delivered','read','replied'].includes(m.status)) counts.delivered++
      if (['read','replied'].includes(m.status)) counts.read++
      if (m.status === 'replied') counts.replied++
    }

    results.push({
      id: c.id,
      name: c.name,
      status: c.status,
      ...counts,
      conversions: convs?.length ?? 0,
      revenue: convs?.reduce((a, b) => a + Number(b.revenue_amount), 0) ?? 0,
    })
  }

  return results
}

export async function getTopInactiveContacts(company_id: string): Promise<TopInactiveContact[]> {
  const sb = getSupabase()

  const { data } = await sb
    .from('contacts')
    .select('id, name, phone, total_spent, last_interaction_date')
    .eq('company_id', company_id)
    .eq('status', 'inactive')
    .order('total_spent', { ascending: false })
    .limit(5)

  return (data ?? []).map(c => ({
    ...c,
    days_inactive: c.last_interaction_date
      ? Math.floor((Date.now() - new Date(c.last_interaction_date).getTime()) / 86400000)
      : 999,
  }))
}
