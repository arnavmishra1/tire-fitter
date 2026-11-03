// Fitment math. All lateral positions are in mm from the hub face, with
// positive values pointing outboard (toward the fender lip) and negative
// values inboard (toward the suspension).

import { FLANGE_WIDTH_MM, MM_PER_IN } from './constants.js'
import { camberedEdges } from './tireModel.js'

export { MM_PER_IN } from './constants.js'

// Rules of thumb for how tire width follows rim width: about 0.2" of section
// width per 0.5" of rim, and roughly half that for the tread face.
const SECTION_IN_PER_RIM_IN = 0.4
const TREAD_IN_PER_RIM_IN = 0.2
// Tread face as a share of section width, for tires with no tread width data.
const TREAD_RATIO = 0.85

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

export function sizeComplete(size) {
  return isNum(size.width) && isNum(size.aspect) && isNum(size.rim)
}

export function tiresForSize(tires, size) {
  if (!sizeComplete(size)) return []
  return tires
    .filter((t) => t.width === size.width && t.aspect === size.aspect && t.rim === size.rim)
    .sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model))
}

export function validateInputs(wheel, size) {
  const errors = []
  const check = (value, min, max, label) => {
    if (!isNum(value) || value < min || value > max) errors.push(`${label} must be from ${min} to ${max}.`)
  }
  check(wheel.width, 3, 16, 'Wheel width')
  check(wheel.diameter, 10, 30, 'Wheel diameter')
  check(wheel.offset, -100, 100, 'Offset')
  check(wheel.camber, -10, 10, 'Camber')
  check(size.width, 100, 400, 'Tire width')
  check(size.aspect, 20, 90, 'Aspect ratio')
  return errors
}

/** Approximate ETRTO measuring rim, rounded to the nearest half inch. */
export function estimatedMeasuredRim(width, aspect) {
  const ratio = aspect >= 50 ? 0.7 : 0.85
  return Math.round(((width * ratio) / MM_PER_IN) * 2) / 2
}

/**
 * Tire dimensions on a given rim width. Uses the tire's data where present
 * and estimates from the size where not; `estimated` says which is which.
 */
export function tireDimensions(size, tire, rimWidthIn) {
  const estimated = {}

  let overallDiameterIn = tire?.overallDiameterIn
  if (!overallDiameterIn) {
    overallDiameterIn = size.rim + (2 * size.width * size.aspect) / 100 / MM_PER_IN
    estimated.diameter = true
  }

  let measuredRimIn = tire?.measuredRimIn
  if (!measuredRimIn) {
    measuredRimIn = estimatedMeasuredRim(size.width, size.aspect)
    estimated.measuredRim = true
  }

  let rimMinIn = tire?.rimMinIn
  let rimMaxIn = tire?.rimMaxIn
  if (!rimMinIn || !rimMaxIn) {
    rimMinIn = measuredRimIn - 1
    rimMaxIn = measuredRimIn + 1
    estimated.rimRange = true
  }

  let baseSectionMm
  if (tire?.sectionWidthIn) {
    baseSectionMm = tire.sectionWidthIn * MM_PER_IN
  } else {
    baseSectionMm = size.width
    estimated.section = true
  }

  let baseTreadMm
  if (tire?.treadWidthIn) {
    baseTreadMm = tire.treadWidthIn * MM_PER_IN
  } else {
    baseTreadMm = baseSectionMm * TREAD_RATIO
    estimated.tread = true
  }

  const rimDeltaIn = rimWidthIn - measuredRimIn
  const sectionWidthMm = baseSectionMm + rimDeltaIn * SECTION_IN_PER_RIM_IN * MM_PER_IN
  const treadWidthMm = Math.min(sectionWidthMm, baseTreadMm + rimDeltaIn * TREAD_IN_PER_RIM_IN * MM_PER_IN)

  let stiffness = tire?.stiffness
  if (!stiffness) {
    stiffness = 'medium'
    estimated.stiffness = true
  } else if (tire.stiffnessEstimated) {
    estimated.stiffness = true
  }

  return {
    overallDiameterIn,
    sidewallIn: (overallDiameterIn - size.rim) / 2,
    measuredRimIn,
    rimMinIn,
    rimMaxIn,
    sectionWidthMm,
    treadWidthMm,
    stiffness,
    estimated,
  }
}

