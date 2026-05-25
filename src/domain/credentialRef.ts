export type CredentialSourceKind =
  | 'none'
  | 'cli-managed'
  | 'environment'
  | 'os-credential-store'
  | 'tauri-secure-store'

export type CredentialRef = {
  providerId: string
  slotId: string
  source: Exclude<CredentialSourceKind, 'none'>
  displayName?: string
}

export type CredentialAvailability =
  | 'not-required'
  | 'missing'
  | 'available'
  | 'not-implemented'

export type ConnectorCredentialRequirement = {
  required: boolean
  source: CredentialSourceKind
  availability: CredentialAvailability
  hasCredentialRef: boolean
}

export function createCredentialRef(params: CredentialRef): CredentialRef {
  return {
    providerId: params.providerId,
    slotId: params.slotId,
    source: params.source,
    displayName: params.displayName,
  }
}

export function createCredentialRequirement(
  params?: Partial<ConnectorCredentialRequirement>,
): ConnectorCredentialRequirement {
  return {
    required: params?.required ?? false,
    source: params?.source ?? 'none',
    availability: params?.availability ?? 'not-required',
    hasCredentialRef: params?.hasCredentialRef ?? false,
  }
}
