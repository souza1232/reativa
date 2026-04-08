import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendReplyNotification } from '@/lib/email'

// Z-API Webhook — always returns 200, processes async
export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}))

  // Process in background — don't await
  processWebhook(payload).catch(err => console.error('[zapi webhook]', err))

  return NextResponse.json({ received: true })
}

async function processWebhook(payload: Record<string, unknown>) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const company_id = (payload.instanceId as string) ?? null

  // Log webhook
  await sb.from('webhook_logs').insert({
    company_id,
    source: 'zapi',
    payload,
    processed: false,
  })

  const type = payload.type as string

  // ── Message received from contact (reply)
  if (type === 'ReceivedCallback') {
    const phone = (payload.phone as string)?.replace(/\D/g, '')
    const text = payload.text as string

    if (!phone) return

    // Find latest message for this phone
    const { data: msg } = await sb
      .from('messages')
      .select('id, company_id, contact_id, contacts(name, company_id)')
      .eq('phone', phone)
      .order('queued_at', { ascending: false })
      .limit(1)
      .single()

    if (msg) {
      await sb.from('messages').update({
        status: 'replied',
        replied_at: new Date().toISOString(),
      }).eq('id', msg.id)

      // Notify company by email
      const { data: company } = await sb
        .from('companies')
        .select('email, name')
        .eq('id', msg.company_id)
        .single()

      if (company?.email) {
        const contactData = msg.contacts as unknown as { name: string } | null
        const contactName = contactData?.name ?? phone
        await sendReplyNotification(company.email, contactName, text ?? '(sem texto)')
      }
    }
  }

  // ── Delivery/read status update
  if (type === 'MessageStatusCallback') {
    const messageId = payload.messageId as string
    const status = payload.status as string

    if (!messageId) return

    const updates: Record<string, unknown> = {}

    if (status === 'DELIVERY_ACK') {
      updates.status = 'delivered'
      updates.delivered_at = new Date().toISOString()
    } else if (status === 'READ') {
      updates.status = 'read'
      updates.read_at = new Date().toISOString()
    }

    if (Object.keys(updates).length) {
      await sb.from('messages').update(updates).eq('zapi_message_id', messageId)
    }
  }

  // Mark as processed
  await sb.from('webhook_logs')
    .update({ processed: true })
    .eq('source', 'zapi')
    .eq('processed', false)
    .order('created_at', { ascending: false })
    .limit(1)
}
