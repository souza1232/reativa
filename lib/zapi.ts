import crypto from 'crypto'

const ZAPI_BASE = 'https://api.z-api.io'

// ── Encryption ────────────────────────────────────────────────
const ALGORITHM = 'aes-256-cbc'

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY ?? ''
  if (!key || key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters')
  }
  return Buffer.from(key.slice(0, 32), 'utf8')
}

export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decryptToken(encrypted: string): string {
  const [ivHex, dataHex] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

// ── HTTP base ─────────────────────────────────────────────────
async function zapiRequest(
  instanceId: string,
  token: string,
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: object
): Promise<unknown> {
  const url = `${ZAPI_BASE}/instances/${instanceId}/token/${token}${endpoint}`

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'client-token': token,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Z-API ${method} ${endpoint} → ${res.status}: ${text}`)
  }

  return res.json()
}

// ── API functions ─────────────────────────────────────────────
export interface ZAPIStatus {
  connected: boolean
  phone?: string
  error?: string
}

export async function getStatus(instanceId: string, token: string): Promise<ZAPIStatus> {
  try {
    const data = await zapiRequest(instanceId, token, '/status') as {
      connected?: boolean
      phone?: string
    }
    return {
      connected: !!data?.connected,
      phone: data?.phone,
    }
  } catch {
    return { connected: false }
  }
}

export interface ZAPIQRCode {
  qrcode?: string
  value?: string
}

export async function getQRCode(instanceId: string, token: string): Promise<string | null> {
  try {
    const data = await zapiRequest(instanceId, token, '/qr-code/image') as { value?: string }
    return data?.value ?? null
  } catch {
    return null
  }
}

export interface SendMessageResult {
  zaapId: string
  messageId: string
}

export async function sendTextMessage(
  instanceId: string,
  token: string,
  phone: string,
  message: string
): Promise<SendMessageResult> {
  const data = await zapiRequest(instanceId, token, '/send-text', 'POST', {
    phone,
    message,
  }) as { zaapId: string; messageId: string }

  return {
    zaapId: data.zaapId,
    messageId: data.messageId,
  }
}
