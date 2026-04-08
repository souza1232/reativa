import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendTrialEndingEmail } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2025-03-31.basil' })

// Stripe webhooks always return 200
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET ?? '')
  } catch (err) {
    console.error('[stripe webhook] Invalid signature:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Process async — don't block Stripe
  handleStripeEvent(event).catch(err => console.error('[stripe webhook]', err))

  return NextResponse.json({ received: true })
}

async function handleStripeEvent(event: Stripe.Event) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const company_id = session.metadata?.company_id
    const plan = session.metadata?.plan

    if (!company_id || !plan) return

    await sb.from('companies').update({
      plan,
      status: 'active',
      stripe_subscription_id: session.subscription as string,
    }).eq('id', company_id)
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    await sb.from('companies')
      .update({ status: 'inactive' })
      .eq('stripe_subscription_id', sub.id)
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } }
    const subId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : typeof invoice.subscription === 'object' && invoice.subscription !== null
        ? invoice.subscription.id
        : null

    if (!subId) return

    const { data: company } = await sb
      .from('companies')
      .select('email, name')
      .eq('stripe_subscription_id', subId)
      .single()

    if (company) {
      await sb.from('companies')
        .update({ status: 'inactive' })
        .eq('stripe_subscription_id', subId)

      await sendTrialEndingEmail(company.email, company.name, 0)
    }
  }
}
