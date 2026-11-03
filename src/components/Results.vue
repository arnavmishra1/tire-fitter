<script setup>
import { computed } from 'vue'
import { compareSetups, MM_PER_IN } from '../fitment.js'

const props = defineProps({
  current: { type: Object, required: true },
  next: { type: Object, required: true },
})

const diff = computed(() => compareSetups(props.current, props.next))

const inches = (v, d = 2) => `${v.toFixed(d)}"`
const mm = (v) => `${Math.round(v)} mm`
const mmIn = (v) => `${Math.round(v)} mm (${(v / MM_PER_IN).toFixed(2)}")`
const signed = (v, unit, d = 0) => `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(d)}${unit}`
const est = (flag) => (flag ? ' *' : '')

function change(v, more, less) {
  if (Math.abs(v) < 0.5) return 'No change'
  return `${Math.abs(v).toFixed(1)} mm ${v > 0 ? more : less}`
}

const rows = computed(() => {
  const a = props.current
  const b = props.next
  const d = diff.value
  return [
    {
      label: 'Overall diameter',
      a: inches(a.dims.overallDiameterIn) + est(a.dims.estimated.diameter),
      b: inches(b.dims.overallDiameterIn) + est(b.dims.estimated.diameter),
      change: `${signed(d.diameterIn, '"', 2)} (${signed(d.diameterPct, '%', 1)})`,
    },
    {
      label: 'Sidewall height',
      a: inches(a.dims.sidewallIn),
      b: inches(b.dims.sidewallIn),
      change: change(d.radiusMm, 'closer to the fender top', 'further from the fender top'),
    },
    {
      label: 'Section width on this wheel',
      a: mmIn(a.dims.sectionWidthMm) + est(a.dims.estimated.section),
      b: mmIn(b.dims.sectionWidthMm) + est(b.dims.estimated.section),
      change: signed(b.dims.sectionWidthMm - a.dims.sectionWidthMm, ' mm'),
    },
    {
      label: 'Tread width on this wheel',
      a: mmIn(a.dims.treadWidthMm) + est(a.dims.estimated.tread),
      b: mmIn(b.dims.treadWidthMm) + est(b.dims.estimated.tread),
      change: signed(b.dims.treadWidthMm - a.dims.treadWidthMm, ' mm'),
    },
    { label: 'Backspacing', a: inches(a.backspacingIn), b: inches(b.backspacingIn), change: '' },
    {
      label: 'Camber',
      a: `${a.wheel.camber}°`,
      b: `${b.wheel.camber}°`,
      change: Math.abs(d.camberDeg) < 0.05 ? 'No change' : signed(d.camberDeg, '°', 1),
    },
    {
      label: 'Outer tread edge, top',
      a: signed(a.camber.treadOuter, ' mm'),
      b: signed(b.camber.treadOuter, ' mm'),
      change: change(d.treadOuterMm, 'further out', 'further in'),
      strong: true,
    },
    {
      label: 'Inner tread edge, top',
      a: signed(a.camber.treadInner, ' mm'),
      b: signed(b.camber.treadInner, ' mm'),
      change: change(d.treadInnerMm, 'closer to suspension', 'further from suspension'),
      strong: true,
    },
    {
      label: 'Outermost point, top half (fender)',
      a: signed(a.camber.topOuter, ' mm'),
      b: signed(b.camber.topOuter, ' mm'),
      change: change(d.outerMm, 'further out', 'further in'),
      strong: true,
    },
    {
      label: 'Innermost point, top half (suspension)',
      a: signed(a.camber.topInner, ' mm'),
      b: signed(b.camber.topInner, ' mm'),
      change: change(d.innerMm, 'closer to suspension', 'further from suspension'),
      strong: true,
    },
  ]
})

const anyEstimated = computed(() =>
  [props.current, props.next].some((s) => Object.keys(s.dims.estimated).length > 0),
)
</script>

<template>
  <section class="card results">
    <h2>Comparison</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col" class="current">Current</th>
            <th scope="col" class="next">New</th>
            <th scope="col">Change</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.label" :class="{ strong: r.strong }">
            <th scope="row">{{ r.label }}</th>
            <td>{{ r.a }}</td>
            <td>{{ r.b }}</td>
            <td>{{ r.change }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="speedo">
      When your speedometer reads 60 mph, you'll be doing
      <strong>{{ diff.actualSpeedAt60.toFixed(1) }} mph</strong>.
    </p>
    <p class="hint">
      Positions are from the hub face, with + outboard, measured with camber applied about the hub.
      <span v-if="anyEstimated"><br />* Estimated from the tire size, because the database has no value.</span>
    </p>
  </section>
</template>
