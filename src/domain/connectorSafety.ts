export const CONNECTOR_SENSITIVE_KEYWORDS = [
  'password',
  'token',
  'key',
  'secret',
  'apikey',
  'credential',
  'authorization',
  'bearer',
] as const

export type ConnectorSafeValue = string | number | boolean | null

export type ConnectorSafeRecord = Record<string, ConnectorSafeValue>

const REDACTED_TEXT = '[redacted]'

const credentialAssignmentPattern =
  /\b(password|token|secret|apiKey|apikey|credential|authorization)\b\s*[:=]\s*("[^"]+"|'[^']+'|[^\s,;}]+)/gi

const bearerPattern = /\bbearer\s+[a-z0-9._~+/=-]+/gi

export function containsConnectorSensitiveKeyword(value: string): boolean {
  const normalized = value.toLowerCase()
  return CONNECTOR_SENSITIVE_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

export function redactConnectorSensitiveText(value: string): string {
  return value
    .replace(bearerPattern, 'Bearer [redacted]')
    .replace(credentialAssignmentPattern, '$1=[redacted]')
}

export function sanitizeConnectorText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length === 0) {
    return null
  }

  const redacted = redactConnectorSensitiveText(normalized)
  return containsConnectorSensitiveKeyword(redacted) ? REDACTED_TEXT : redacted
}

export function sanitizeConnectorSafeRecord(
  record: Record<string, unknown> | null | undefined,
): ConnectorSafeRecord | undefined {
  if (!record) {
    return undefined
  }

  const safe: ConnectorSafeRecord = {}
  for (const [key, value] of Object.entries(record)) {
    if (containsConnectorSensitiveKeyword(key)) {
      safe[key] = REDACTED_TEXT
      continue
    }

    if (typeof value === 'string') {
      safe[key] = sanitizeConnectorText(value) ?? ''
      continue
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      safe[key] = value
      continue
    }

    if (typeof value === 'boolean' || value === null) {
      safe[key] = value
      continue
    }

    safe[key] = '[non-serializable]'
  }

  return safe
}
