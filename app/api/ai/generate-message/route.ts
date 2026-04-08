import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TONE_MAP: Record<string, string> = {
  amigavel: 'amigável e descontraído, use 1-2 emojis discretos',
  profissional: 'profissional e formal, sem emojis',
  urgente: 'urgente com senso de oferta limitada e escassez',
}

export async function POST(req: NextRequest) {
  try {
    const { segment, days_inactive, business_name, tone } = await req.json()

    if (!segment || !days_inactive) {
      return NextResponse.json({ error: 'segment e days_inactive são obrigatórios' }, { status: 400 })
    }

    const toneDesc = TONE_MAP[tone] ?? tone ?? 'amigável'

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `Você é especialista em retenção de clientes brasileiros.
Crie mensagens de reativação para WhatsApp que sejam naturais, humanizadas e não pareçam automáticas.
NUNCA comece com "Olá" ou "Oi" diretamente — varie a abertura.
Responda APENAS com JSON válido, sem markdown, sem explicações.`,
      messages: [{
        role: 'user',
        content: `Crie 3 mensagens DIFERENTES para reativar clientes de "${segment}" inativos há ${days_inactive} dias.
Negócio: ${business_name ?? segment}.
Tom: ${toneDesc}.
MÁXIMO 160 caracteres cada (contando espaços).
Use {{nome}} para o nome do cliente.
Cada mensagem deve ter uma abordagem diferente (ex: saudade, oferta, curiosidade).
Responda SOMENTE: { "messages": ["msg1", "msg2", "msg3"] }`,
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)

    if (!jsonMatch) throw new Error('Resposta inválida da IA')

    const parsed = JSON.parse(jsonMatch[0])
    const messages: string[] = (parsed.messages ?? []).map((m: string) => m.slice(0, 160))

    return NextResponse.json({ messages })
  } catch (err) {
    console.error('[ai/generate-message]', err)
    // Fallback suggestions
    return NextResponse.json({
      messages: [
        '{{nome}}, faz um tempinho que não te vemos por aqui! 😊 Que tal agendar uma visita? Temos novidades esperando por você.',
        'Oi {{nome}}! Notamos sua ausência e preparamos algo especial. Volte e aproveite condições exclusivas para clientes VIP como você!',
        '{{nome}}, sua última visita foi há um tempo. Não deixe para depois — entre em contato agora e garanta seu atendimento prioritário.',
      ],
    })
  }
}
