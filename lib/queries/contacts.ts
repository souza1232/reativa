import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export interface ContactFilters {
  status?: string
  min_days?: number
  max_days?: number
  search?: string
}

export interface ContactRow {
  id: string
  name: string
  phone: string
  email: string | null
  last_interaction_date: string | null
  total_spent: number
  visit_count: number
  status: string
  days_inactive: number
  created_at: string
}

export interface ImportResult {
  imported: number
  duplicates: number
  errors: number
}

export async function getContacts(
  company_id: string,
  filters: ContactFilters = {},
  page = 1,
  pageSize = 15
): Promise<{ data: ContactRow[]; total: number }> {
  const sb = getSupabase()

  let query = sb
    .from('contacts')
    .select('*', { count: 'exact' })
    .eq('company_id', company_id)

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
  }

  // Filter by inactivity days via date range
  if (filters.min_days) {
    const d = new Date()
    d.setDate(d.getDate() - filters.min_days)
    query = query.lte('last_interaction_date', d.toISOString().split('T')[0])
  }

  if (filters.max_days) {
    const d = new Date()
    d.setDate(d.getDate() - filters.max_days)
    query = query.gte('last_interaction_date', d.toISOString().split('T')[0])
  }

  const from = (page - 1) * pageSize
  query = query.order('last_interaction_date', { ascending: true }).range(from, from + pageSize - 1)

  const { data, count, error } = await query

  if (error) throw error

  const rows: ContactRow[] = (data ?? []).map(c => ({
    ...c,
    days_inactive: c.last_interaction_date
      ? Math.floor((Date.now() - new Date(c.last_interaction_date).getTime()) / 86400000)
      : 999,
  }))

  return { data: rows, total: count ?? 0 }
}

// Normalize Brazilian phone numbers to E.164 format
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')

  // Already has country code
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits
  }

  // Add country code
  if (digits.length === 10 || digits.length === 11) {
    return '55' + digits
  }

  return null // invalid
}

export interface RawContactCSV {
  name: string
  phone: string
  email?: string
  last_interaction_date?: string
  total_spent?: string | number
  visit_count?: string | number
}

export async function importContacts(
  company_id: string,
  rawContacts: RawContactCSV[],
  onProgress?: (done: number, total: number) => void
): Promise<ImportResult> {
  const sb = getSupabase()

  const BATCH_SIZE = 100
  let imported = 0
  let duplicates = 0
  let errors = 0

  // Normalize and validate
  const valid: object[] = []
  for (const c of rawContacts) {
    const phone = normalizePhone(c.phone)
    if (!phone) { errors++; continue }

    valid.push({
      company_id,
      name: c.name?.trim() || 'Sem nome',
      phone,
      email: c.email?.trim() || null,
      last_interaction_date: c.last_interaction_date || null,
      total_spent: Number(c.total_spent) || 0,
      visit_count: Number(c.visit_count) || 0,
      source: 'csv',
      status: 'inactive',
    })
  }

  // Process in batches
  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE)

    const { data, error } = await sb
      .from('contacts')
      .upsert(batch, {
        onConflict: 'company_id,phone',
        ignoreDuplicates: true,
      })
      .select('id')

    if (error) {
      errors += batch.length
    } else {
      imported += data?.length ?? 0
      duplicates += batch.length - (data?.length ?? 0)
    }

    onProgress?.(Math.min(i + BATCH_SIZE, valid.length), valid.length)

    // Yield to event loop between batches
    await new Promise(r => setTimeout(r, 10))
  }

  return { imported, duplicates, errors }
}
