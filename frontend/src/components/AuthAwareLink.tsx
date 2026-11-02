'use client'
import Link from 'next/link'
import { ReactNode, useEffect } from 'react'
import { useAuthStore } from '@/lib/store'

/** Sends signed-in users to their dashboard, everyone else to `guestHref`. */
export default function AuthAwareLink({ guestHref, className, children, signedInLabel }: {
  guestHref: string
  className?: string
  children: ReactNode
  signedInLabel?: ReactNode
}) {
  const { user, loadFromStorage } = useAuthStore()
  useEffect(() => { loadFromStorage() }, [loadFromStorage])
  return (
    <Link href={user ? '/moja-lista' : guestHref} className={className}>
      {user && signedInLabel ? signedInLabel : children}
    </Link>
  )
}
