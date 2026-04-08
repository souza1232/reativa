import { Queue, Worker, type Job } from 'bullmq'
import Redis from 'ioredis'

// Only instantiate if REDIS_URL is configured
const REDIS_URL = process.env.REDIS_URL

const PLAN_LIMITS: Record<string, number> = {
  starter: 500,
  pro: 3000,
  business: 999_999,
}

export interface MessageJob {
  messageId: string
  phone: string
  text: string
  instanceId: string
  token: string
  companyId: string
  campaignId: string
}

let _connection: Redis | null = null
let _queue: Queue | null = null

function getConnection(): Redis {
  if (!_connection) {
    if (!REDIS_URL) throw new Error('REDIS_URL not configured')
    _connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null })
  }
  return _connection
}

export function getMessageQueue(): Queue {
  if (!_queue) {
    _queue = new Queue('reativa-messages', {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    })
  }
  return _queue
}

export async function enqueueMessage(job: MessageJob): Promise<void> {
  const queue = getMessageQueue()
  await queue.add('send', job, {
    jobId: job.messageId, // dedupe by message ID
  })
}

export async function pauseCampaignJobs(campaignId: string): Promise<void> {
  const queue = getMessageQueue()
  const waiting = await queue.getWaiting()
  for (const job of waiting) {
    if ((job.data as MessageJob).campaignId === campaignId) {
      await job.remove()
    }
  }
}

// ── Worker (run in separate process / server action) ──────────
export function startWorker() {
  if (!REDIS_URL) {
    console.warn('[queue] REDIS_URL not set — worker not started')
    return null
  }

  const worker = new Worker<MessageJob>(
    'reativa-messages',
    async (job: Job<MessageJob>) => {
      const { messageId, phone, text, instanceId, token, companyId } = job.data

      // Random human-like delay: 3–8 seconds
      await new Promise(r => setTimeout(r, 3000 + Math.random() * 5000))

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, message: text, company_id: companyId, message_id: messageId }),
        }
      )

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Send failed: ${err}`)
      }

      console.log(`[worker] Sent message ${messageId} to ${phone}`)
    },
    {
      connection: getConnection(),
      concurrency: 5,
    }
  )

  worker.on('failed', async (job, err) => {
    if (job && (job.attemptsMade ?? 0) >= 3) {
      // Mark as failed in DB after exhausting retries
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const sb = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        await sb.from('messages').update({
          status: 'failed',
          error_message: err.message,
        }).eq('id', job.data.messageId)
      } catch (e) {
        console.error('[worker] Failed to update message status:', e)
      }
    }
  })

  return worker
}

// ── Rate limiter check ─────────────────────────────────────────
export async function checkRateLimit(
  companyId: string,
  plan: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data } = await sb
    .from('companies')
    .select('messages_used_month, plan')
    .eq('id', companyId)
    .single()

  const used = data?.messages_used_month ?? 0
  const effectivePlan = data?.plan ?? plan
  const limit = PLAN_LIMITS[effectivePlan] ?? 500

  return { allowed: used < limit, used, limit }
}
