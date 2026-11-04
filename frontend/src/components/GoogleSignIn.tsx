'use client'
import { useEffect, useId, useRef } from 'react'

declare global {
  interface Window { google?: any }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

function loadScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    const script = existing ?? Object.assign(document.createElement('script'), { src: SCRIPT_SRC, async: true })
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Google script failed')), { once: true })
    if (!existing) document.head.appendChild(script)
  })
}

export const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

export default function GoogleSignIn({ text, onCredential }: {
  text: 'signin_with' | 'signup_with'
  onCredential: (credential: string) => void
}) {
  const id = useId()
  const callbackRef = useRef(onCredential)
  callbackRef.current = onCredential

  useEffect(() => {
    if (!googleClientId) return
    let cancelled = false
    loadScript().then(() => {
      const el = document.getElementById(id)
      if (cancelled || !el) return
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response: { credential: string }) => callbackRef.current(response.credential),
      })
      window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width: el.clientWidth || 320, text, locale: 'hr' })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [id, text])

  if (!googleClientId) return null

  return (
    <>
      <div id={id} className="w-full mb-4 min-h-[44px]" />
      <div className="mb-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-line/15" />
        <span className="text-[13px] font-medium text-muted">ili s emailom</span>
        <div className="h-px flex-1 bg-line/15" />
      </div>
    </>
  )
}
