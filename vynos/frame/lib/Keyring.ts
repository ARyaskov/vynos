import * as passworder from "browser-passworder"
import { type Hex, isHex, keccak256 } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { scrypt } from "scrypt-js"

interface BufferLike {
  type: string
  data: number[]
}

function isBufferLike(something: BufferLike | unknown): something is BufferLike {
  return (something as BufferLike).type === "Buffer"
}

type KeystoreCrypto = {
  ciphertext: string
  cipher: string
  cipherparams: { iv: string }
  kdf: string
  kdfparams: {
    dklen: number
    salt: string
    n?: number
    r?: number
    p?: number
    c?: number
    prf?: string
  }
  mac: string
}

type KeystoreV3 = {
  version?: number
  crypto?: KeystoreCrypto
  Crypto?: KeystoreCrypto
}

type SerializedKeyringV2 = {
  version: 2
  salt: string
  iv: string
  ciphertext: string
  iterations: number
}

const KEYRING_V2_PREFIX = "v2:"
const KEYRING_PBKDF2_ITERATIONS = 250000

function normalizeHex(value: string): string {
  return value.startsWith("0x") ? value.slice(2) : value
}

function hexToBytes(value: string): Uint8Array {
  const normalized = normalizeHex(value)
  if (!/^[0-9a-fA-F]*$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error("Invalid hex string")
  }
  const bytes = new Uint8Array(normalized.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length)
  out.set(a, 0)
  out.set(b, a.length)
  return out
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(bytes.length)
  out.set(bytes)
  return out.buffer
}

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new Error("WebCrypto is unavailable")
  }
  return subtle
}

function getCrypto(): Crypto {
  const crypto = globalThis.crypto
  if (!crypto) {
    throw new Error("WebCrypto is unavailable")
  }
  return crypto
}

function decodeBase64(value: string): string {
  const atobFn = globalThis.atob
  if (!atobFn) {
    throw new Error("Base64 decode is unavailable")
  }
  return atobFn(value)
}

async function deriveAesGcmKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const subtle = getSubtle()
  const encoder = new TextEncoder()
  const baseKey = await subtle.importKey("raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveKey"])
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

function toBytes(value: Uint8Array | BufferLike | unknown): Uint8Array {
  if (isBufferLike(value)) {
    return Uint8Array.from(value.data)
  }
  if (value instanceof Uint8Array) {
    return Uint8Array.from(value)
  }
  if (Array.isArray(value)) {
    return Uint8Array.from(value)
  }
  throw new Error("Unsupported key format")
}

async function deriveKeyPBKDF2(password: string, salt: Uint8Array, iterations: number, dklen: number, prf?: string): Promise<Uint8Array> {
  const subtle = getSubtle()
  const encoder = new TextEncoder()
  const baseKey = await subtle.importKey("raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveBits"])
  const hash = prf === "hmac-sha512" ? "SHA-512" : "SHA-256"
  const bits = await subtle.deriveBits(
    {
      name: "PBKDF2",
      hash,
      salt: toArrayBuffer(salt),
      iterations
    },
    baseKey,
    dklen * 8
  )
  return new Uint8Array(bits)
}

async function deriveKeyScrypt(password: string, salt: Uint8Array, n: number, r: number, p: number, dklen: number): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  return scrypt(encoder.encode(password), salt, n, r, p, dklen)
}

export default class Keyring {
  wallet: {
    getPrivateKey: () => Uint8Array
    getAddressString: () => string
  }

  constructor(privateKey: Uint8Array) {
    const privateKeyBytes = Uint8Array.from(privateKey)
    const privateKeyHex = `0x${bytesToHex(privateKeyBytes)}` as Hex
    const account = privateKeyToAccount(privateKeyHex)
    this.wallet = {
      getPrivateKey: () => Uint8Array.from(privateKeyBytes),
      getAddressString: () => account.address
    }
  }

