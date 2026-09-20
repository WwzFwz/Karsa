/**
 * Calls to the room service (server/). Every failure becomes a sentence a person
 * can act on, never a status code.
 */

import { apiUrl } from '../../core/config'
import { tr } from '../../core/i18n'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export async function api<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  options: { body?: unknown; token?: string | null } = {},
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiUrl()}${path}`, {
      method,
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError(
      0,
      tr(
        'Server tidak terjangkau. Periksa sambungan, lalu coba lagi.',
        'The server is unreachable. Check the connection, then try again.',
      ),
    )
  }
  const text = await response.text()
  const data = text ? (JSON.parse(text) as unknown) : null
  if (!response.ok) {
    const message = (data as { message?: string | string[] } | null)?.message
    throw new ApiError(response.status, Array.isArray(message) ? message.join(' ') : message ?? tr('Permintaan gagal.', 'The request failed.'))
  }
  return data as T
}
