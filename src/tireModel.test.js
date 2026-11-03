import { describe, expect, it } from 'vitest'
import { buildSetup } from './fitment.js'
import { maxCurveX, sidewallCurve, tirePath, wheelRects } from './tireModel.js'

const bead = { x: 120, y: 246 }
const tread = { x: 105, y: 326 }

describe('sidewallCurve', () => {
  it('bulges out to the section width', () => {
    for (const stiffness of ['low', 'medium', 'high']) {
      const [p0, p1, , p3] = sidewallCurve({ bead, tread, maxX: 130, stiffness })
      expect(maxCurveX(p0.x, p1.x, p3.x)).toBeCloseTo(130, 1)
    }
  })

  it('puts control points nearer the ends for stiffer sidewalls', () => {
    const high = sidewallCurve({ bead, tread, maxX: 130, stiffness: 'high' })
    const low = sidewallCurve({ bead, tread, maxX: 130, stiffness: 'low' })
    expect(high[1].y).toBeLessThan(low[1].y)
    expect(high[2].y).toBeGreaterThan(low[2].y)
  })

  it('draws a straight sidewall when stretched', () => {
    const [p0, p1, p2, p3] = sidewallCurve({ bead, tread, maxX: 110, stiffness: 'low' })
    expect(p1.x).toBeCloseTo(p0.x + (p3.x - p0.x) / 3, 5)
    expect(p2.x).toBeCloseTo(p0.x + ((p3.x - p0.x) * 2) / 3, 5)
  })
})

describe('shapes', () => {
  const setup = buildSetup({ width: 8.5, diameter: 18, offset: 35 }, { width: 245, aspect: 40, rim: 18 })

  it('builds a closed tire path', () => {
    expect(tirePath(setup)).toMatch(/^M .* C .* L .* C .* Z$/)
  })

  it('builds wheel rectangles with positive sizes', () => {
    for (const r of wheelRects(setup)) {
      expect(r.w).toBeGreaterThan(0)
      expect(r.h).toBeGreaterThan(0)
    }
  })
})
