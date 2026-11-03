import { describe, expect, it } from 'vitest'
import { buildSetup, compareSetups, estimatedMeasuredRim, estimatedSpecs, tireDimensions, tiresForSize, validateInputs } from './fitment.js'

const wheel = (width, diameter, offset, camber = 0) => ({ width, diameter, offset, camber })
const size = (width, aspect, rim) => ({ width, aspect, rim })

describe('validateInputs', () => {
  it('accepts a normal setup', () => {
    expect(validateInputs(wheel(8.5, 18, 35), size(245, 40, 18))).toEqual([])
  })

  it('rejects out-of-range camber', () => {
    expect(validateInputs(wheel(8.5, 18, 35, -12), size(245, 40, 18))[0]).toMatch(/Camber/)
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

  it('uses data when given and adjusts only section width for rim width', () => {
    const tire = { overallDiameterIn: 25.7, sectionWidthIn: 9.7, treadWidthIn: 8.6, measuredRimIn: 8.5 }
    const onMeasured = tireDimensions(size(245, 40, 18), tire, 8.5)
    const oneInchWider = tireDimensions(size(245, 40, 18), tire, 9.5)
    expect(onMeasured.sectionWidthMm).toBeCloseTo(9.7 * 25.4, 5)
    expect(oneInchWider.sectionWidthMm - onMeasured.sectionWidthMm).toBeCloseTo(0.4 * 25.4, 5)
    // Tread width is the data value on any wheel.
    expect(onMeasured.treadWidthMm).toBeCloseTo(8.6 * 25.4, 9)
    expect(oneInchWider.treadWidthMm).toBeCloseTo(8.6 * 25.4, 9)
    expect(onMeasured.estimated.section).toBeUndefined()
  })

  it('estimates the measuring rim', () => {
    expect(estimatedMeasuredRim(245, 40)).toBe(8)
    expect(estimatedMeasuredRim(265, 70)).toBe(7.5)
    // Matches the published 6.5" and 7.5" measuring rims for these sizes.
    expect(estimatedMeasuredRim(205, 50)).toBe(6.5)
    expect(estimatedMeasuredRim(225, 45)).toBe(7.5)
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

  it('matches the wheel lip at zero camber and moves the rim edges with camber', () => {
    expect(a.camber.rimOuter).toBeCloseTo(a.edges.wheelOuter, 9)
    expect(a.camber.rimInner).toBeCloseTo(a.edges.wheelInner, 9)
    const d = compareSetups(a, b)
    // Same as the hub-height lip change when neither setup has camber.
    expect(d.rimOuterMm).toBeCloseTo(d.wheelOuterMm, 9)
    expect(d.rimInnerMm).toBeCloseTo(d.wheelInnerMm, 9)

    const tilted = buildSetup(wheel(8.5, 18, 35, -2), size(245, 40, 18))
    const t = (-2 * Math.PI) / 180
    const flangeTop = a.rimRadiusMm + 17.5
    const barrelIn = a.rimRadiusMm - 8
    const lip = a.edges.wheelOuter
    // The lower corner of the outer flange sticks out furthest with negative camber.
    expect(tilted.camber.rimOuter).toBeCloseTo(
      Math.max(lip * Math.cos(t) + flangeTop * Math.sin(t), lip * Math.cos(t) + barrelIn * Math.sin(t)),
      9,
    )
    expect(compareSetups(a, tilted).rimInnerMm).toBeGreaterThan(0)
  })

  it('takes the tire rim diameter from the wheel', () => {
    const s = buildSetup(wheel(8, 17, 40), { width: 225, aspect: 45 })
    expect(s.size.rim).toBe(17)
    expect(s.dims.overallDiameterIn).toBeCloseTo(17 + (2 * 225 * 0.45) / 25.4, 5)
  })

  it('matches edges at hub height and at the top when camber is zero', () => {
    expect(a.camber.topOuter).toBeCloseTo(a.edges.outer, 0)
    expect(a.camber.topInner).toBeCloseTo(a.edges.inner, 0)
  })

  it('moves the top tread edge by camber about the hub', () => {
    const flat = buildSetup(wheel(8.5, 18, 35), size(245, 40, 18))
    const tilted = buildSetup(wheel(8.5, 18, 35, -2), size(245, 40, 18))
    const r = flat.outerRadiusMm
    const x = flat.centerMm + flat.dims.treadWidthMm / 2
    const t = (-2 * Math.PI) / 180
    expect(tilted.camber.treadOuter).toBeCloseTo(x * Math.cos(t) + r * Math.sin(t), 6)
    // About R × sin(2°) ≈ 11 mm in for a 25.7" tire.
    expect(flat.camber.treadOuter - tilted.camber.treadOuter).toBeCloseTo(11.4, 0)
    const d = compareSetups(flat, tilted)
    expect(d.treadOuterMm).toBeLessThan(0)
    expect(d.treadInnerMm).toBeGreaterThan(0)
    expect(d.camberDeg).toBe(-2)
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

describe('estimatedSpecs', () => {
  it('lists specs that came from the size', () => {
    const generic = buildSetup(wheel(7, 16, 45), size(205, 50, 16))
    expect(estimatedSpecs(generic)).toEqual([
      'overall diameter',
      'section width',
      'tread width',
      'measuring rim',
      'approved rim range',
      'weight (unknown)',
    ])
  })

  it('is empty when the tire has every spec', () => {
    const tire = {
      width: 205,
      aspect: 50,
      rim: 16,
      sectionWidthIn: 8.4,
      treadWidthIn: 6.7,
      overallDiameterIn: 24.1,
      measuredRimIn: 6.5,
      rimMinIn: 5.5,
      rimMaxIn: 7.5,
      weightLb: 19,
    }
    expect(estimatedSpecs(buildSetup(wheel(7, 16, 45), size(205, 50, 16), tire))).toEqual([])
  })
})
