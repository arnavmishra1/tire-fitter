import { describe, expect, it } from 'vitest'
import { buildSetup } from './fitment.js'
import { bezierPoint, outlinePoints, rotatePoint, sidewallCurve, tirePath, treadLine, wheelRects } from './tireModel.js'

const bead = { x: 95, y: 220 }
const tread = { x: 85, y: 306 }
const LEVELS = ['low', 'medium', 'high']

const sample = (segs) => segs.flatMap((seg) => Array.from({ length: 101 }, (_, i) => bezierPoint(seg, i / 100)))

describe('sidewallCurve', () => {
  it('bulges out to exactly the section width', () => {
    for (const rounded of LEVELS) {
      const xs = sample(sidewallCurve({ bead, tread, maxX: 110, rounded })).map((p) => p.x)
      expect(Math.max(...xs)).toBeCloseTo(110, 6)
    }
  })

  it('never rises above the tread or past the tread edge at tread height', () => {
    for (const rounded of LEVELS) {
      for (const p of sample(sidewallCurve({ bead, tread, maxX: 110, rounded }))) {
        expect(p.y).toBeLessThanOrEqual(tread.y + 1e-9)
      }
    }
  })

  it('keeps the tread edge, shoulder and widest point the same for every rounded value', () => {
    const [low, medium, high] = LEVELS.map((rounded) => sidewallCurve({ bead, tread, maxX: 110, rounded }))
    for (const other of [medium, high]) {
      expect(other[1][3]).toEqual(low[1][3]) // tread edge
      expect(other[1][2]).toEqual(low[1][2]) // shoulder handle
      expect(other[0][3]).toEqual(low[0][3]) // widest point
    }
  })

  it('makes rounder sidewalls less upright at the widest point', () => {
    const low = sidewallCurve({ bead, tread, maxX: 110, rounded: 'low' })
    const high = sidewallCurve({ bead, tread, maxX: 110, rounded: 'high' })
    expect(low[0][2].y).toBeLessThan(high[0][2].y)
    expect(low[1][1].y).toBeGreaterThan(high[1][1].y)
  })

  it('draws a straight sidewall when stretched', () => {
    const segs = sidewallCurve({ bead, tread, maxX: 90, rounded: 'high' })
    expect(segs).toHaveLength(1)
    expect(segs[0][0]).toEqual(bead)
    expect(segs[0][3]).toEqual(tread)
  })
})

describe('shapes', () => {
  const setup = buildSetup({ width: 8.5, diameter: 18, offset: 35, camber: 0 }, { width: 245, aspect: 40 })

  it('draws the tread face at exactly the tread width', () => {
    const t = treadLine(setup)
    expect(t.x2 - t.x1).toBeCloseTo(setup.dims.treadWidthMm, 9)
    expect(t.y1).toBeCloseTo(-setup.outerRadiusMm, 9)
  })

  it('builds closed tire paths for the top and bottom', () => {
    expect(tirePath(setup)).toMatch(/^M .* C .* C .* L .* C .* C .* Z$/)
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

describe('shoulder', () => {
  it('bulges outside the line from tread edge to widest point, never pinching in', () => {
    // Wide bulge past a narrow tread, like a 205/50R16 on an 8" wheel.
    for (const rounded of LEVELS) {
      const [, upper] = sidewallCurve({ bead: { x: 108, y: 221 }, tread: { x: 85, y: 307 }, maxX: 114, rounded })
      const [mid, , , edge] = upper
      // Positive when a point is on the outer side of the chord.
      const side = (p) => (p.x - edge.x) * (mid.y - edge.y) - (p.y - edge.y) * (mid.x - edge.x)
      expect(side({ x: mid.x, y: edge.y })).toBeLessThan(0)
      for (let i = 1; i < 100; i++) expect(side(bezierPoint(upper, i / 100))).toBeLessThanOrEqual(1e-9)
    }
  })
})
