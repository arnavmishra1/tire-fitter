// Cross-section shapes. Coordinates are mm: x is lateral from the hub face
// (outboard positive), y is vertical from the axle (up positive). The wheel
// and tire are tilted by camber about the axle at the hub face, (0, 0).

import { BARREL_MM, DISC_MM, FLANGE_HEIGHT_MM, FLANGE_WIDTH_MM } from './constants.js'

// Where the sidewall curve's control points sit, by how rounded the tire is,
// as a share of sidewall height measured from the bead [a] and from the
// tread [b]. Points near the ends give a flat, upright sidewall; points near
// the middle give a round one.
export const SIDEWALL_SHAPE = {
  low: [0.1, 0.1],
  medium: [0.25, 0.2],
  high: [0.45, 0.35],
}

function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
}

export function maxCurveX(p0x, cx, p3x) {
  let max = -Infinity
  for (let i = 0; i <= 64; i++) max = Math.max(max, cubic(p0x, cx, cx, p3x, i / 64))
  return max
}

/**
 * Control points for one sidewall, from bead to tread edge, whose widest
 * point is `maxX`. If the tire is stretched (bead wider than the bulge), the
 * sidewall is a straight line.
 */
export function sidewallCurve({ bead, tread, maxX, rounded }) {
  const [a, b] = SIDEWALL_SHAPE[rounded] ?? SIDEWALL_SHAPE.medium
  const h = tread.y - bead.y
  const floor = Math.max(bead.x, tread.x)

  if (maxX <= floor + 0.5) {
    const lerp = (t) => ({ x: bead.x + (tread.x - bead.x) * t, y: bead.y + h * t })
    return [bead, lerp(1 / 3), lerp(2 / 3), tread]
  }

  // Widest point grows with the control x, so binary search for it.
  let lo = floor
  let hi = floor + (maxX - floor) * 4
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (maxCurveX(bead.x, mid, tread.x) < maxX) lo = mid
    else hi = mid
  }
  const cx = (lo + hi) / 2
  return [bead, { x: cx, y: bead.y + h * a }, { x: cx, y: tread.y - h * b }, tread]
}

/**
 * Rotate a point about the axle by camber in degrees. Negative camber tilts
 * the top of the wheel inboard (toward the suspension).
 */
export function rotatePoint({ x, y }, deg) {
  const t = (deg * Math.PI) / 180
  return { x: x * Math.cos(t) + y * Math.sin(t), y: -x * Math.sin(t) + y * Math.cos(t) }
}

// Sidewall control points relative to the wheel centerline, for the top half.
function sidewallFor(setup) {
  const { rimHalfMm, rimRadiusMm, outerRadiusMm, dims } = setup
  return sidewallCurve({
    bead: { x: rimHalfMm + FLANGE_WIDTH_MM / 2, y: rimRadiusMm + FLANGE_HEIGHT_MM },
    tread: { x: dims.treadWidthMm / 2, y: outerRadiusMm },
    maxX: dims.sectionWidthMm / 2,
    rounded: dims.rounded,
  })
}

/** Outline of the top tire section as points, before camber. */
export function tireSectionPoints(setup, steps = 32) {
  const c = setup.centerMm
  const [p0, p1, p2, p3] = sidewallFor(setup)
  const at = (t) => ({ x: cubic(p0.x, p1.x, p2.x, p3.x, t), y: cubic(p0.y, p1.y, p2.y, p3.y, t) })
  const points = []
  for (let i = 0; i <= steps; i++) {
    const p = at(i / steps)
    points.push({ x: c - p.x, y: p.y })
  }
  for (let i = steps; i >= 0; i--) {
    const p = at(i / steps)
    points.push({ x: c + p.x, y: p.y })
  }
  return points
}

// Corners of the top half of the wheel's flanges, before camber.
function wheelCorners(setup) {
  const { centerMm: c, rimHalfMm, rimRadiusMm } = setup
  const lip = rimHalfMm + FLANGE_WIDTH_MM
  return [-1, 1].flatMap((s) => [
    { x: c + s * lip, y: rimRadiusMm + FLANGE_HEIGHT_MM },
    { x: c + s * lip, y: rimRadiusMm - BARREL_MM },
  ])
}

/** Every outline point of the whole wheel and tire, with camber applied. */
export function outlinePoints(setup) {
  const top = [...tireSectionPoints(setup), ...wheelCorners(setup)]
  const both = [...top, ...top.map((p) => ({ x: p.x, y: -p.y }))]
  return both.map((p) => rotatePoint(p, setup.wheel.camber))
}

/**
 * Lateral positions at the top of the tire with camber applied: the tread
 * edges, and the furthest points in and out of the top half (tire or wheel).
 */
export function camberedEdges(setup) {
  const { centerMm: c, outerRadiusMm: r, dims } = setup
  const deg = setup.wheel.camber
  const xs = [...tireSectionPoints(setup), ...wheelCorners(setup)].map((p) => rotatePoint(p, deg).x)
  const treadOuter = rotatePoint({ x: c + dims.treadWidthMm / 2, y: r }, deg)
  const treadInner = rotatePoint({ x: c - dims.treadWidthMm / 2, y: r }, deg)
  return {
    topOuter: Math.max(...xs),
    topInner: Math.min(...xs),
    treadOuter: treadOuter.x,
    treadInner: treadInner.x,
    treadOuterPoint: treadOuter,
  }
}

/**
 * SVG path for a tire section in screen space (y down), before camber.
 * `half` is 1 for the top section and -1 for the bottom.
 */
export function tirePath(setup, half = 1) {
  const c = setup.centerMm
  const [p0, p1, p2, p3] = sidewallFor(setup)
  const L = (p) => `${(c - p.x).toFixed(2)} ${(-half * p.y).toFixed(2)}`
  const R = (p) => `${(c + p.x).toFixed(2)} ${(-half * p.y).toFixed(2)}`
  return [`M ${L(p0)}`, `C ${L(p1)} ${L(p2)} ${L(p3)}`, `L ${R(p3)}`, `C ${R(p2)} ${R(p1)} ${R(p0)}`, 'Z'].join(' ')
}

/** Rectangles for the whole wheel in screen space (y down), before camber. */
export function wheelRects(setup) {
  const { centerMm: c, rimHalfMm, rimRadiusMm } = setup
  const rect = (x0, x1, y0, y1) => ({
    x: Math.min(x0, x1),
    y: Math.min(-y0, -y1),
    w: Math.abs(x1 - x0),
    h: Math.abs(y1 - y0),
  })
  const barrelIn = rimRadiusMm - BARREL_MM
  const flangeTop = rimRadiusMm + FLANGE_HEIGHT_MM
  const halves = [1, -1].flatMap((s) => [
    rect(c - rimHalfMm, c + rimHalfMm, s * barrelIn, s * rimRadiusMm),
    rect(c - rimHalfMm - FLANGE_WIDTH_MM, c - rimHalfMm, s * barrelIn, s * flangeTop),
    rect(c + rimHalfMm, c + rimHalfMm + FLANGE_WIDTH_MM, s * barrelIn, s * flangeTop),
  ])
  return [...halves, rect(0, DISC_MM, -barrelIn, barrelIn)]
}
