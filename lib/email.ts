import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Reativa <noreply@reativa.app>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function html(body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0F172A;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#1E293B;border-radius:16px;overflow:hidden;border:1px solid #334155;">
    <div style="background:#22C55E;padding:24px 32px;">
      <h1 style="margin:0;color:#0A0A0A;font-size:24px;font-weight:800;">Reativa</h1>
    </div>
    <div style="padding:32px;color:#F8FAFC;">
      ${body}
    </div>
    <div style="padding:16px 32px;border-top:1px solid #334155;text-align:center;">
      <p style="margin:0;color:#475569;font-size:12px;">© 2025 Reativa. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>`
}

export async function sendWelcomeEmail(to: string, company_name: string): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Bem-vindo à Reativa, ${company_name}!`,
      html: html(`
        <h2 style="margin:0 0 16px;color:#22C55E;">Bem-vindo! 🎉</h2>
        <p style="color:#94A3B8;line-height:1.6;">
          Olá! Sua conta para <strong style="color:#F8FAFC;">${company_name}</strong> foi criada com sucesso.
          Você tem <strong style="color:#22C55E;">14 dias de trial gratuito</strong> para explorar tudo.
        </p>
        <a href="${APP_URL}/dashboard"
           style="display:inline-block;margin-top:24px;background:#22C55E;color:#0A0A0A;padding:14px 28px;border-radius:12px;font-weight:700;text-decoration:none;">
          Acessar meu dashboard →
        </a>
      `),
    })
  } catch (err) {
    console.error('[email/welcome]', err)
  }
}

export async function sendReplyNotification(
  to: string,
  contact_name: string,
  message_preview: string
): Promise<void> {
  try {
    const preview = message_preview.length > 120
      ? message_preview.slice(0, 120) + '...'
      : message_preview

    await resend.emails.send({
      from: FROM,
      to,
      subject: `${contact_name} respondeu sua mensagem!`,
      html: html(`
        <h2 style="margin:0 0 8px;color:#22C55E;">Nova resposta! 💬</h2>
        <p style="color:#94A3B8;margin:0 0 16px;">
          <strong style="color:#F8FAFC;">${contact_name}</strong> respondeu à sua campanha de reativação.
        </p>
        <div style="background:#0F172A;border:1px solid #334155;border-radius:12px;padding:16px;margin-bottom:24px;">
          <p style="margin:0;color:#94A3B8;font-size:13px;font-style:italic;">"${preview}"</p>
        </div>
        <a href="${APP_URL}/dashboard/campanhas"
           style="display:inline-block;background:#22C55E;color:#0A0A0A;padding:14px 28px;border-radius:12px;font-weight:700;text-decoration:none;">
          Ver no dashboard →
        </a>
      `),
    })
  } catch (err) {
    console.error('[email/reply]', err)
  }
}

export async function sendTrialEndingEmail(
  to: string,
  company_name: string,
  days_left: number
): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Seu trial expira em ${days_left} dia${days_left === 1 ? '' : 's'}`,
      html: html(`
        <h2 style="margin:0 0 8px;color:#EAB308;">⚠️ Trial expirando</h2>
        <p style="color:#94A3B8;line-height:1.6;">
          Olá, <strong style="color:#F8FAFC;">${company_name}</strong>!<br>
          Seu período de trial gratuito expira em <strong style="color:#EAB308;">${days_left} dia${days_left === 1 ? '' : 's'}</strong>.
          Para continuar usando a Reativa, escolha um plano.
        </p>
        <a href="${APP_URL}/dashboard/configuracoes"
           style="display:inline-block;margin-top:24px;background:#22C55E;color:#0A0A0A;padding:14px 28px;border-radius:12px;font-weight:700;text-decoration:none;">
          Escolher meu plano →
        </a>
      `),
    })
  } catch (err) {
    console.error('[email/trial]', err)
  }
}
