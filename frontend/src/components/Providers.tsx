'use client'
import { useEffect, type ReactNode } from 'react'
import { LazyMotion, MotionConfig, domMax } from 'motion/react'

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    console.log('%cPsst. Beba spava.', 'font: 800 22px system-ui; color: #FF5A36')
    console.log('Ako ovo čitaš u tri ujutro: drži se. Ako samo gledaš kod: i ti se drži.')
  }, [])

  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
      <LazyMotion features={domMax} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  )
}
