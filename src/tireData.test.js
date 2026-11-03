import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { COLUMNS, deriveStiffness, loadTires, parseCsv } from './tireData.js'

const header = COLUMNS.join(',')
const row = (overrides = {}) => {
  const base = {
    brand: 'Brand',
    model: 'Model',
    category: 'touring',
    width: '245',
    aspect: '40',
    rim: '18',
    section_width_in: '9.7',
    tread_width_in: '',
    overall_diameter_in: '25.7',
    measured_rim_in: '8.5',
    rim_min_in: '8',
    rim_max_in: '9.5',
    stiffness: '',
    source: 'test',
  }
  return COLUMNS.map((c) => overrides[c] ?? base[c]).join(',')
}

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, CRLF and blank lines', () => {
    const rows = parseCsv('a,b\r\n"x, y","say ""hi"""\r\n\r\nz,w\n')
    expect(rows.map((r) => r.fields)).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
      ['z', 'w'],
    ])
    expect(rows[2].line).toBe(4)
  })
})

describe('deriveStiffness', () => {
  it('starts from the category and adjusts for aspect ratio', () => {
    expect(deriveStiffness('touring', 55)).toBe('low')
    expect(deriveStiffness('touring', 35)).toBe('medium')
    expect(deriveStiffness('high-performance', 65)).toBe('low')
    expect(deriveStiffness('max-performance', 30)).toBe('high')
    expect(deriveStiffness('all-terrain', 70)).toBe('medium')
  })
})

describe('loadTires', () => {
  it('loads a valid row', () => {
    const [tire] = loadTires(`${header}\n${row()}`)
    expect(tire).toMatchObject({
      id: 'Brand Model 245/40R18',
      width: 245,
      sectionWidthIn: 9.7,
      treadWidthIn: null,
      stiffness: 'low',
      stiffnessEstimated: true,
    })
  })

  it('keeps a stiffness override', () => {
    const [tire] = loadTires(`${header}\n${row({ stiffness: 'High' })}`)
    expect(tire.stiffness).toBe('high')
    expect(tire.stiffnessEstimated).toBe(false)
  })

  it('reports every bad row with its line number', () => {
    const csv = `${header}\n${row({ width: 'abc' })}\n${row({ category: 'sporty' })}\n${row()}\n${row()}`
    expect(() => loadTires(csv)).toThrow(/line 2: width.*\n.*line 3: category.*\n.*line 5: duplicate of line 4/s)
  })

  it('requires both rim range columns', () => {
    expect(() => loadTires(`${header}\n${row({ rim_max_in: '' })}`)).toThrow(/both rim_min_in and rim_max_in/)
  })

  it('loads the real data file', () => {
    const csv = readFileSync(new URL('../data/tires.csv', import.meta.url), 'utf8')
    expect(loadTires(csv).length).toBeGreaterThan(0)
  })
})
