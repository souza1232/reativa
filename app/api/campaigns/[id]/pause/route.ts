import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { pauseCampaignJobs } from '@/lib/queue'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaign_id } = await params
    const { company_id } = await req.json()

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: campaign } = await sb
      .from('campaigns')
      .select('status')
      .eq('id', campaign_id)
      .eq('company_id', company_id)
      .single()

    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    if (campaign.status !== 'running') return NextResponse.json({ error: 'Campanha não está rodando' }, { status: 422 })

    await sb.from('campaigns').update({ status: 'paused' }).eq('id', campaign_id)
    await pauseCampaignJobs(campaign_id)

    return NextResponse.json({ paused: true })
  } catch (err) {
    console.error('[campaign/pause]', err)
    return NextResponse.json({ error: 'Erro ao pausar campanha' }, { status: 500 })
  }
}
