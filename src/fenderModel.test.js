import { describe, expect, it } from 'vitest'
import { contactWarnings, fenderContact, fenderPolygon, polygonsOverlap } from './fenderModel.js'
import { buildSetup } from './fitment.js'

const H = 14.5 * 25.4
const xs = (poly) => poly.map((p) => p.x)
const ys = (poly) => poly.map((p) => p.y)
const box = (x0, x1, y0, y1) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
]

describe('fenderPolygon', () => {
  it('puts the outer edge at 90 mm and the lip bottom at ride height', () => {
    const poly = fenderPolygon({ rideHeightIn: 14.5, rolled: false })
    expect(Math.max(...xs(poly))).toBe(90)
    expect(Math.min(...ys(poly))).toBeCloseTo(H, 5)
  })

  it('runs the unrolled lip 20 mm inboard', () => {
    expect(Math.min(...xs(fenderPolygon({ rideHeightIn: 14.5, rolled: false })))).toBe(70)
  })

  it('folds the rolled lip flat, adding 2 mm to the skin', () => {
    const poly = fenderPolygon({ rideHeightIn: 14.5, rolled: true })
    expect(Math.max(...xs(poly))).toBe(90)
    expect(Math.min(...xs(poly))).toBe(87)
  })

  it('draws the skin up to the given top', () => {
    expect(Math.max(...ys(fenderPolygon({ rideHeightIn: 12, rolled: false }, 500)))).toBe(500)
  })
})

describe('polygonsOverlap', () => {
  it('finds overlapping, touching, nested and separate shapes', () => {
    expect(polygonsOverlap(box(0, 10, 0, 10), box(5, 15, 5, 15))).toBe(true)
    expect(polygonsOverlap(box(0, 10, 0, 10), box(10, 20, 0, 10))).toBe(true)
    expect(polygonsOverlap(box(0, 10, 0, 10), box(2, 4, 2, 4))).toBe(true)
    expect(polygonsOverlap(box(0, 10, 0, 10), box(11, 20, 0, 10))).toBe(false)
  })

  it('only hits the lip when it is not rolled', () => {
    const nearLip = box(82, 86, H - 5, H + 0.5)
    expect(polygonsOverlap(nearLip, fenderPolygon({ rideHeightIn: 14.5, rolled: false }))).toBe(true)
    expect(polygonsOverlap(nearLip, fenderPolygon({ rideHeightIn: 14.5, rolled: true }))).toBe(false)
  })
})

describe('fenderContact', () => {
  const setup = (width, diameter, offset, tireWidth, aspect) =>
    buildSetup({ width, diameter, offset, camber: 0 }, { width: tireWidth, aspect })

  it('finds no contact for a tucked-in setup', () => {
    expect(fenderContact(setup(7, 16, 45, 205, 50), { rideHeightIn: 14.5, rolled: false })).toEqual({
      tire: false,
      wheel: false,
    })
  })

  it('finds tire contact when a wide tire sits low', () => {
    expect(fenderContact(setup(9, 17, 0, 255, 40), { rideHeightIn: 10, rolled: true })).toEqual({
      tire: true,
      wheel: false,
    })
  })

  it('finds wheel contact when the rim lip reaches the fender', () => {
    expect(fenderContact(setup(9, 19, 0, 255, 35), { rideHeightIn: 10, rolled: true }).wheel).toBe(true)
  })
})

describe('contactWarnings', () => {
  it('names what hits', () => {
    expect(contactWarnings({ tire: false, wheel: false })).toEqual([])
    expect(contactWarnings({ tire: true, wheel: false })[0]).toMatch(/^Contact: The tire hits/)
    expect(contactWarnings({ tire: true, wheel: true })[0]).toMatch(/tire and wheel hit/)
  })
})
