export type CompanySegment = 'clinica' | 'salao' | 'loja' | 'academia' | 'outro'
export type CompanyPlan = 'starter' | 'pro' | 'business'
export type CompanyStatus = 'active' | 'trial' | 'inactive'

export type ContactStatus = 'active' | 'inactive' | 'reactivated' | 'lost'
export type CampaignStatus = 'draft' | 'running' | 'paused' | 'finished'
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'replied' | 'failed'
export type InactivitySegment = '30dias' | '60dias' | '90dias' | '180dias'

export interface Company {
  id: string
  name: string
  email: string
  phone: string
  segment: CompanySegment
  plan: CompanyPlan
  status: CompanyStatus
  created_at: string
  trial_ends_at: string
}

export interface Contact {
  id: string
  company_id: string
  name: string
  phone: string
  email: string
  last_purchase_date: string
  total_spent: number
  visit_count: number
  status: ContactStatus
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  company_id: string
  name: string
  message_template: string
  segment_filter: InactivitySegment
  status: CampaignStatus
  scheduled_at: string | null
  created_at: string
}

export interface Message {
  id: string
  campaign_id: string
  contact_id: string
  company_id: string
  message_text: string
  status: MessageStatus
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
  replied_at: string | null
}

export interface Conversion {
  id: string
  company_id: string
  contact_id: string
  campaign_id: string
  revenue_amount: number
  converted_at: string
  notes: string
}

export interface CampaignStats {
  sent: number
  delivered: number
  read: number
  replied: number
  converted: number
  revenue: number
}

export interface DashboardMetrics {
  totalContacts: number
  inactiveContacts: number
  activeCampaigns: number
  reactivationRate: number
}
