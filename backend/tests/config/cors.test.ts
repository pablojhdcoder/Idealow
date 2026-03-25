import { describe, expect, it } from 'vitest'
import { parseCorsOrigins } from '../../src/config'

describe('parseCorsOrigins', () => {
  it('usa localhost por defecto si la cadena está vacía', () => {
    expect(parseCorsOrigins(undefined)).toEqual(['http://localhost:3000'])
    expect(parseCorsOrigins('')).toEqual(['http://localhost:3000'])
    expect(parseCorsOrigins('  ')).toEqual(['http://localhost:3000'])
  })

  it('acepta varios orígenes separados por coma', () => {
    expect(
      parseCorsOrigins(
        'http://localhost:3000, https://preview.example.com ,https://app.example.com',
      ),
    ).toEqual([
      'http://localhost:3000',
      'https://preview.example.com',
      'https://app.example.com',
    ])
  })
})
