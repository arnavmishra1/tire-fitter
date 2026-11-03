# Tire Fitter

Compare a new wheel and tire against your current setup: diameter, speedometer
error, poke, inner clearance, and a cross-section drawing. Real tire data comes
from a CSV file in this repo; the app runs entirely in the browser.

## How it works

1. Enter the wheel's width, diameter and offset, and the tire size.
2. A dropdown lists every tire in the database at that exact size.
3. Pick one to use its real section width, tread width, diameter, rim range and
   sidewall stiffness, or leave it on **Any tire** to estimate from the size.

Values that are estimated rather than from the database are marked `*`.

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
line number. The rows in the file now are **made-up sample data** for testing.

| Column | Required | Meaning |
|---|---|---|
| `brand` | yes | Brand name |
| `model` | yes | Model name |
| `category` | yes | `track`, `max-performance`, `high-performance`, `touring`, `winter`, `all-terrain` or `mud-terrain` |
| `width` | yes | Size width in mm, e.g. `245` |
| `aspect` | yes | Aspect ratio, e.g. `40` |
| `rim` | yes | Rim diameter in inches, e.g. `18` |
| `section_width_in` | no | Section width in inches, on the measuring rim |
| `tread_width_in` | no | Tread width in inches |
| `overall_diameter_in` | no | Overall diameter in inches |
| `measured_rim_in` | no | Rim width the section width was measured on |
| `rim_min_in`, `rim_max_in` | no | Approved rim width range (give both or neither) |
| `stiffness` | no | `low`, `medium` or `high`; blank derives it from the category |
| `source` | no | Where the numbers came from |

Blank optional columns fall back to estimates from the size.

### Sidewall stiffness

When `stiffness` is blank, it starts from the category:

| Category | Stiffness |
|---|---|
| `track`, `max-performance`, `mud-terrain` | high |
| `high-performance`, `all-terrain` | medium |
| `touring`, `winter` | low |

For the on-road categories, 35-series and lower moves it up one step, and
65-series and higher moves it down one. Fill in `stiffness` to override.

Stiffness changes how the sidewall is drawn: high sits flat and upright, low
looks rounded.

## Estimates used

- **Section width vs. rim width:** about 0.2" per 0.5" of rim width away from
  the measuring rim; tread width changes about half as much.
- **No section width:** the nominal width (e.g. 245 mm) on the measuring rim.
- **No tread width:** 85% of section width.
- **No measuring rim:** 85% of the nominal width (70% for 50-series and up),
  to the nearest 0.5".
- **No rim range:** the measuring rim ± 1".
- **Wheel flange:** 0.5" per side beyond the rim width, for backspacing and
  lip position.

These live at the top of [`src/fitment.js`](src/fitment.js).

## Code

- `src/fitment.js`: fitment math (dimensions, positions, comparisons)
- `src/tireModel.js`: cross-section shapes, including the sidewall curve
- `src/tireData.js`: CSV parsing, validation and stiffness rule
- `src/components/`: the setup form, the drawing and the results table
- `vite.config.js`: the plugin that loads `data/tires.csv`

## Deploy

Every push to `main` runs the tests, builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. In the repo's **Settings → Pages**, set the
source to **GitHub Actions**.
