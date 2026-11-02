// Reservation ownership tokens live only in the gift-giver's browser.
export interface MyReservation {
  token: string
  name: string
  /** Set when this person is a contributor in a group buy. */
  contributorId?: string
}

const KEY = 'bebina-lista:my-reservations'

type Store = Record<string, MyReservation>

function read(): Store {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Store
  } catch {
    return {}
  }
}

function write(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {}
}

export function getMyReservations(): Store {
  return typeof window === 'undefined' ? {} : read()
}

export function rememberReservation(itemId: string, entry: MyReservation) {
  write({ ...read(), [itemId]: entry })
}

export function forgetReservation(itemId: string) {
  const store = read()
  delete store[itemId]
  write(store)
}

export function lastUsedName(): string {
  const entries = Object.values(read())
  return entries[entries.length - 1]?.name || ''
}
