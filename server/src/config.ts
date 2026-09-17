/**
 * Everything that differs between one installation and the next, read once
 * from the environment.
 */

import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'

const DEV_SECRET_NOTE =
  'KARSA_SECRET tidak diisi: memakai rahasia sementara. Token jadi tidak berlaku setelah server dinyalakan ulang.'

function secret(): string {
  const value = process.env.KARSA_SECRET?.trim()
  if (value) return value
  if (process.env.NODE_ENV === 'production') {
    throw new Error('KARSA_SECRET wajib diisi di produksi: tanpa itu siapa pun bisa membuat token sendiri.')
  }
  console.warn(DEV_SECRET_NOTE)
  return randomBytes(32).toString('hex')
}

export interface ServerConfig {
  port: number
  dataFile: string
  staticDir: string
  /** Signs join tokens. Anyone who knows it can mint a token for any room. */
  secret: string
  /** How long a join token lasts: one teaching period (decided 17 September 2026). */
  tokenDays: number
}

export function readConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT ?? 3000),
    dataFile: resolve(process.env.KARSA_DATA ?? 'data/karsa.sqlite'),
    staticDir: resolve(process.env.KARSA_STATIC ?? '../dist'),
    secret: secret(),
    tokenDays: Number(process.env.KARSA_TOKEN_DAYS ?? 30),
  }
}
