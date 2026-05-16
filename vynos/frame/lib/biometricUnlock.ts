import SettingStorage from "../../lib/storage/SettingStorage"

type BiometricRecord = {
  credentialId: string
  password: string
}

type EnrollBiometricOptions = {
  userLabel?: string
}

const storage = new SettingStorage()
const BIOMETRIC_RECORD_KEY = "biometric_unlock_record_v1"
const WEBAUTHN_TIMEOUT_MS = 45000

function toBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const decoded = atob(base64 + padding)
  const bytes = new Uint8Array(decoded.length)
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i)
  }
  return bytes
}

function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size)
  globalThis.crypto.getRandomValues(bytes)
  return bytes
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

async function getRecord(): Promise<BiometricRecord | null> {
  const item = await storage.get(BIOMETRIC_RECORD_KEY)
  if (!item?.value) {
    return null
  }
  try {
    return JSON.parse(item.value) as BiometricRecord
  } catch {
    return null
  }
}

async function setRecord(record: BiometricRecord): Promise<void> {
  await storage.save(BIOMETRIC_RECORD_KEY, JSON.stringify(record))
}

async function withWebAuthnTimeout<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  return new Promise<T>((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      controller.abort()
      reject(new Error("Fingerprint request timed out. Please try again."))
    }, WEBAUTHN_TIMEOUT_MS)

    fn(controller.signal)
      .then((result) => {
        globalThis.clearTimeout(timeoutId)
        resolve(result)
      })
      .catch((error) => {
        globalThis.clearTimeout(timeoutId)
        reject(error)
      })
  })
}

export function isBiometricUnlockSupported(): boolean {
  return !!(globalThis.PublicKeyCredential && navigator.credentials && globalThis.crypto)
}

export async function isBiometricUnlockConfigured(): Promise<boolean> {
  if (!isBiometricUnlockSupported()) {
    return false
  }
  const record = await getRecord()
  return !!(record?.credentialId && record.password)
}

function sanitizeUserLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^0x/, "")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 24)
}

function buildCredentialUserName(options?: EnrollBiometricOptions): string {
  const normalized = options?.userLabel ? sanitizeUserLabel(options.userLabel) : ""
  return normalized ? `iohtee-wallet-${normalized}` : "iohtee-wallet-local"
}

export async function enrollBiometricUnlock(password: string, options?: EnrollBiometricOptions): Promise<void> {
  if (!isBiometricUnlockSupported()) {
    throw new Error("Biometric unlock is not supported in this browser")
  }
  if (!password) {
    throw new Error("Password is required")
  }
  const credentialUserName = buildCredentialUserName(options)

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: toArrayBuffer(randomBytes(32)),
    rp: {
      id: window.location.hostname,
      name: "IohTee Wallet"
    },
    user: {
      id: toArrayBuffer(randomBytes(16)),
      name: credentialUserName,
      displayName: credentialUserName
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 }
    ],
    timeout: 60000,
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required"
    },
    attestation: "none"
  }

  const credential = await withWebAuthnTimeout((signal) => {
    return navigator.credentials.create({ publicKey, signal })
  })
  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("Could not create biometric credential")
  }

  const credentialId = toBase64Url(new Uint8Array(credential.rawId))
  await setRecord({ credentialId, password })
}

export async function disableBiometricUnlock(): Promise<void> {
  await storage.save(BIOMETRIC_RECORD_KEY, "")
}

export async function getPasswordByBiometric(): Promise<string> {
  if (!isBiometricUnlockSupported()) {
    throw new Error("Biometric unlock is not supported in this browser")
  }
  const record = await getRecord()
  if (!record) {
    throw new Error("Biometric unlock is not configured")
  }

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: toArrayBuffer(randomBytes(32)),
    allowCredentials: [
      {
        id: toArrayBuffer(fromBase64Url(record.credentialId)),
        type: "public-key"
      }
    ],
    timeout: 60000,
    userVerification: "required"
  }

  const assertion = await withWebAuthnTimeout((signal) => {
    return navigator.credentials.get({ publicKey, signal })
  })
  if (!(assertion instanceof PublicKeyCredential)) {
    throw new Error("Biometric authentication failed")
  }

  return record.password
}
