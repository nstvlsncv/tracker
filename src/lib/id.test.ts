import { afterEach, describe, expect, it, vi } from 'vitest'
import { newId } from './id'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('newId', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('даёт UUID v4', () => {
    expect(newId()).toMatch(UUID_V4)
  })

  it('работает без crypto.randomUUID (страница открыта по http с другого устройства)', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) })
    const ids = new Set(Array.from({ length: 50 }, newId))
    for (const id of ids) expect(id).toMatch(UUID_V4)
    expect(ids.size).toBe(50)
  })
})
