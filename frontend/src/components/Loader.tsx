import clsx from 'clsx'

/** Three toy shapes on strings, swinging out of step. */
export default function Loader({ label = 'Samo malo.', className }: { label?: string; className?: string }) {
  const pieces = [
    { cls: 'bg-tomato rounded-full', delay: '0s', drop: 28 },
    { cls: 'bg-cobalt rounded-t-full', delay: '-0.8s', drop: 44 },
    { cls: 'bg-mint rounded-lg', delay: '-1.6s', drop: 22 },
  ]
  return (
    <div className={clsx('flex flex-col items-center gap-4', className)} role="status">
      <div className="relative h-24 w-28" aria-hidden>
        <span className="absolute inset-x-0 top-0 h-1.5 rounded-full bg-ink" />
        {pieces.map((p, i) => (
          <span key={i} className="swing absolute top-1 w-0" style={{ left: `${18 + i * 32}%`, animationDelay: p.delay }}>
            <span className="absolute left-0 w-0.5 -translate-x-1/2 bg-ink" style={{ height: p.drop }} />
            <span className={clsx('absolute h-6 w-6 -translate-x-1/2', p.cls)} style={{ top: p.drop }} />
          </span>
        ))}
      </div>
      <p className="font-medium text-muted">{label}</p>
    </div>
  )
}
