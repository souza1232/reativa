import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export interface CampaignMetrics {
  queued: number
  sending: number
  sent: number
  delivered: number
  read: number
  replied: number
  failed: number
  conversions: number
  revenue: number
}

export interface MessageRow {
  id: string
  phone: string
  status: string
  zapi_message_id: string | null
  error_message: string | null
  queued_at: string
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
  replied_at: string | null
  contact: {
    id: string
    name: string
    phone: string
  } | null
}

export async function getCampaignMetrics(
  campaign_id: string,
  company_id: string
): Promise<CampaignMetrics> {
  const sb = getSupabase()

  const [msgsRes, convsRes] = await Promise.all([
    sb.from('messages').select('status').eq('campaign_id', campaign_id).eq('company_id', company_id),
    sb.from('conversions').select('revenue_amount').eq('campaign_id', campaign_id).eq('company_id', company_id),
  ])

  const counts: CampaignMetrics = {
    queued: 0, sending: 0, sent: 0, delivered: 0,
    read: 0, replied: 0, failed: 0, conversions: 0, revenue: 0,
  }

  for (const m of msgsRes.data ?? []) {
    const s = m.status as keyof CampaignMetrics
    if (s in counts) (counts[s] as number)++
  }

  counts.conversions = convsRes.data?.length ?? 0
  counts.revenue = convsRes.data?.reduce((a, b) => a + Number(b.revenue_amount), 0) ?? 0

  return counts
}

export async function getCampaignMessages(
  campaign_id: string,
  filters: { status?: string } = {},
  page = 1,
  pageSize = 50
): Promise<{ data: MessageRow[]; total: number }> {
  const sb = getSupabase()

  let query = sb
    .from('messages')
    .select('*, contact:contacts(id, name, phone)', { count: 'exact' })
    .eq('campaign_id', campaign_id)

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  const from = (page - 1) * pageSize
  query = query.order('queued_at', { ascending: true }).range(from, from + pageSize - 1)

  const { data, count, error } = await query
  if (error) throw error

  return { data: (data ?? []) as MessageRow[], total: count ?? 0 }
}

export async function registerConversion(params: {
  company_id: string
  campaign_id: string
  contact_id: string
  revenue_amount: number
  notes?: string
}): Promise<void> {
  const sb = getSupabase()

  await Promise.all([
    sb.from('conversions').insert({
      company_id: params.company_id,
      campaign_id: params.campaign_id,
      contact_id: params.contact_id,
      revenue_amount: params.revenue_amount,
      notes: params.notes,
    }),
    sb.from('contacts')
      .update({ status: 'reactivated', updated_at: new Date().toISOString() })
      .eq('id', params.contact_id)
      .eq('company_id', params.company_id),
  ])
}
