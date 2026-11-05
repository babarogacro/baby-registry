import { rateLimit } from 'express-rate-limit'

const message = (text: string) => ({ error: text })

// Only failed attempts count, so many people behind one mobile-carrier IP aren't locked out.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Previše pokušaja. Pokušaj ponovno za nekoliko minuta.'),
})

export const publicWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Previše zahtjeva. Pokušaj ponovno za nekoliko minuta.'),
})

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Previše pretraga. Pričekaj trenutak.'),
})

export const facetsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Previše zahtjeva. Pričekaj trenutak.'),
})

// Page views and engagement pings: generous, it's only there to stop a flood.
export const eventsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 240,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Previše zahtjeva.'),
})

export const smartPasteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Previše zahtjeva. Pričekaj trenutak.'),
})
