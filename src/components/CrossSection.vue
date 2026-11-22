<script setup>
import { computed, ref } from 'vue'
import {
  FENDER_SKIN_MM,
  MM_PER_IN,
  RIDE_HEIGHT_MAX_IN,
  RIDE_HEIGHT_MIN_IN,
  RIDE_HEIGHT_STEP_IN,
} from '../constants.js'
import { fenderPolygon, polygonPath } from '../fenderModel.js'
import { outlinePoints, tirePath, treadLine, wheelRects } from '../tireModel.js'

// setups: [{ key: 'current' | 'next', label, setup }] with setup.ok === true
const props = defineProps({
  setups: { type: Array, required: true },
  // [{ who: 'Current', specs: ['section width', ...] }] for setups with estimated specs
  estimates: { type: Array, default: () => [] },
  // True when any tire or wheel touches the fender.
  contact: { type: Boolean, default: false },
})
// { rideHeightIn, rolled }
const fender = defineModel('fender', { type: Object, required: true })

// The drawn skin reaches a little past the tallest tire, so contact up in the
// wheel arch still shows.
const fenderPoints = computed(() => {
  const tireTop = Math.max(...props.setups.flatMap((s) => outlinePoints(s.setup).map((p) => p.y)))
  const lip = fender.value.rideHeightIn * MM_PER_IN
  return fenderPolygon(fender.value, Math.max(lip + FENDER_SKIN_MM, tireTop + 15))
})
const fenderD = computed(() => polygonPath(fenderPoints.value))

// 'full' shows the whole wheel; 'top' crops to the top half, near the fender.
const viewMode = ref('full')

// Key of the setup whose drawing is hidden, or null. Only one can be hidden,
// so checking one box unchecks the other.
const hidden = ref(null)
function setHidden(key, checked) {
  hidden.value = checked ? key : null
}

