import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTextMessage, decryptToken } from '@/lib/zapi'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, message, campaign_id, contact_id, company_id, message_id } = body

    if (!phone || !message || !company_id) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: integration } = await sb
      .from('company_integrations')
      .select('zapi_instance_id, zapi_token')
      .eq('company_id', company_id)
      .single()

    if (!integration?.zapi_instance_id || !integration?.zapi_token) {
      return NextResponse.json({ error: 'WhatsApp não configurado' }, { status: 422 })
    }

    const token = decryptToken(integration.zapi_token)
    const result = await sendTextMessage(integration.zapi_instance_id, token, phone, message)

    // Update message record
    if (message_id) {
      await sb.from('messages').update({
        status: 'sent',
        zapi_message_id: result.messageId,
        sent_at: new Date().toISOString(),
      }).eq('id', message_id)
    }

    // Increment company usage counter
    await sb.rpc('increment_messages_used', { p_company_id: company_id })

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Erro ao enviar mensagem'
    console.error('[whatsapp/send]', error)
    return NextResponse.json({ error }, { status: 500 })
  }
}
