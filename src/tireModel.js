// Cross-section shapes. Coordinates are mm: x is lateral from the hub face
// (outboard positive), y is vertical from the axle (up positive). The wheel
// and tire are tilted by camber about the axle at the hub face, (0, 0).

import { BARREL_MM, DISC_MM, FLANGE_HEIGHT_MM, FLANGE_WIDTH_MM } from './constants.js'

// The sidewall is two curves that meet at its widest point, where it's
// vertical: one from the rim lip up to the widest point, one from there to the
// tread edge. `rounded` only sets how long the handles are, so it changes how
// round the bulge looks, never where the widest point or tread edge sit.
//   mid: handle length at the widest point, as a share of each curve's height.
//        Long handles keep the sidewall straight and upright there.
//   lip: handle length at the rim lip, as a share of the bulge past the lip.
export const SIDEWALL_SHAPE = {
  low: { mid: 0.9, lip: 0.2 },
  medium: { mid: 0.6, lip: 0.5 },
  high: { mid: 0.35, lip: 0.8 },
}

// Height of the widest point, as a share of the way from rim lip to tread.
const BULGE_HEIGHT = 0.45
// The shoulder leaves the tread edge at half the angle of the line from the
// tread edge to the widest point, so it always curves outward (never pinches
// in), and its handle is a fixed share of the bulge past the tread edge. Both
// depend only on the tire's dimensions, not on `rounded`.
const SHOULDER_ANGLE_SHARE = 0.5
const SHOULDER_HANDLE = 0.6

function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
}

export function bezierPoint([p0, p1, p2, p3], t) {
  return { x: cubic(p0.x, p1.x, p2.x, p3.x, t), y: cubic(p0.y, p1.y, p2.y, p3.y, t) }
}

/**
 * One sidewall, from the rim lip to the tread edge, as a list of cubic
 * segments ([p0, p1, p2, p3] each). Its widest point is exactly `maxX`. If the
 * tire is stretched (no bulge past the lip or tread edge), it's a straight line.
 */
export function sidewallCurve({ bead, tread, maxX, rounded }) {
  const shape = SIDEWALL_SHAPE[rounded] ?? SIDEWALL_SHAPE.medium
  const lerp = (t) => ({ x: bead.x + (tread.x - bead.x) * t, y: bead.y + (tread.y - bead.y) * t })

  if (maxX <= Math.max(bead.x, tread.x) + 0.5) {
    return [[bead, lerp(1 / 3), lerp(2 / 3), tread]]
  }

  const mid = { x: maxX, y: bead.y + (tread.y - bead.y) * BULGE_HEIGHT }
  const lower = mid.y - bead.y
  const upper = tread.y - mid.y

  // Shoulder handle at the tread edge, from the dimensions alone.
  const dx = maxX - tread.x
  const angle = Math.atan2(upper, dx) * SHOULDER_ANGLE_SHARE
  const reach = dx * SHOULDER_HANDLE
  const shoulder = { x: tread.x + reach, y: tread.y - reach * Math.tan(angle) }

  return [
    [bead, { x: bead.x + (maxX - bead.x) * shape.lip, y: bead.y }, { x: maxX, y: mid.y - lower * shape.mid }, mid],
    [mid, { x: maxX, y: mid.y + upper * shape.mid }, shoulder, tread],
  ]
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
export function tireSectionPoints(setup, steps = 24) {
  const c = setup.centerMm
  const side = []
  for (const seg of sidewallFor(setup)) {
    for (let i = side.length ? 1 : 0; i <= steps; i++) side.push(bezierPoint(seg, i / steps))
  }
  return [...side.map((p) => ({ x: c - p.x, y: p.y })), ...side.reverse().map((p) => ({ x: c + p.x, y: p.y }))]
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
  const segs = sidewallFor(setup)
  const L = (p) => `${(c - p.x).toFixed(2)} ${(-half * p.y).toFixed(2)}`
  const R = (p) => `${(c + p.x).toFixed(2)} ${(-half * p.y).toFixed(2)}`
  const up = segs.map(([, p1, p2, p3]) => `C ${L(p1)} ${L(p2)} ${L(p3)}`)
  const down = [...segs].reverse().map(([p0, p1, p2]) => `C ${R(p2)} ${R(p1)} ${R(p0)}`)
  const tread = segs.at(-1)[3]
  return [`M ${L(segs[0][0])}`, ...up, `L ${R(tread)}`, ...down, 'Z'].join(' ')
}

/** The flat tread face as a line in screen space, before camber. */
export function treadLine(setup, half = 1) {
  const { centerMm: c, outerRadiusMm: r, dims } = setup
  const y = -half * r
  return { x1: c - dims.treadWidthMm / 2, x2: c + dims.treadWidthMm / 2, y1: y, y2: y }
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
