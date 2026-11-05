'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Our own analytics, without cookies or anything stored in the browser: the API turns each ping
 * into a daily-rotating anonymous id. See backend/src/routes/analytics.ts.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

type EventType = 'pageview' | 'engagement' | 'share' | 'search' | 'reserve_start'

interface Extra { r?: string; d?: number; s?: string; us?: string; um?: string; uc?: string }

export function track(type: EventType, extra: Extra = {}, pathOverride?: string) {
  if (typeof window === 'undefined') return
  const path = pathOverride ?? window.location.pathname
  if (path.startsWith('/admin')) return
  const body = JSON.stringify({ t: type, p: path, ...extra })
  try {
    // text/plain keeps sendBeacon a "simple" request, so no CORS preflight is needed.
    if (navigator.sendBeacon?.(`${API_URL}/events`, new Blob([body], { type: 'text/plain' }))) return
  } catch {}
  fetch(`${API_URL}/events`, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {})
}

export type OutboundSource = 'katalog' | 'lista' | 'moja-lista' | 'naslovnica' | 'blog' | 'dodaj'

/**
 * Every link to a shop goes through the API, which counts the click and adds the UTM tags the
 * shop's Google Analytics reads (utm_source=listica, utm_medium=referral).
 */
export function outboundUrl(productId: string, from: OutboundSource, listSlug?: string) {
  return `${API_URL}/go/${encodeURIComponent(productId)}?from=${from}${listSlug ? `&l=${encodeURIComponent(listSlug)}` : ''}`
}

/** Page views on every route change, plus how long the page was actually visible. */
export function usePageTracking() {
  const pathname = usePathname()
  const visibleMs = useRef(0)
  const visibleSince = useRef<number | null>(null)
  const firstView = useRef(true)
  // On a route change the URL has already moved on, so time is reported against this.
  const currentPath = useRef<string | null>(null)

  useEffect(() => {
    const flush = () => {
      if (visibleSince.current !== null) {
        visibleMs.current += Date.now() - visibleSince.current
        visibleSince.current = document.visibilityState === 'visible' ? Date.now() : null
      }
      if (visibleMs.current >= 1000) track('engagement', { d: Math.round(visibleMs.current) }, currentPath.current ?? undefined)
      visibleMs.current = 0
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
      else visibleSince.current = Date.now()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  useEffect(() => {
    const extra: Extra = {}
    // Where the visitor came from only matters for the first page of a visit.
    if (firstView.current) {
      firstView.current = false
      try {
        if (document.referrer && new URL(document.referrer).host !== window.location.host) extra.r = document.referrer
      } catch {}
      const params = new URLSearchParams(window.location.search)
      if (params.get('utm_source')) {
        extra.us = params.get('utm_source') ?? undefined
        extra.um = params.get('utm_medium') ?? undefined
        extra.uc = params.get('utm_campaign') ?? undefined
      }
    }
    currentPath.current = pathname
    track('pageview', extra, pathname)
    visibleMs.current = 0
    visibleSince.current = document.visibilityState === 'visible' ? Date.now() : null

    return () => {
      // Leaving this route: report the time it was on screen before the next page view.
      if (visibleSince.current !== null) visibleMs.current += Date.now() - visibleSince.current
      if (visibleMs.current >= 1000) track('engagement', { d: Math.round(visibleMs.current) }, pathname)
      visibleMs.current = 0
      visibleSince.current = null
    }
  }, [pathname])
}
