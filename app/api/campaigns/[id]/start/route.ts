import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enqueueMessage, checkRateLimit } from '@/lib/queue'
import { decryptToken } from '@/lib/zapi'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaign_id } = await params
    const { company_id } = await req.json()

    if (!company_id) return NextResponse.json({ error: 'company_id required' }, { status: 400 })

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get campaign
    const { data: campaign } = await sb
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .eq('company_id', company_id)
      .single()

    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    if (!['draft', 'scheduled', 'paused'].includes(campaign.status)) {
      return NextResponse.json({ error: 'Campanha já está em andamento ou finalizada' }, { status: 422 })
    }

    // Get company plan for rate limiting
    const { data: company } = await sb.from('companies').select('plan').eq('id', company_id).single()
    const rateCheck = await checkRateLimit(company_id, company?.plan ?? 'starter')
    if (!rateCheck.allowed) {
      return NextResponse.json({
        error: `Limite de mensagens atingido (${rateCheck.used}/${rateCheck.limit}). Faça upgrade do plano.`,
      }, { status: 429 })
    }

    // Get WhatsApp integration
    const { data: integration } = await sb
      .from('company_integrations')
      .select('zapi_instance_id, zapi_token')
      .eq('company_id', company_id)
      .single()

    if (!integration?.zapi_instance_id || !integration?.zapi_token) {
      return NextResponse.json({ error: 'WhatsApp não configurado. Acesse Configurações.' }, { status: 422 })
    }

    const decryptedToken = decryptToken(integration.zapi_token)

    // Get eligible contacts
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - campaign.segment_days)

    const { data: contacts } = await sb
      .from('contacts')
      .select('id, name, phone')
      .eq('company_id', company_id)
      .eq('status', 'inactive')
      .lte('last_interaction_date', cutoffDate.toISOString().split('T')[0])

    if (!contacts?.length) {
      return NextResponse.json({ error: 'Nenhum contato elegível para esta campanha' }, { status: 422 })
    }

    // Create message records + enqueue jobs
    const messagesInsert = contacts.map(c => ({
      campaign_id,
      contact_id: c.id,
      company_id,
      phone: c.phone,
      message_text: campaign.message_template
        .replace(/\{\{nome\}\}/gi, c.name.split(' ')[0])
        .replace(/\{\{dias_inativo\}\}/gi, String(campaign.segment_days)),
      status: 'queued',
    }))

    const { data: createdMsgs } = await sb.from('messages').insert(messagesInsert).select('id, phone, message_text')

    // Enqueue to BullMQ
    for (const msg of createdMsgs ?? []) {
      await enqueueMessage({
        messageId: msg.id,
        phone: msg.phone,
        text: msg.message_text,
        instanceId: integration.zapi_instance_id,
        token: decryptedToken,
        companyId: company_id,
        campaignId: campaign_id,
      })
    }

    // Update campaign status
    await sb.from('campaigns').update({
      status: 'running',
      total_contacts: contacts.length,
      started_at: new Date().toISOString(),
    }).eq('id', campaign_id)

    return NextResponse.json({ queued: createdMsgs?.length ?? 0 })
  } catch (err) {
    console.error('[campaign/start]', err)
    return NextResponse.json({ error: 'Erro ao iniciar campanha' }, { status: 500 })
  }
}
