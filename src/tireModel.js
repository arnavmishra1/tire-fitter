// Cross-section shapes for drawing. Coordinates are mm: x is lateral from the
// hub face (outboard positive), y is radial from the axle (up positive).

import { FLANGE_HEIGHT_MM, FLANGE_WIDTH_MM } from './fitment.js'

// Where the sidewall curve's control points sit, as a share of sidewall
// height measured from the bead [a] and from the tread [b]. Points near the
// ends give a flat, upright sidewall; points near the middle give a round one.
export const SIDEWALL_SHAPE = {
  high: [0.1, 0.1],
  medium: [0.25, 0.2],
  low: [0.45, 0.35],
}

const BARREL_MM = 8
const DISC_MM = 15

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
export function sidewallCurve({ bead, tread, maxX, stiffness }) {
  const [a, b] = SIDEWALL_SHAPE[stiffness] ?? SIDEWALL_SHAPE.medium
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

/** SVG path for the tire's cross-section, with y flipped for screen space. */
export function tirePath(setup) {
  const { centerMm: c, rimHalfMm, rimRadiusMm, outerRadiusMm, dims } = setup
  const [p0, p1, p2, p3] = sidewallCurve({
    bead: { x: rimHalfMm + FLANGE_WIDTH_MM / 2, y: rimRadiusMm + FLANGE_HEIGHT_MM },
    tread: { x: dims.treadWidthMm / 2, y: outerRadiusMm },
    maxX: dims.sectionWidthMm / 2,
    stiffness: dims.stiffness,
  })
  const L = (p) => `${(c - p.x).toFixed(2)} ${(-p.y).toFixed(2)}`
  const R = (p) => `${(c + p.x).toFixed(2)} ${(-p.y).toFixed(2)}`
  return [
    `M ${L(p0)}`,
    `C ${L(p1)} ${L(p2)} ${L(p3)}`,
    `L ${R(p3)}`,
    `C ${R(p2)} ${R(p1)} ${R(p0)}`,
    'Z',
  ].join(' ')
}

/** Rectangles for the wheel (barrel, flanges, mounting disc), screen space. */
export function wheelRects(setup) {
  const { centerMm: c, rimHalfMm, rimRadiusMm } = setup
  const rect = (x0, x1, y0, y1) => ({ x: Math.min(x0, x1), y: -Math.max(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) })
  const barrelBottom = rimRadiusMm - BARREL_MM
  const flangeTop = rimRadiusMm + FLANGE_HEIGHT_MM
  return [
    rect(c - rimHalfMm, c + rimHalfMm, barrelBottom, rimRadiusMm),
    rect(c - rimHalfMm - FLANGE_WIDTH_MM, c - rimHalfMm, barrelBottom, flangeTop),
    rect(c + rimHalfMm, c + rimHalfMm + FLANGE_WIDTH_MM, barrelBottom, flangeTop),
    rect(0, DISC_MM, rimRadiusMm * 0.35, barrelBottom),
  ]
}
