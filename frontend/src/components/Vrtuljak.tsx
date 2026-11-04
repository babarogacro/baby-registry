'use client'
import Link from 'next/link'
import { useEffect, useImperativeHandle, useRef, type CSSProperties, type ReactNode, type Ref } from 'react'
import clsx from 'clsx'

export interface Hanger {
  key: string
  /** Where it hangs along the bar, 0 to 1. */
  x: number
  /** String length in px at full size. */
  drop: number
  /** Piece width in px at full size. */
  size: number
  href?: string
  label?: string
  /** Tailwind classes for the wrapper, e.g. to hide a piece on phones. */
  className?: string
  children: ReactNode
}

export interface VrtuljakHandle {
  /** Gives one piece a push, e.g. when a gift gets reserved. */
  nudge: (key: string, strength?: number) => void
}

interface Body {
  theta: number
  omega: number
  stiffness: number
  phase: number
  dragging: boolean
}

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value))
const DAMPING = 0.5
const DRAG_THRESHOLD = 6
const MAX_SWING = 1.25
const MAX_FLING = 4

/**
 * A crib mobile with real pendulum physics. Pieces can be pulled and let go, the page
 * scroll rocks them, and a soft breeze keeps them alive. Off screen it sleeps.
 */
export default function Vrtuljak({ hangers, heightClass, barInset = 4, stringVar, breeze = 0.14, ref, className }: {
  hangers: Hanger[]
  heightClass: string
  barInset?: number
  stringVar?: string
  breeze?: number
  ref?: Ref<VrtuljakHandle>
  className?: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const systemRef = useRef<HTMLDivElement>(null)
  const nodes = useRef<Map<string, HTMLDivElement>>(new Map())
  const bodies = useRef<Map<string, Body>>(new Map())
  const moved = useRef(false)

  useImperativeHandle(ref, () => ({
    nudge: (key, strength = 2.2) => {
      const body = bodies.current.get(key)
      if (body) body.omega += strength
    },
  }), [])

  const hangerKeys = hangers.map(h => h.key).join('|')

  useEffect(() => {
    const root = rootRef.current
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const measure = (key: string) => {
      const node = nodes.current.get(key)
      const piece = node?.querySelector<HTMLElement>('.vrt-piece')
      if (!piece || piece.offsetParent === null) return 12
      return 2600 / Math.max(60, piece.offsetTop + piece.offsetHeight / 2)
    }

    hangers.forEach((hanger, i) => {
      const known = bodies.current.get(hanger.key)
      if (known) { known.stiffness = measure(hanger.key); return }
      // Everything starts mid-swing, as if somebody just walked past the cot.
      bodies.current.set(hanger.key, {
        theta: (i % 2 ? -1 : 1) * (0.18 + (i % 3) * 0.09),
        omega: 0,
        stiffness: measure(hanger.key),
        phase: i * 1.7,
        dragging: false,
      })
    })

    let frame = 0
    let last = performance.now()
    let time = 0
    let visible = true

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      time += dt

      let torque = 0
      hangers.forEach(hanger => {
        const body = bodies.current.get(hanger.key)
        const node = nodes.current.get(hanger.key)
        if (!body || !node) return
        if (!body.dragging) {
          const wind = breeze * Math.sin(time * 0.75 + body.phase)
          body.omega += (-body.stiffness * Math.sin(body.theta) - DAMPING * body.omega + wind) * dt
          body.theta += body.omega * dt
          // A toy on a string swings, it doesn't loop the loop: a hard fling just bounces back.
          if (Math.abs(body.theta) > MAX_SWING) {
            body.theta = Math.sign(body.theta) * MAX_SWING
            body.omega *= -0.35
          }
        }
        node.style.transform = `rotate(${(-body.theta).toFixed(4)}rad)`
        torque += Math.sin(body.theta) * (hanger.x - 0.5)
      })
      // A piece pulled on one side tips the whole bar, like the real thing.
      if (systemRef.current) systemRef.current.style.transform = `rotate(${clamp(torque * 0.14, 0.12).toFixed(4)}rad)`
    }

    const start = () => {
      if (frame || !visible || document.hidden) return
      last = performance.now()
      frame = requestAnimationFrame(tick)
    }
    const stop = () => { cancelAnimationFrame(frame); frame = 0 }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start(); else stop()
    })
    observer.observe(root)

    const onVisibility = () => { if (document.hidden) stop(); else start() }
    document.addEventListener('visibilitychange', onVisibility)

    let lastY = window.scrollY
    const onScroll = () => {
      const dy = window.scrollY - lastY
      lastY = window.scrollY
      if (!visible) return
      let i = 0
      bodies.current.forEach(body => { body.omega += clamp(dy * 0.0035, 0.5) * (i++ % 2 ? 1 : -0.7) })
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    const onResize = () => bodies.current.forEach((body, key) => { body.stiffness = measure(key) })
    window.addEventListener('resize', onResize)

    start()
    return () => {
      stop()
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
    // Rebuilt only when the set of pieces changes, not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hangerKeys, breeze])

  const pointerHandlers = ({ key, x }: Hanger) => {
    const pivotOf = () => {
      const bar = nodes.current.get(key)!.parentElement!.getBoundingClientRect()
      return { x: bar.left + x * bar.width, y: bar.top }
    }
    let startX = 0
    let startY = 0
    let lastTheta = 0
    let lastTime = 0

    return {
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        moved.current = false
        startX = e.clientX
        startY = e.clientY
        const body = bodies.current.get(key)
        if (body) { body.dragging = true; lastTheta = body.theta; lastTime = performance.now() }
        e.currentTarget.setPointerCapture(e.pointerId)
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
        const body = bodies.current.get(key)
        if (!body?.dragging) return
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > DRAG_THRESHOLD) moved.current = true
        if (!moved.current) return
        const pivot = pivotOf()
        const theta = clamp(Math.atan2(e.clientX - pivot.x, Math.max(20, e.clientY - pivot.y)), MAX_SWING)
        const now = performance.now()
        const dt = Math.max(1, now - lastTime) / 1000
        body.omega = clamp((theta - lastTheta) / dt, MAX_FLING)
        body.theta = theta
        lastTheta = theta
        lastTime = now
      },
      onPointerUp: () => { const body = bodies.current.get(key); if (body) body.dragging = false },
      onPointerCancel: () => { const body = bodies.current.get(key); if (body) body.dragging = false },
      // Brushing past a piece with the mouse pushes it along.
      onPointerEnter: (e: React.PointerEvent<HTMLElement>) => {
        const body = bodies.current.get(key)
        if (body && !body.dragging && e.pointerType === 'mouse') body.omega += clamp(e.movementX * 0.05, 2.4)
      },
      onFocus: () => { const body = bodies.current.get(key); if (body) body.omega += 1.2 },
      onClick: (e: React.MouseEvent) => { if (moved.current) e.preventDefault() },
      onDragStart: (e: React.DragEvent) => e.preventDefault(),
    }
  }

  return (
    <div ref={rootRef} className={clsx('vrt', heightClass, className)} style={stringVar ? ({ '--vrt-line': stringVar } as CSSProperties) : undefined}>
      <div className="absolute left-1/2 top-0 h-8 w-0.5 -translate-x-1/2" style={{ background: 'rgb(var(--vrt-line, var(--coal)))' }} aria-hidden />
      <div ref={systemRef} className="absolute inset-x-0 top-8" style={{ transformOrigin: '50% -32px' }}>
        <div className="absolute h-2.5 rounded-full" style={{ left: `${barInset}%`, right: `${barInset}%`, top: -5, background: 'rgb(var(--vrt-line, var(--coal)))' }} aria-hidden />
        <div className="absolute inset-x-0 top-0 h-0">
          {hangers.map(hanger => {
            const style = { left: `${hanger.x * 100}%`, '--drop': hanger.drop, '--size': hanger.size } as CSSProperties
            const content = (
              <>
                {hanger.children}
                {hanger.label && (
                  <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-coal px-2.5 py-0.5 text-[11px] font-semibold text-white sm:text-xs">
                    {hanger.label}
                  </span>
                )}
              </>
            )
            return (
              <div key={hanger.key} ref={el => { if (el) nodes.current.set(hanger.key, el); else nodes.current.delete(hanger.key) }}
                className={clsx('vrt-hanger', hanger.className)} style={style}>
                <span className="vrt-string" aria-hidden />
                {hanger.href ? (
                  <Link href={hanger.href} className="vrt-piece" aria-label={hanger.label} draggable={false} {...pointerHandlers(hanger)}>{content}</Link>
                ) : (
                  <div className="vrt-piece" {...pointerHandlers(hanger)}>{content}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
