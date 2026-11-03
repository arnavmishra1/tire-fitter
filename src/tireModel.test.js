import { describe, expect, it } from 'vitest'
import { buildSetup } from './fitment.js'
import { maxCurveX, outlinePoints, rotatePoint, sidewallCurve, tirePath, wheelRects } from './tireModel.js'

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
  const setup = buildSetup({ width: 8.5, diameter: 18, offset: 35, camber: 0 }, { width: 245, aspect: 40 })

  it('builds closed tire paths for the top and bottom', () => {
    expect(tirePath(setup)).toMatch(/^M .* C .* L .* C .* Z$/)
    const firstY = (d) => Number(d.split(' ')[2])
    expect(firstY(tirePath(setup, -1))).toBeCloseTo(-firstY(tirePath(setup, 1)), 5)
  })

  it('covers the whole wheel, top to bottom', () => {
    const ys = outlinePoints(setup).map((p) => p.y)
    expect(Math.max(...ys)).toBeCloseTo(setup.outerRadiusMm, 5)
    expect(Math.min(...ys)).toBeCloseTo(-setup.outerRadiusMm, 5)
  })

  it('builds wheel rectangles with positive sizes', () => {
    for (const r of wheelRects(setup)) {
      expect(r.w).toBeGreaterThan(0)
      expect(r.h).toBeGreaterThan(0)
    }
  })
})

describe('rotatePoint', () => {
  it('tilts the top inboard and the bottom outboard for negative camber', () => {
    expect(rotatePoint({ x: 0, y: 300 }, -1).x).toBeCloseTo(300 * Math.sin((-1 * Math.PI) / 180), 9)
    expect(rotatePoint({ x: 0, y: -300 }, -1).x).toBeGreaterThan(0)
    expect(rotatePoint({ x: 50, y: 0 }, 0)).toEqual({ x: 50, y: 0 })
  })
})
