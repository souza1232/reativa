import type { Contact, Campaign, Message, Conversion, CampaignStats } from '@/types'

export const mockCompany = {
  id: 'company-1',
  name: 'Clínica Odonto Sorri',
  email: 'contato@odontosorri.com.br',
  phone: '(11) 99999-0001',
  segment: 'clinica' as const,
  plan: 'pro' as const,
  status: 'active' as const,
  created_at: '2024-01-15T10:00:00Z',
  trial_ends_at: '2024-01-29T10:00:00Z',
}

const firstNames = ['Ana','Carlos','Maria','João','Fernanda','Pedro','Juliana','Rafael','Camila','Lucas','Amanda','Bruno','Larissa','Diego','Patrícia','Rodrigo','Vanessa','Felipe','Daniela','Thiago','Beatriz','Gustavo','Natália','André','Priscila','Marcelo','Aline','Eduardo','Renata','Fábio']
const lastNames = ['Silva','Santos','Oliveira','Souza','Lima','Ferreira','Costa','Alves','Pereira','Rodrigues','Martins','Carvalho','Gomes','Ribeiro','Fernandes','Nascimento','Araújo','Melo','Barbosa','Vieira']

function randomName() {
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`
}

function randomPhone() {
  const ddd = ['11','21','31','41','51','61','71','81','85','91'][Math.floor(Math.random() * 10)]
  const num = Math.floor(Math.random() * 90000000) + 10000000
  return `(${ddd}) 9${String(num).slice(0,4)}-${String(num).slice(4)}`
}

function daysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

const statuses: Contact['status'][] = ['active', 'inactive', 'inactive', 'inactive', 'reactivated', 'lost']

export const mockContacts: Contact[] = Array.from({ length: 150 }, (_, i) => {
  const inactiveDays = [15, 35, 45, 65, 75, 95, 120, 150, 180, 200][Math.floor(Math.random() * 10)]
  const spent = Math.floor(Math.random() * 5000) + 200
  const visits = Math.floor(Math.random() * 20) + 1
  const status = inactiveDays < 30 ? 'active' : statuses[Math.floor(Math.random() * statuses.length)]

  return {
    id: `contact-${i + 1}`,
    company_id: 'company-1',
    name: randomName(),
    phone: randomPhone(),
    email: `contato${i + 1}@email.com`,
    last_purchase_date: daysAgo(inactiveDays),
    total_spent: spent,
    visit_count: visits,
    status,
    created_at: daysAgo(inactiveDays + Math.floor(Math.random() * 200)),
    updated_at: daysAgo(Math.floor(Math.random() * 30)),
  }
})

export const mockCampaigns: Campaign[] = [
  {
    id: 'campaign-1',
    company_id: 'company-1',
    name: 'Reativação Agosto — Inativos 90 dias',
    message_template: 'Olá {{nome}}! Sentimos sua falta na Clínica Odonto Sorri. Faz {{dias_inativo}} dias desde sua última visita. Que tal agendar uma consulta? Temos uma oferta especial para você! 😊',
    segment_filter: '90dias',
    status: 'finished',
    scheduled_at: daysAgo(45),
    created_at: daysAgo(50),
  },
  {
    id: 'campaign-2',
    company_id: 'company-1',
    name: 'Promoção de Inverno — Inativos 60 dias',
    message_template: 'Oi {{nome}}! Há {{dias_inativo}} dias você não visita a Odonto Sorri. Não deixe sua saúde bucal de lado! Agende agora com 20% de desconto na limpeza. 🦷',
    segment_filter: '60dias',
    status: 'running',
    scheduled_at: daysAgo(5),
    created_at: daysAgo(7),
  },
  {
    id: 'campaign-3',
    company_id: 'company-1',
    name: 'Clientes VIP inativos — 180 dias',
    message_template: 'Prezado(a) {{nome}}, notamos que faz {{dias_inativo}} dias desde sua última consulta conosco. Gostaríamos de oferecer um retorno especial com condições exclusivas para nossos clientes VIP.',
    segment_filter: '180dias',
    status: 'draft',
    scheduled_at: null,
    created_at: daysAgo(2),
  },
]

export const mockMessages: Message[] = (() => {
  const msgs: Message[] = []
  // Campaign 1 (finished) — 80 contacts
  const statuses1: Message['status'][] = ['delivered','delivered','read','read','read','replied','replied','failed']
  for (let i = 0; i < 80; i++) {
    const st = statuses1[Math.floor(Math.random() * statuses1.length)]
    msgs.push({
      id: `msg-1-${i}`,
      campaign_id: 'campaign-1',
      contact_id: `contact-${i + 1}`,
      company_id: 'company-1',
      message_text: mockCampaigns[0].message_template,
      status: st,
      sent_at: daysAgo(45),
      delivered_at: ['delivered','read','replied'].includes(st) ? daysAgo(45) : null,
      read_at: ['read','replied'].includes(st) ? daysAgo(44) : null,
      replied_at: st === 'replied' ? daysAgo(43) : null,
    })
  }
  // Campaign 2 (running) — 45 contacts
  const statuses2: Message['status'][] = ['sent','delivered','read','read','replied']
  for (let i = 0; i < 45; i++) {
    const st = statuses2[Math.floor(Math.random() * statuses2.length)]
    msgs.push({
      id: `msg-2-${i}`,
      campaign_id: 'campaign-2',
      contact_id: `contact-${i + 51}`,
      company_id: 'company-1',
      message_text: mockCampaigns[1].message_template,
      status: st,
      sent_at: daysAgo(5),
      delivered_at: ['delivered','read','replied'].includes(st) ? daysAgo(5) : null,
      read_at: ['read','replied'].includes(st) ? daysAgo(4) : null,
      replied_at: st === 'replied' ? daysAgo(3) : null,
    })
  }
  return msgs
})()

export const mockConversions: Conversion[] = [
  ...Array.from({ length: 14 }, (_, i) => ({
    id: `conv-1-${i}`,
    company_id: 'company-1',
    contact_id: `contact-${i + 1}`,
    campaign_id: 'campaign-1',
    revenue_amount: Math.floor(Math.random() * 800) + 200,
    converted_at: daysAgo(Math.floor(Math.random() * 30) + 10),
    notes: 'Agendou consulta após mensagem de reativação',
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `conv-2-${i}`,
    company_id: 'company-1',
    contact_id: `contact-${i + 51}`,
    campaign_id: 'campaign-2',
    revenue_amount: Math.floor(Math.random() * 600) + 150,
    converted_at: daysAgo(Math.floor(Math.random() * 4) + 1),
    notes: 'Voltou após campanha de inverno',
  })),
]

export function getMonthlyReactivations() {
  const months = ['Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar']
  return months.map((month, i) => ({
    month,
    reativacoes: [8, 12, 6, 15, 19, 14][i],
  }))
}

export function getMonthlyRevenue() {
  const months = ['Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar']
  return months.map((month, i) => ({
    month,
    receita: [4200, 6800, 3100, 8900, 11200, 7600][i],
  }))
}

export function getInactivityDistribution() {
  const active = mockContacts.filter(c => c.status === 'active').length
  const days30 = mockContacts.filter(c => {
    const days = Math.floor((Date.now() - new Date(c.last_purchase_date).getTime()) / 86400000)
    return days >= 30 && days < 60
  }).length
  const days60 = mockContacts.filter(c => {
    const days = Math.floor((Date.now() - new Date(c.last_purchase_date).getTime()) / 86400000)
    return days >= 60 && days < 90
  }).length
  const days90plus = mockContacts.filter(c => {
    const days = Math.floor((Date.now() - new Date(c.last_purchase_date).getTime()) / 86400000)
    return days >= 90
  }).length
  return [
    { name: 'Ativos', value: active, color: '#22C55E' },
    { name: '30–60 dias', value: days30, color: '#EAB308' },
    { name: '60–90 dias', value: days60, color: '#F97316' },
    { name: '+90 dias', value: days90plus, color: '#EF4444' },
  ]
}

export function getCampaignStats(campaignId: string): CampaignStats {
  const msgs = mockMessages.filter(m => m.campaign_id === campaignId)
  const convs = mockConversions.filter(c => c.campaign_id === campaignId)
  return {
    sent: msgs.length,
    delivered: msgs.filter(m => ['delivered','read','replied'].includes(m.status)).length,
    read: msgs.filter(m => ['read','replied'].includes(m.status)).length,
    replied: msgs.filter(m => m.status === 'replied').length,
    converted: convs.length,
    revenue: convs.reduce((acc, c) => acc + c.revenue_amount, 0),
  }
}

export function getHighValueInactiveContacts() {
  return mockContacts
    .filter(c => c.status === 'inactive')
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 5)
}

export function getDaysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}
