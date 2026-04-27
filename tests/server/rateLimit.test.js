import { describe, it, expect, beforeEach, vi } from 'vitest'

const rateLimit = require('../../src/server/utils/rateLimit')

beforeEach(() => {
  rateLimit.reset('chave-teste')
  vi.useRealTimers()
})

describe('rateLimit', () => {
  it('permite até max requisições e bloqueia depois', () => {
    const opts = { max: 3, windowMs: 1000 }
    expect(rateLimit.consume('chave-teste', opts).allowed).toBe(true)
    expect(rateLimit.consume('chave-teste', opts).allowed).toBe(true)
    expect(rateLimit.consume('chave-teste', opts).allowed).toBe(true)
    const fourth = rateLimit.consume('chave-teste', opts)
    expect(fourth.allowed).toBe(false)
    expect(fourth.retryAfterMs).toBeGreaterThan(0)
  })

  it('reset limpa o bucket', () => {
    const opts = { max: 1, windowMs: 60_000 }
    rateLimit.consume('chave-teste', opts)
    expect(rateLimit.consume('chave-teste', opts).allowed).toBe(false)
    rateLimit.reset('chave-teste')
    expect(rateLimit.consume('chave-teste', opts).allowed).toBe(true)
  })

  it('libera após a janela expirar', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0))
    const opts = { max: 1, windowMs: 1000 }
    expect(rateLimit.consume('chave-teste', opts).allowed).toBe(true)
    expect(rateLimit.consume('chave-teste', opts).allowed).toBe(false)
    vi.advanceTimersByTime(1500)
    expect(rateLimit.consume('chave-teste', opts).allowed).toBe(true)
  })
})
