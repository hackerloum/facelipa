import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url, anonKey)

const FUNCTIONS_BASE = `${url.replace(/\/$/, '')}/functions/v1`

export function getFunctionsBase(): string {
  return FUNCTIONS_BASE
}

export async function fetchWithAuth(
  path: string,
  options: RequestInit & { userId?: string; merchantId?: string; merchantApiKey?: string } = {}
): Promise<Response> {
  const { userId, merchantId, merchantApiKey, ...rest } = options
  const headers = new Headers(rest.headers as HeadersInit)
  headers.set('Content-Type', 'application/json')
  if (userId) headers.set('x-user-id', userId)
  if (merchantId) headers.set('x-merchant-id', merchantId)
  if (merchantApiKey) headers.set('x-merchant-api-key', merchantApiKey!)
  return fetch(`${FUNCTIONS_BASE}${path}`, { ...rest, headers })
}
