import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStatus, getQRCode, decryptToken } from '@/lib/zapi'

export async function GET(req: NextRequest) {
  try {
    const company_id = req.nextUrl.searchParams.get('company_id')
    if (!company_id) {
      return NextResponse.json({ error: 'company_id required' }, { status: 400 })
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: integration } = await sb
      .from('company_integrations')
      .select('zapi_instance_id, zapi_token, zapi_status')
      .eq('company_id', company_id)
      .single()

    if (!integration?.zapi_instance_id || !integration?.zapi_token) {
      return NextResponse.json({ connected: false, configured: false })
    }

    const token = decryptToken(integration.zapi_token)
    const status = await getStatus(integration.zapi_instance_id, token)

    let qrcode: string | null = null
    if (!status.connected) {
      qrcode = await getQRCode(integration.zapi_instance_id, token)
    }

    // Update status in DB
    await sb.from('company_integrations')
      .update({
        zapi_status: status.connected ? 'connected' : 'disconnected',
        zapi_phone: status.phone ?? null,
        last_sync_at: new Date().toISOString(),
      })
      .eq('company_id', company_id)

    return NextResponse.json({ connected: status.connected, phone: status.phone, qrcode, configured: true })
  } catch (err) {
    console.error('[whatsapp/status]', err)
    return NextResponse.json({ error: 'Erro ao verificar status' }, { status: 500 })
  }
}
