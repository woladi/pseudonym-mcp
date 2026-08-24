import { createHash } from 'node:crypto'
import type { PatternRule } from '../types.js'

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/** Base58Check: the last four bytes are a double-SHA256 of everything before. */
function base58CheckValid(address: string): boolean {
  let num = 0n
  for (const char of address) {
    const index = BASE58.indexOf(char)
    if (index < 0) return false
    num = num * 58n + BigInt(index)
  }

  const bytes: number[] = []
  while (num > 0n) {
    bytes.unshift(Number(num % 256n))
    num /= 256n
  }
  // Every leading '1' encodes a zero byte.
  for (const char of address) {
    if (char !== '1') break
    bytes.unshift(0)
  }
  if (bytes.length !== 25) return false

  const payload = Buffer.from(bytes.slice(0, 21))
  const checksum = Buffer.from(bytes.slice(21))
  const hash = createHash('sha256').update(createHash('sha256').update(payload).digest()).digest()

  return hash.subarray(0, 4).equals(checksum)
}

/** Bech32 polymod over the SegWit address, per BIP-173. */
function bech32Valid(address: string): boolean {
  const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
  const lower = address.toLowerCase()
  const split = lower.lastIndexOf('1')
  if (split < 1 || split + 7 > lower.length) return false

  const hrp = lower.slice(0, split)
  const data: number[] = []
  for (const char of lower.slice(split + 1)) {
    const index = CHARSET.indexOf(char)
    if (index < 0) return false
    data.push(index)
  }

  const GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
  const polymod = (values: number[]): number => {
    let chk = 1
    for (const value of values) {
      const top = chk >>> 25
      chk = ((chk & 0x1ffffff) << 5) ^ value
      for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= GENERATORS[i]
    }
    return chk
  }

  const expanded = [
    ...[...hrp].map((c) => c.charCodeAt(0) >>> 5),
    0,
    ...[...hrp].map((c) => c.charCodeAt(0) & 31),
    ...data,
  ]
  const check = polymod(expanded)

  // 1 for bech32 (v0), 0x2bc830a3 for bech32m (v1+).
  return check === 1 || check === 0x2bc830a3
}

export function cryptoAddressValid(raw: string): boolean {
  const value = raw.trim()
  if (/^(?:bc1|tb1)[023456789acdefghjklmnpqrstuvwxyz]{11,71}$/i.test(value)) {
    return bech32Valid(value)
  }
  if (/^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(value)) {
    return base58CheckValid(value)
  }
  return false
}

export const cryptoWalletRule: PatternRule = {
  id: 'global.crypto-wallet',
  entityType: 'CRYPTO_WALLET',
  patterns: [
    { name: 'Bitcoin (base58)', regex: /\b[13][1-9A-HJ-NP-Za-km-z]{25,34}\b/g, score: 0.4 },
    {
      name: 'Bitcoin (bech32)',
      regex: /\b(?:bc1|tb1)[023456789acdefghjklmnpqrstuvwxyz]{11,71}\b/gi,
      score: 0.5,
    },
  ],
  locales: null,
  context: ['wallet', 'btc', 'bitcoin', 'crypto', 'portfel', 'adres'],
  description: 'Bitcoin wallet address, validated with Base58Check or bech32',
  validate: cryptoAddressValid,
  checksumMode: 'boost',
}

/** EIP-55: the case of each hex letter encodes a keccak hash bit. */
export const ethWalletRule: PatternRule = {
  id: 'global.eth-wallet',
  entityType: 'CRYPTO_WALLET',
  // Forty hex characters after 0x is distinctive on its own; verifying the
  // EIP-55 mixed-case checksum would need a keccak implementation, and an
  // all-lowercase address is valid anyway, so the shape carries this one.
  patterns: [{ name: 'Ethereum address', regex: /\b0x[a-fA-F0-9]{40}\b/g, score: 0.6 }],
  locales: null,
  context: ['wallet', 'eth', 'ethereum', 'erc20', 'crypto', 'portfel'],
  description: 'Ethereum-style wallet address (0x + 40 hex characters)',
}
