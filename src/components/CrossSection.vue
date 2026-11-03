<script setup>
import { computed } from 'vue'
import { tirePath, wheelRects } from '../tireModel.js'

// setups: [{ key: 'current' | 'next', label, setup }] with setup.ok === true
const props = defineProps({ setups: { type: Array, required: true } })

const shapes = computed(() =>
  props.setups.map(({ key, label, setup }) => ({ key, label, tire: tirePath(setup), wheel: wheelRects(setup) })),
)

const view = computed(() => {
  const all = props.setups.map((s) => s.setup)
  const xMin = Math.min(0, ...all.map((s) => s.edges.inner)) - 30
  const xMax = Math.max(0, ...all.map((s) => s.edges.outer)) + 30
  const yTop = Math.max(...all.map((s) => s.outerRadiusMm)) + 25
  const yBottom = Math.min(...all.map((s) => s.rimRadiusMm * 0.8)) - 10
  const w = xMax - xMin
  const h = yTop - yBottom
  return { xMin, xMax, yTop, yBottom, w, h, font: Math.max(w, h) * 0.024 }
})
</script>

<template>
  <figure class="card cross-section">
    <svg
      :viewBox="`${view.xMin} ${-view.yTop} ${view.w} ${view.h}`"
      role="img"
      aria-label="Cross-section of the current and new wheel and tire, seen from the front of the car"
    >
      <g v-for="s in shapes" :key="s.key" :class="['setup-shape', s.key]">
        <path :d="s.tire" class="tire" vector-effect="non-scaling-stroke" />
        <rect
          v-for="(r, i) in s.wheel"
          :key="i"
          :x="r.x"
          :y="r.y"
          :width="r.w"
          :height="r.h"
          class="wheel"
          vector-effect="non-scaling-stroke"
        />
      </g>

      <line
        x1="0"
        x2="0"
        :y1="-view.yTop + view.font"
        :y2="-view.yBottom"
        class="hub"
        vector-effect="non-scaling-stroke"
      />
      <text x="0" :y="-view.yTop + view.font * 0.8" text-anchor="middle" class="label" :font-size="view.font">
        Hub face
      </text>
      <text
        :x="view.xMin + view.font * 0.5"
        :y="-view.yBottom - view.font * 0.5"
        class="label muted"
        :font-size="view.font * 0.85"
      >
        ← Suspension
      </text>
      <text
        :x="view.xMax - view.font * 0.5"
        :y="-view.yBottom - view.font * 0.5"
        text-anchor="end"
        class="label muted"
        :font-size="view.font * 0.85"
      >
        Fender →
      </text>
    </svg>
    <figcaption>
      <span v-for="s in shapes" :key="s.key" :class="['legend', s.key]"><span class="swatch"></span>{{ s.label }}</span>
      <span class="hint">Seen from the front of the car, top half of the wheel.</span>
    </figcaption>
  </figure>
</template>
