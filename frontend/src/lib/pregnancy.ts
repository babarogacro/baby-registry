// The usual pregnancy-app comparison, in produce you can actually find at a Croatian market.
const SIZES: Record<number, string> = {
  5: 'zrna sezama', 6: 'zrna leće', 7: 'borovnice', 8: 'maline', 9: 'trešnje', 10: 'suhe šljive', 11: 'smokve',
  12: 'limete', 13: 'breskve', 14: 'limuna', 15: 'jabuke', 16: 'avokada', 17: 'kruške', 18: 'paprike', 19: 'manga',
  20: 'banane', 21: 'mrkve', 22: 'klipa kukuruza', 23: 'grejpa', 24: 'glavice salate', 25: 'cvjetače', 26: 'brokule',
  27: 'male tikve', 28: 'patlidžana', 29: 'tikve', 30: 'kupusa', 31: 'kokosa', 32: 'male bundeve', 33: 'ananasa',
  34: 'dinje', 35: 'veće dinje', 36: 'salate rimske', 37: 'svežnja blitve', 38: 'poriluka', 39: 'male lubenice', 40: 'bundeve',
}

/** Rough week of pregnancy from the due date, or null if the date isn't in the coming 35 weeks. */
export function pregnancyStatus(dueDate: string | Date | undefined | null) {
  if (!dueDate) return null
  const weeksLeft = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (7 * 86_400_000))
  if (weeksLeft < 1 || weeksLeft > 35) return null
  const week = 40 - weeksLeft
  return { week, weeksLeft, size: SIZES[week] ?? null }
}
