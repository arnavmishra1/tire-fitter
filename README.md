# Tire Fitter

Compare a new wheel and tire against your current setup: diameter, speedometer
error, poke, inner clearance, and a cross-section drawing. Real tire data comes
from a CSV file in this repo; the app runs entirely in the browser.

## How it works

1. Enter the wheel's diameter, width, offset and camber, and the tire's width
   and aspect ratio. The tire's rim diameter always matches the wheel.
2. A dropdown lists every tire in the database at that exact size.
3. Pick one to use its real section width, tread width, diameter, rim range and
   sidewall shape, or leave it on **Any tire** to estimate from the size.

When any spec is estimated because the database has no value for it, a red
**!** appears at the top right of the drawing. Hover over it (or tab to it) to
see which specs are estimated for each setup.

## Run locally

You need Node 24 or newer.

```bash
npm install
npm run dev
```

## Test and build

```bash
npm test
npm run build
```

The build goes to `dist/` with relative paths, so it works from any folder.

## Tire data

All tire data lives in [`data/tires.csv`](data/tires.csv), one row per tire
model per size. It's read at build time, and a bad row fails the build with its
line number.

| Column | Required | Meaning |
|---|---|---|
| `brand` | yes | Brand name |
| `model` | yes | Model name |
| `width` | yes | Size width in mm, e.g. `245` |
| `aspect` | yes | Aspect ratio, e.g. `40` |
| `rim` | yes | Rim diameter in inches, e.g. `18` |
| `section_width_in` | no | Section width in inches, on the measuring rim |
| `tread_width_in` | no | Tread width in inches |
| `overall_diameter_in` | no | Overall diameter in inches |
| `measured_rim_in` | no | Rim width the section width was measured on |
| `rim_min_in`, `rim_max_in` | no | Approved rim width range (give both or neither) |
| `rounded` | no | How rounded the sidewall looks: `low`, `medium` or `high`; blank is `medium` |
| `weight` | no | Tire weight in pounds |

Blank optional columns fall back to estimates from the size, except
`weight`, which shows as "No data".

### Rounded

`rounded` sets how the sidewall is drawn: `low` sits flat and upright, `high`
bulges out round. It's set per tire, because
some tires with stiff construction still look rounded. It isn't shown on the
page; it only shapes the drawing.

## Estimates used

- **Section width vs. rim width:** about 0.2" per 0.5" of rim width away from
  the measuring rim. Tread width is a fixed spec and doesn't change with the
  wheel; the drawing shows it at exactly that width.
- **No section width:** the nominal width (e.g. 245 mm) on the measuring rim.
- **No tread width:** 85% of section width.
- **No measuring rim:** 85% of the nominal width for 45-series and lower, 80%
  for 50- and 55-series, 70% for 60-series and up, to the nearest 0.5".
- **No rim range:** the measuring rim ± 1".
- **Camber:** the whole wheel and tire rotate by the camber angle about the
  axle at the hub face. A point at lateral position `x` and height `y` moves
  to `x·cos θ + y·sin θ`, so the top of the tread moves in by about
  `radius × sin θ` for negative camber (about 11 mm at −2° on a 25.7" tire).
  Positions marked "top" in the results use this.
- **Wheel flange:** 0.5" per side beyond the rim width, for backspacing and
  lip position.

These live at the top of [`src/fitment.js`](src/fitment.js).

## Code

- `src/fitment.js`: fitment math (dimensions, positions, comparisons)
- `src/tireModel.js`: cross-section shapes, including the sidewall curve
- `src/tireData.js`: CSV parsing and validation
- `src/components/`: the setup form, the drawing and the results table
- `vite.config.js`: the plugin that loads `data/tires.csv`

## Deploy

Every push to `main` runs the tests, builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. In the repo's **Settings → Pages**, set the
source to **GitHub Actions**.
