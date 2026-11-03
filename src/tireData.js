// Parses and validates data/tires.csv. Runs at build time (from the Vite
// plugin in vite.config.js), so the browser only ever sees clean records.

// How rounded the sidewall looks: low sits flat and upright, high bulges.
// Only used to draw the tire; it isn't shown on the page.
export const ROUNDED_LEVELS = ['low', 'medium', 'high']
export const DEFAULT_ROUNDED = 'medium'

export const COLUMNS = [
  'brand',
  'model',
  'width',
  'aspect',
  'rim',
  'section_width_in',
  'tread_width_in',
  'overall_diameter_in',
  'measured_rim_in',
  'rim_min_in',
  'rim_max_in',
  'rounded',
  'weight',
]

const REQUIRED = ['brand', 'model', 'width', 'aspect', 'rim']

// Range checks for numeric columns: [min, max].
const NUMERIC = {
  width: [100, 400],
  aspect: [20, 90],
  rim: [10, 30],
  section_width_in: [3, 16],
  tread_width_in: [3, 16],
  overall_diameter_in: [15, 45],
  measured_rim_in: [3, 16],
  rim_min_in: [3, 16],
  rim_max_in: [3, 16],
  weight: [5, 150],
}

/** Minimal CSV parser: handles quoted fields, "" escapes and CRLF. */
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  let line = 1
  let rowLine = 1

  const endRow = () => {
    row.push(field)
    if (row.some((f) => f.trim() !== '')) rows.push({ line: rowLine, fields: row })
    row = []
    field = ''
  }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        quoted = false
      } else {
        if (c === '\n') line++
        field += c
      }
    } else if (c === '"') {
      quoted = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      endRow()
      line++
      rowLine = line
    } else {
      field += c
    }
  }
  if (field !== '' || row.length) endRow()
  return rows
}

export function sizeLabel({ width, aspect, rim }) {
  return `${width}/${aspect}R${rim}`
}

/** CSV text → array of tire records. Throws one error listing every bad row. */
export function loadTires(text) {
  const rows = parseCsv(text.replace(/^﻿/, ''))
  if (!rows.length) return []

  const header = rows[0].fields.map((h) => h.trim().toLowerCase())
  const missing = COLUMNS.filter((c) => !header.includes(c))
  if (missing.length) throw new Error(`tires.csv is missing columns: ${missing.join(', ')}`)

  const errors = []
  const tires = []
  const seen = new Map()

  for (const { line, fields } of rows.slice(1)) {
    const raw = Object.fromEntries(header.map((h, i) => [h, (fields[i] ?? '').trim()]))
    const rowErrors = []
    const fail = (msg) => rowErrors.push(`line ${line}: ${msg}`)

    for (const col of REQUIRED) if (!raw[col]) fail(`${col} is required`)

    const num = {}
    for (const [col, [min, max]] of Object.entries(NUMERIC)) {
      if (!raw[col]) {
        num[col] = null
        continue
      }
      const value = Number(raw[col])
      if (!Number.isFinite(value) || value < min || value > max) {
        fail(`${col} "${raw[col]}" must be a number from ${min} to ${max}`)
      }
      num[col] = value
    }

    const rounded = raw.rounded.toLowerCase()
    if (rounded && !ROUNDED_LEVELS.includes(rounded)) {
      fail(`rounded "${raw.rounded}" must be low, medium, high or blank`)
    }

    if ((num.rim_min_in === null) !== (num.rim_max_in === null)) {
      fail('give both rim_min_in and rim_max_in, or neither')
    } else if (num.rim_min_in !== null && num.rim_min_in > num.rim_max_in) {
      fail('rim_min_in is larger than rim_max_in')
    }

    const id = `${raw.brand} ${raw.model} ${raw.width}/${raw.aspect}R${raw.rim}`
    const key = id.toLowerCase()
    if (seen.has(key)) fail(`duplicate of line ${seen.get(key)} (${id})`)
    seen.set(key, line)

    if (rowErrors.length) {
      errors.push(...rowErrors)
      continue
    }

    tires.push({
      id,
      brand: raw.brand,
      model: raw.model,
      width: num.width,
      aspect: num.aspect,
      rim: num.rim,
      sectionWidthIn: num.section_width_in,
      treadWidthIn: num.tread_width_in,
      overallDiameterIn: num.overall_diameter_in,
      measuredRimIn: num.measured_rim_in,
      rimMinIn: num.rim_min_in,
      rimMaxIn: num.rim_max_in,
      rounded: rounded || DEFAULT_ROUNDED,
      weightLb: num.weight,
    })
  }

  if (errors.length) throw new Error(`tires.csv has problems:\n  ${errors.join('\n  ')}`)
  return tires
}
