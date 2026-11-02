import axios from 'axios'
import dns from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import type { LookupFunction } from 'node:net'

export class UnsafeUrlError extends Error {}

const BLOCKED_V4: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
]

function v4ToInt(ip: string) {
  return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0
}

function isPrivateV4(ip: string) {
  const n = v4ToInt(ip)
  return BLOCKED_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
    return (n & mask) === (v4ToInt(base) & mask)
  })
}

export function isPublicAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return !isPrivateV4(ip)
  if (!net.isIPv6(ip)) return false
  const lower = ip.toLowerCase()
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return !isPrivateV4(mapped[1])
  if (lower === '::' || lower === '::1') return false
  if (/^f[cd]/.test(lower)) return false // unique local fc00::/7
  if (/^fe[89ab]/.test(lower)) return false // link-local fe80::/10
  if (/^ff/.test(lower)) return false // multicast
  return true
}

function assertSafeHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, '')
  if (net.isIP(host) && !isPublicAddress(host)) throw new UnsafeUrlError('Nedozvoljena adresa')
  if (/^localhost$|\.localhost$|\.internal$|\.local$/i.test(host)) throw new UnsafeUrlError('Nedozvoljena adresa')
}

const safeLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '', 0)
    const list = addresses as dns.LookupAddress[]
    const unsafe = list.find(a => !isPublicAddress(a.address))
    if (unsafe || list.length === 0) return callback(new UnsafeUrlError('Nedozvoljena adresa'), '', 0)
    if ((options as dns.LookupOptions).all) return (callback as any)(null, list)
    callback(null, list[0].address, list[0].family)
  })
}

const httpAgent = new http.Agent({ lookup: safeLookup })
const httpsAgent = new https.Agent({ lookup: safeLookup })

const MAX_BYTES = 3 * 1024 * 1024

/** Fetches an external HTML page, refusing private/internal network targets at every hop. */
export async function fetchExternalHtml(rawUrl: string): Promise<string> {
  let url: URL
  try { url = new URL(rawUrl) } catch { throw new UnsafeUrlError('Nevažeći link') }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new UnsafeUrlError('Podržani su samo http/https linkovi')
  if (url.username || url.password) throw new UnsafeUrlError('Nevažeći link')
  assertSafeHost(url.hostname)

  const response = await axios.get<string>(url.toString(), {
    timeout: 8000,
    maxRedirects: 4,
    maxContentLength: MAX_BYTES,
    responseType: 'text',
    httpAgent,
    httpsAgent,
    proxy: false,
    beforeRedirect: (options: { hostname?: string; host?: string }) => {
      assertSafeHost(options.hostname || options.host || '')
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'hr-HR,hr;q=0.9,en;q=0.8',
    },
  })
  return response.data
}
