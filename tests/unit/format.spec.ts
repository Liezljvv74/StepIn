import { describe, expect, it } from 'vitest'

import { toCents, toEuros } from '@/lib/format'

describe('admin price fields', () => {
  it('shows cents as euros with two decimals', () => {
    expect([toEuros(30010), toEuros(30000), toEuros(5), toEuros(null)]).toEqual(['300.10', '300.00', '0.05', ''])
  })

  it('reads euros typed with a full stop or a comma as whole cents', () => {
    expect([toCents('300.10'), toCents('300,1'), toCents(' 25 '), toCents('0.29'), toCents('')]).toEqual([30010, 30010, 2500, 29, null])
  })

  it('turns text that is not a number into NaN, which validation refuses', () => {
    expect(toCents('abc')).toBeNaN()
  })
})
