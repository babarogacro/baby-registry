import type { Priority } from '@/types'

export const PRIORITIES: { value: Priority; label: string; hint: string }[] = [
  { value: 'HIGH', label: 'Najviše treba', hint: 'Sigurno nam treba' },
  { value: 'MEDIUM', label: 'Bilo bi lijepo', hint: 'Dobro će doći' },
  { value: 'LOW', label: 'Luksuz', hint: 'Ako netko baš želi' },
]

export const PRIORITY_ORDER: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }

export const priorityLabel = (priority: Priority) => PRIORITIES.find(p => p.value === priority)!.label
