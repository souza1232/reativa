import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enqueueMessage } from '@/lib/queue'
import { decryptToken } from '@/lib/zapi'

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
    if (campaign.status !== 'paused') return NextResponse.json({ error: 'Campanha não está pausada' }, { status: 422 })

    // Re-enqueue messages still queued
    const { data: integration } = await sb
      .from('company_integrations')
      .select('zapi_instance_id, zapi_token')
      .eq('company_id', company_id)
      .single()

    const { data: pendingMsgs } = await sb
      .from('messages')
      .select('id, phone, message_text')
      .eq('campaign_id', campaign_id)
      .eq('status', 'queued')

    if (integration?.zapi_instance_id && integration?.zapi_token) {
      const token = decryptToken(integration.zapi_token)
      for (const msg of pendingMsgs ?? []) {
        await enqueueMessage({
          messageId: msg.id,
          phone: msg.phone,
          text: msg.message_text,
          instanceId: integration.zapi_instance_id,
          token,
          companyId: company_id,
          campaignId: campaign_id,
        })
      }
    }

    await sb.from('campaigns').update({ status: 'running' }).eq('id', campaign_id)

    return NextResponse.json({ resumed: true, requeued: pendingMsgs?.length ?? 0 })
  } catch (err) {
    console.error('[campaign/resume]', err)
    return NextResponse.json({ error: 'Erro ao retomar campanha' }, { status: 500 })
  }
}