/**
 * Everything needed to compare and draw one wheel and tire setup. The tire's
 * rim diameter always matches the wheel, so `size` is just width and aspect.
 */
export function buildSetup(wheel, tireSize, tire) {
  const errors = validateInputs(wheel, tireSize)
  if (errors.length) return { ok: false, errors }
  const size = { width: tireSize.width, aspect: tireSize.aspect, rim: wheel.diameter }

  const matched = tire && tire.width === size.width && tire.aspect === size.aspect && tire.rim === size.rim
  const dims = tireDimensions(size, matched ? tire : null, wheel.width)

  const centerMm = -wheel.offset
  const rimHalfMm = (wheel.width * MM_PER_IN) / 2
  const wheelHalfMm = rimHalfMm + FLANGE_WIDTH_MM

  const edges = {
    wheelInner: centerMm - wheelHalfMm,
    wheelOuter: centerMm + wheelHalfMm,
    tireInner: centerMm - dims.sectionWidthMm / 2,
    tireOuter: centerMm + dims.sectionWidthMm / 2,
  }
  edges.inner = Math.min(edges.wheelInner, edges.tireInner)
  edges.outer = Math.max(edges.wheelOuter, edges.tireOuter)

  const warnings = []
  if (wheel.width < dims.rimMinIn) {
    warnings.push(
      `${wheel.width}" is narrower than the ${fmtRange(dims)} rim range for this tire, so the sidewall will bulge.`,
    )
  } else if (wheel.width > dims.rimMaxIn) {
    warnings.push(
      `${wheel.width}" is wider than the ${fmtRange(dims)} rim range for this tire, so the tire will be stretched.`,
    )
  }
  if (edges.wheelOuter > edges.tireOuter) {
    warnings.push('The wheel lip sticks out past the tire sidewall, so curbs will hit the wheel first.')
  }

  const setup = {
    ok: true,
    wheel,
    size,
    tire: matched ? tire : null,
    dims,
    centerMm,
    rimHalfMm,
    rimRadiusMm: (wheel.diameter * MM_PER_IN) / 2,
    outerRadiusMm: (dims.overallDiameterIn * MM_PER_IN) / 2,
    backspacingIn: (wheel.offset + wheelHalfMm) / MM_PER_IN,
    frontspacingIn: (wheelHalfMm - wheel.offset) / MM_PER_IN,
    edges,
    warnings,
  }
  setup.camber = camberedEdges(setup)
  return setup
}

function fmtRange(dims) {
  const range = `${dims.rimMinIn}–${dims.rimMaxIn}"`
  return dims.estimated.rimRange ? `estimated ${range}` : `approved ${range}`
}

/**
 * Changes from setup a (current) to setup b (new). Outer changes are positive
 * when further out toward the fender; inner changes are positive when closer
 * to the suspension. `outerMm`, `innerMm` and the tread values are at the top
 * of the tire with camber applied; the wheel and tire values are at hub
 * height.
 */
export function compareSetups(a, b) {
  const da = a.dims.overallDiameterIn
  const db = b.dims.overallDiameterIn
  return {
    diameterIn: db - da,
    diameterPct: ((db - da) / da) * 100,
    radiusMm: b.outerRadiusMm - a.outerRadiusMm,
    camberDeg: b.wheel.camber - a.wheel.camber,
    outerMm: b.camber.topOuter - a.camber.topOuter,
    innerMm: a.camber.topInner - b.camber.topInner,
    treadOuterMm: b.camber.treadOuter - a.camber.treadOuter,
    treadInnerMm: a.camber.treadInner - b.camber.treadInner,
    wheelOuterMm: b.edges.wheelOuter - a.edges.wheelOuter,
    wheelInnerMm: a.edges.wheelInner - b.edges.wheelInner,
    tireOuterMm: b.edges.tireOuter - a.edges.tireOuter,
    tireInnerMm: a.edges.tireInner - b.edges.tireInner,
    actualSpeedAt60: (60 * db) / da,
  }
}
