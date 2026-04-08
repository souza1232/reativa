import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { segmento, dias, tom } = await req.json();

    if (!segmento || !dias || !tom) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const tomMap: Record<string, string> = {
      amigavel: "amigável e descontraído, use emojis discretamente",
      profissional: "profissional e formal, sem emojis",
      urgente: "com senso de urgência e oferta limitada",
    };

    const prompt = `Você é um especialista em marketing de reativação de clientes via WhatsApp.

Gere EXATAMENTE 3 mensagens de reativação diferentes para:
- Segmento: ${segmento}
- Clientes inativos há: ${dias} dias
- Tom: ${tomMap[tom] || tom}

Regras OBRIGATÓRIAS:
1. Cada mensagem deve ter NO MÁXIMO 160 caracteres
2. Use {{nome}} para o nome do cliente
3. Use {{dias_inativo}} para os dias de inatividade
4. Cada mensagem deve ser única e criativa
5. Inclua uma chamada para ação clara

Responda APENAS com um JSON válido neste formato exato:
{
  "mensagens": [
    "mensagem 1 aqui",
    "mensagem 2 aqui",
    "mensagem 3 aqui"
  ]
}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Resposta inválida da IA");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ mensagens: parsed.mensagens });
  } catch (error) {
    console.error("Erro ao gerar mensagem:", error);
    // Fallback suggestions if API fails
    return NextResponse.json({
      mensagens: [
        "Oi {{nome}}! 😊 Sentimos sua falta. Faz {{dias_inativo}} dias! Que tal voltar? Temos uma surpresa especial esperando por você.",
        "{{nome}}, há {{dias_inativo}} dias sem te ver. Sua saúde é nossa prioridade! Agende agora com condições especiais. 🌟",
        "Prezado(a) {{nome}}, notamos {{dias_inativo}} dias de ausência. Gostaríamos de recebê-lo(a) de volta com oferta exclusiva!",
      ],
    });
  }
}
