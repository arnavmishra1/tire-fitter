import { describe, expect, it } from 'vitest'
import { buildSetup, compareSetups, estimatedMeasuredRim, tireDimensions, tiresForSize, validateInputs } from './fitment.js'

const wheel = (width, diameter, offset) => ({ width, diameter, offset })
const size = (width, aspect, rim) => ({ width, aspect, rim })

describe('validateInputs', () => {
  it('accepts a normal setup', () => {
    expect(validateInputs(wheel(8.5, 18, 35), size(245, 40, 18))).toEqual([])
  })

  it('rejects a tire that does not match the wheel diameter', () => {
    expect(validateInputs(wheel(8.5, 18, 35), size(245, 40, 17))[0]).toMatch(/won't mount/)
  })

  it('rejects missing values', () => {
    expect(validateInputs(wheel('', 18, 35), size(245, 40, 18))).toHaveLength(1)
  })
})

describe('tireDimensions', () => {
  it('estimates diameter from the size', () => {
    const d = tireDimensions(size(245, 40, 18), null, 8.5)
    expect(d.overallDiameterIn).toBeCloseTo(18 + (2 * 98) / 25.4, 5)
    expect(d.estimated.diameter).toBe(true)
  })

  it('uses data when given and adjusts section width for rim width', () => {
    const tire = { overallDiameterIn: 25.7, sectionWidthIn: 9.7, treadWidthIn: 8.6, measuredRimIn: 8.5 }
    const onMeasured = tireDimensions(size(245, 40, 18), tire, 8.5)
    const oneInchWider = tireDimensions(size(245, 40, 18), tire, 9.5)
    expect(onMeasured.sectionWidthMm).toBeCloseTo(9.7 * 25.4, 5)
    expect(oneInchWider.sectionWidthMm - onMeasured.sectionWidthMm).toBeCloseTo(0.4 * 25.4, 5)
    expect(oneInchWider.treadWidthMm - onMeasured.treadWidthMm).toBeCloseTo(0.2 * 25.4, 5)
    expect(onMeasured.estimated.section).toBeUndefined()
  })

  it('estimates the measuring rim', () => {
    expect(estimatedMeasuredRim(245, 40)).toBe(8)
    expect(estimatedMeasuredRim(265, 70)).toBe(7.5)
  })
})

describe('buildSetup and compareSetups', () => {
  const a = buildSetup(wheel(8.5, 18, 35), size(245, 40, 18))
  const b = buildSetup(wheel(9.5, 18, 22), size(255, 35, 18))

  it('computes backspacing', () => {
    expect(a.backspacingIn).toBeCloseTo(9.5 / 2 + 35 / 25.4, 5)
  })

  it('computes wheel position changes', () => {
    const d = compareSetups(a, b)
    // 13 mm less offset plus 12.7 mm more half-width.
    expect(d.wheelOuterMm).toBeCloseTo(25.7, 5)
    // Inner lip moves 0.3 mm away from the suspension.
    expect(d.wheelInnerMm).toBeCloseTo(-0.3, 5)
  })

  it('computes speedometer error', () => {
    const d = compareSetups(a, b)
    expect(d.actualSpeedAt60).toBeCloseTo((60 * b.dims.overallDiameterIn) / a.dims.overallDiameterIn, 5)
  })

  it('warns when the wheel is outside the rim range', () => {
    const tire = { width: 245, aspect: 40, rim: 18, measuredRimIn: 8.5, rimMinIn: 8, rimMaxIn: 9.5 }
    expect(buildSetup(wheel(10.5, 18, 35), size(245, 40, 18), tire).warnings[0]).toMatch(/stretched/)
    expect(buildSetup(wheel(7, 18, 35), size(245, 40, 18), tire).warnings[0]).toMatch(/bulge/)
  })

  it('ignores a selected tire of a different size', () => {
    const tire = { width: 255, aspect: 35, rim: 18, sectionWidthIn: 10 }
    expect(buildSetup(wheel(8.5, 18, 35), size(245, 40, 18), tire).tire).toBeNull()
  })
})

describe('tiresForSize', () => {
  it('filters to the exact size and sorts by brand and model', () => {
    const tires = [
      { brand: 'B', model: 'Y', width: 245, aspect: 40, rim: 18 },
      { brand: 'A', model: 'Z', width: 245, aspect: 40, rim: 18 },
      { brand: 'A', model: 'Z', width: 255, aspect: 35, rim: 18 },
    ]
    expect(tiresForSize(tires, size(245, 40, 18)).map((t) => t.brand)).toEqual(['A', 'B'])
    expect(tiresForSize(tires, size(245, '', 18))).toEqual([])
  })
})