  static async fromV3(json: string, password: string): Promise<Keyring> {
    const parsed = JSON.parse(json) as KeystoreV3
    const crypto = parsed.crypto || parsed.Crypto
    if (!crypto) {
      throw new Error("Invalid keystore: missing crypto section")
    }

    if (crypto.cipher.toLowerCase() !== "aes-128-ctr") {
      throw new Error(`Unsupported cipher: ${crypto.cipher}`)
    }

    const ciphertext = hexToBytes(crypto.ciphertext)
    const iv = hexToBytes(crypto.cipherparams.iv)
    const salt = hexToBytes(crypto.kdfparams.salt)
    const dklen = Number(crypto.kdfparams.dklen)

    let derivedKey: Uint8Array
    if (crypto.kdf.toLowerCase() === "scrypt") {
      const n = Number(crypto.kdfparams.n)
      const r = Number(crypto.kdfparams.r)
      const p = Number(crypto.kdfparams.p)
      if (!n || !r || !p) {
        throw new Error("Invalid keystore: malformed scrypt parameters")
      }
      derivedKey = await deriveKeyScrypt(password, salt, n, r, p, dklen)
    } else if (crypto.kdf.toLowerCase() === "pbkdf2") {
      const iterations = Number(crypto.kdfparams.c)
      if (!iterations) {
        throw new Error("Invalid keystore: malformed pbkdf2 parameters")
      }
      derivedKey = await deriveKeyPBKDF2(password, salt, iterations, dklen, crypto.kdfparams.prf)
    } else {
      throw new Error(`Unsupported kdf: ${crypto.kdf}`)
    }

    const macPayload = concatBytes(derivedKey.slice(16, 32), ciphertext)
    const expectedMac = normalizeHex(crypto.mac).toLowerCase()
    const actualMac = normalizeHex(keccak256(`0x${bytesToHex(macPayload)}`)).toLowerCase()
    if (expectedMac !== actualMac) {
      throw new Error("Invalid keystore password or corrupted keystore")
    }

    const subtle = getSubtle()
    const decryptKey = await subtle.importKey("raw", toArrayBuffer(derivedKey.slice(0, 16)), { name: "AES-CTR" }, false, ["decrypt"])
    const privateKeyBuffer = await subtle.decrypt({ name: "AES-CTR", counter: toArrayBuffer(iv), length: 128 }, decryptKey, toArrayBuffer(ciphertext))
    const privateKey = new Uint8Array(privateKeyBuffer)
    if (privateKey.length !== 32) {
      throw new Error("Invalid private key length in keystore")
    }

    return new Keyring(privateKey)
  }

  static serialize(keyring: Keyring, password: string): Promise<string> {
    return (async () => {
      const privateKey = toBytes(keyring.wallet.getPrivateKey())
      const crypto = getCrypto()
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const key = await deriveAesGcmKey(password, salt, KEYRING_PBKDF2_ITERATIONS)
      const subtle = getSubtle()
      const encrypted = await subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, toArrayBuffer(privateKey))
      const payload: SerializedKeyringV2 = {
        version: 2,
        salt: bytesToHex(salt),
        iv: bytesToHex(iv),
        ciphertext: bytesToHex(new Uint8Array(encrypted)),
        iterations: KEYRING_PBKDF2_ITERATIONS
      }
      return `${KEYRING_V2_PREFIX}${JSON.stringify(payload)}`
    })()
  }

  static deserialize(str: string, password: string): Promise<Keyring> {
    if (str.startsWith(KEYRING_V2_PREFIX)) {
      return (async () => {
        const payload = JSON.parse(str.slice(KEYRING_V2_PREFIX.length)) as SerializedKeyringV2
        if (payload.version !== 2) {
          throw new Error("Unsupported keyring version")
        }
        const salt = hexToBytes(payload.salt)
        const iv = hexToBytes(payload.iv)
        const ciphertext = hexToBytes(payload.ciphertext)
        const key = await deriveAesGcmKey(password, salt, Number(payload.iterations) || KEYRING_PBKDF2_ITERATIONS)
        const subtle = getSubtle()
        const decrypted = await subtle.decrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, toArrayBuffer(ciphertext))
        return new Keyring(new Uint8Array(decrypted))
      })()
    }

    const unbase64 = decodeBase64(str)
    return passworder.decrypt(password, unbase64).then((privateKey: unknown) => {
      return new Keyring(toBytes(privateKey))
    })
  }

  static async isValidV3(json: string, password: string): Promise<boolean> {
    try {
      await Keyring.fromV3(json, password)
      return true
    } catch (e) {
      return false
    }
  }

  static isValidPrivateKey(key: Uint8Array): boolean {
    const hex = `0x${bytesToHex(key)}`
    return isHex(hex, { strict: true }) && key.length === 32
  }
}