const EIGHTHS = ['', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞']
const rideHeightLabel = computed(() => {
  const eighths = Math.round(fender.value.rideHeightIn * 8)
  return `${Math.floor(eighths / 8)}${EIGHTHS[eighths % 8]}"`
})

const view = computed(() => {
  const points = [...props.setups.flatMap((s) => outlinePoints(s.setup)), ...fenderPoints.value]
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const xMin = Math.min(0, ...xs) - 30
  const xMax = Math.max(0, ...xs) + 30
  const maxY = Math.max(...ys)
  const minY = Math.min(...ys)
  // Text scales with the visible area, so it stays the same size on screen
  // in both views.
  const top = viewMode.value === 'top'
  const font = Math.max(xMax - xMin, top ? maxY : maxY - minY) * 0.024
  const guideTop = maxY + 22
  const yTop = guideTop + font * 1.6
  // Top view stops just below the hub so the Inboard/Outboard labels still fit.
  const yBottom = top ? -font * 1.2 : minY - 15
  return { xMin, xMax, maxY, guideTop, yTop, yBottom, w: xMax - xMin, h: yTop - yBottom, font }
})

// Hidden setups still set the view, so hiding one doesn't rescale the drawing.
const visibleShapes = computed(() => shapes.value.filter((s) => s.key !== hidden.value))

const shapes = computed(() =>
  props.setups.map(({ key, label, setup }) => ({
    key,
    label,
    camber: setup.wheel.camber,
    tires: [tirePath(setup, 1), tirePath(setup, -1)],
    treads: [treadLine(setup, 1), treadLine(setup, -1)],
    wheel: wheelRects(setup),
    tread: setup.camber.treadOuterPoint,
  })),
)
</script>

<template>
  <figure :class="['card', 'cross-section', { contact }]">
    <div class="cross-body">
      <div class="hide-controls">
        <label v-for="s in shapes" :key="s.key" class="check">
          <input
            type="checkbox"
            :checked="hidden === s.key"
            @change="setHidden(s.key, $event.target.checked)"
          />
          Hide {{ s.label }}
        </label>
      </div>
      <svg
        :viewBox="`${view.xMin} ${-view.yTop} ${view.w} ${view.h}`"
        role="img"
        aria-label="Cross-section of the current and new wheel and tire under the fender lip, seen from the front of the car"
      >
        <g v-for="s in visibleShapes" :key="s.key" :class="['setup-shape', s.key]" :transform="`rotate(${s.camber})`">
          <path v-for="(d, i) in s.tires" :key="i" :d="d" class="tire" vector-effect="non-scaling-stroke" />
          <line
            v-for="(t, i) in s.treads"
            :key="`t${i}`"
            v-bind="t"
            class="tread"
            vector-effect="non-scaling-stroke"
          />
          <rect
            v-for="(r, i) in s.wheel"
            :key="`w${i}`"
            :x="r.x"
            :y="r.y"
            :width="r.w"
            :height="r.h"
            class="wheel"
            vector-effect="non-scaling-stroke"
          />
        </g>

        <!-- Ticks above the tire at each setup's outer tread edge. -->
        <line
          v-for="s in visibleShapes"
          :key="`g${s.key}`"
          :class="['guide', s.key]"
          :x1="s.tread.x"
          :x2="s.tread.x"
          :y1="-(s.tread.y + 4)"
          :y2="-view.guideTop"
          vector-effect="non-scaling-stroke"
        />

        <path :d="fenderD" :class="['fender', { contact }]" vector-effect="non-scaling-stroke" />

        <line x1="0" x2="0" :y1="-view.guideTop" :y2="-view.yBottom" class="hub" vector-effect="non-scaling-stroke" />
        <circle cx="0" cy="0" :r="view.font * 0.25" class="pivot" />
        <text x="0" :y="-view.guideTop - view.font * 0.5" text-anchor="middle" class="label" :font-size="view.font">
          Hub face
        </text>
        <text :x="view.xMin + view.font * 0.3" :y="view.font * 0.35" class="label muted" :font-size="view.font * 0.85">
          ← Inboard
        </text>
        <text
          :x="view.xMax - view.font * 0.3"
          :y="view.font * 0.35"
          text-anchor="end"
          class="label muted"
          :font-size="view.font * 0.85"
        >
          Outboard →
        </text>
      </svg>

      <div class="fender-controls">
        <div v-if="estimates.length" class="estimate-flag" tabindex="0" aria-describedby="estimate-tip">
          <span class="estimate-icon" aria-hidden="true">!</span>
          <div id="estimate-tip" role="tooltip" class="estimate-tip">
            <p>Some specs are estimates, because no data was available for them. They're worked out from the tire size.</p>
            <p v-for="e in estimates" :key="e.who"><strong>{{ e.who }}:</strong> {{ e.specs.join(', ') }}</p>
          </div>
        </div>
        <label class="check">
          <input v-model="fender.rolled" type="checkbox" />
          Roll Fender
        </label>
        <div class="view-toggle" role="radiogroup" aria-label="Drawing view">
          <label :class="{ on: viewMode === 'full' }">
            <input v-model="viewMode" type="radio" name="view-mode" value="full" />
            Full View
          </label>
          <label :class="{ on: viewMode === 'top' }">
            <input v-model="viewMode" type="radio" name="view-mode" value="top" />
            Top View
          </label>
        </div>
        <label for="ride-height" class="ride-height-label">Ride height</label>
        <div class="ride-height">
          <input
            id="ride-height"
            v-model.number="fender.rideHeightIn"
            type="range"
            :min="RIDE_HEIGHT_MIN_IN"
            :max="RIDE_HEIGHT_MAX_IN"
            :step="RIDE_HEIGHT_STEP_IN"
            :aria-valuetext="`${rideHeightLabel} from hub center to fender lip`"
          />
          <output for="ride-height">{{ rideHeightLabel }}</output>
        </div>
        <span class="hint">Hub to Fender Lip</span>
      </div>
    </div>
    <figcaption>
      <span v-for="s in shapes" :key="s.key" :class="['legend', s.key, { hidden: hidden === s.key }]">
        <span class="swatch"></span>{{ s.label }} ({{ s.camber }}°)
      </span>
      <span class="hint">
        Seen from the front of the car. Ticks at the top mark the outer tread edge; camber tilts about the hub. The
        fender lip is part of the body, so camber doesn't move it.
      </span>
    </figcaption>
  </figure>
</template>
