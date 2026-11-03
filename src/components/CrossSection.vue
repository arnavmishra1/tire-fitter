<script setup>
import { computed } from 'vue'
import { outlinePoints, tirePath, wheelRects } from '../tireModel.js'

// setups: [{ key: 'current' | 'next', label, setup }] with setup.ok === true
const props = defineProps({
  setups: { type: Array, required: true },
  // [{ who: 'Current', specs: ['section width', ...] }] for setups with estimated specs
  estimates: { type: Array, default: () => [] },
})

const view = computed(() => {
  const points = props.setups.flatMap((s) => outlinePoints(s.setup))
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const xMin = Math.min(0, ...xs) - 30
  const xMax = Math.max(0, ...xs) + 30
  const maxY = Math.max(...ys)
  const minY = Math.min(...ys)
  const font = Math.max(xMax - xMin, maxY - minY) * 0.024
  const guideTop = maxY + 22
  const yTop = guideTop + font * 1.6
  const yBottom = minY - 15
  return { xMin, xMax, maxY, guideTop, yTop, yBottom, w: xMax - xMin, h: yTop - yBottom, font }
})

const shapes = computed(() =>
  props.setups.map(({ key, label, setup }) => ({
    key,
    label,
    camber: setup.wheel.camber,
    tires: [tirePath(setup, 1), tirePath(setup, -1)],
    wheel: wheelRects(setup),
    tread: setup.camber.treadOuterPoint,
  })),
)
</script>

<template>
  <figure class="card cross-section">
    <div v-if="estimates.length" class="estimate-flag" tabindex="0" aria-describedby="estimate-tip">
      <span class="estimate-icon" aria-hidden="true">!</span>
      <div id="estimate-tip" role="tooltip" class="estimate-tip">
        <p>Some specs are estimates, because no data was available for them. They're worked out from the tire size.</p>
        <p v-for="e in estimates" :key="e.who"><strong>{{ e.who }}:</strong> {{ e.specs.join(', ') }}</p>
      </div>
    </div>
    <svg
      :viewBox="`${view.xMin} ${-view.yTop} ${view.w} ${view.h}`"
      role="img"
      aria-label="Cross-section of the current and new wheel and tire, seen from the front of the car"
    >
      <g v-for="s in shapes" :key="s.key" :class="['setup-shape', s.key]" :transform="`rotate(${s.camber})`">
        <path v-for="(d, i) in s.tires" :key="i" :d="d" class="tire" vector-effect="non-scaling-stroke" />
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
        v-for="s in shapes"
        :key="`g${s.key}`"
        :class="['guide', s.key]"
        :x1="s.tread.x"
        :x2="s.tread.x"
        :y1="-(s.tread.y + 4)"
        :y2="-view.guideTop"
        vector-effect="non-scaling-stroke"
      />

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
    <figcaption>
      <span v-for="s in shapes" :key="s.key" :class="['legend', s.key]">
        <span class="swatch"></span>{{ s.label }} ({{ s.camber }}°)
      </span>
      <span class="hint">
        Seen from the front of the car. Ticks at the top mark the outer tread edge; camber tilts about the hub.
      </span>
    </figcaption>
  </figure>
</template>
