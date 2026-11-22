// Fender lip geometry and contact checks. Same coordinates as tireModel.js:
// mm, x lateral from the hub face (outboard positive), y up from the axle.
// The fender is part of the body, so camber doesn't tilt it.

import {
  FENDER_LIP_MM,
  FENDER_OUTER_MM,
  FENDER_ROLL_MM,
  FENDER_SHEET_MM,
  FENDER_SKIN_MM,
  MM_PER_IN,
} from './constants.js'
import { camberedFlangePolygons, camberedTirePolygon } from './tireModel.js'

// Far beyond any wheel or tire, for the contact zone's open sides.
const FAR_MM = 10000

/**
 * Outline of the bottom of the fender as a polygon. Unrolled, it's an L: the
 * skin plus a lip running inboard along the bottom. Rolled, the lip lies flat
 * against the inside of the skin, so the bottom of the skin is thicker.
 * `topMm` is where the drawn skin stops; it defaults to a short stub.
 */
export function fenderPolygon({ rideHeightIn, rolled }, topMm) {
  const y = rideHeightIn * MM_PER_IN
  const top = topMm ?? y + FENDER_SKIN_MM
  const outer = FENDER_OUTER_MM
  const skin = outer - FENDER_SHEET_MM
  const step = rolled
    ? [
        { x: skin, y: y + FENDER_LIP_MM },
        { x: skin - FENDER_ROLL_MM, y: y + FENDER_LIP_MM },
        { x: skin - FENDER_ROLL_MM, y },
      ]
    : [
        { x: skin, y: y + FENDER_SHEET_MM },
        { x: outer - FENDER_LIP_MM, y: y + FENDER_SHEET_MM },
        { x: outer - FENDER_LIP_MM, y },
      ]
  return [{ x: outer, y }, { x: outer, y: top }, { x: skin, y: top }, ...step]
}

/** SVG path for a polygon in screen space (y down). */
export function polygonPath(points) {
  return `${points.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(2)} ${(-p.y).toFixed(2)}`).join(' ')} Z`
}

const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
const onSegment = (p, a, b) =>
  Math.min(a.x, b.x) <= p.x && p.x <= Math.max(a.x, b.x) && Math.min(a.y, b.y) <= p.y && p.y <= Math.max(a.y, b.y)

function segmentsIntersect(a, b, c, d) {
  const d1 = cross(c, d, a)
  const d2 = cross(c, d, b)
  const d3 = cross(a, b, c)
  const d4 = cross(a, b, d)
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true
  return (
    (d1 === 0 && onSegment(a, c, d)) ||
    (d2 === 0 && onSegment(b, c, d)) ||
    (d3 === 0 && onSegment(c, a, b)) ||
    (d4 === 0 && onSegment(d, a, b))
  )
}

function pointInPolygon(p, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

const edges = (poly) => poly.map((p, i) => [p, poly[(i + 1) % poly.length]])

/** Whether two simple polygons overlap or touch. */
export function polygonsOverlap(a, b) {
  for (const [p, q] of edges(a)) {
    for (const [r, s] of edges(b)) if (segmentsIntersect(p, q, r, s)) return true
  }
  return pointInPolygon(a[0], b) || pointInPolygon(b[0], a)
}

/**
 * Where a wheel or tire would hit the body: at or above the bottom of the lip,
 * from the lip's inner edge outward. Above the lip inboard of the skin is the
 * wheel arch; anything reaching there passes through the lip. Anything
 * outboard of the skin above the lip is where the body itself is, since the
 * fender arches out over the wheel.
 */
export function contactZone({ rideHeightIn, rolled }) {
  const y = rideHeightIn * MM_PER_IN
  const inner = FENDER_OUTER_MM - (rolled ? FENDER_SHEET_MM + FENDER_ROLL_MM : FENDER_LIP_MM)
  return [
    { x: inner, y },
    { x: FAR_MM, y },
    { x: FAR_MM, y: FAR_MM },
    { x: inner, y: FAR_MM },
  ]
}

/** Which parts of a setup touch the fender: `{ tire, wheel }`. */
export function fenderContact(setup, fender) {
  const body = contactZone(fender)
  return {
    tire: polygonsOverlap(camberedTirePolygon(setup), body),
    wheel: camberedFlangePolygons(setup).some((f) => polygonsOverlap(f, body)),
  }
}

/** Warning messages for a setup's fender contact, if any. */
export function contactWarnings(contact) {
  const parts = [contact.tire && 'tire', contact.wheel && 'wheel'].filter(Boolean)
  if (!parts.length) return []
  const what = parts.length === 2 ? 'The tire and wheel hit' : `The ${parts[0]} hits`
  return [`Contact: ${what} the fender at this ride height.`]
}
