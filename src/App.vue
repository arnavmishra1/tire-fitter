<script setup>
import { computed, reactive } from 'vue'
import tires from '../data/tires.csv'
import CrossSection from './components/CrossSection.vue'
import Results from './components/Results.vue'
import SetupForm from './components/SetupForm.vue'
import { buildSetup, estimatedSpecs } from './fitment.js'

const current = reactive({
  wheel: { diameter: 16, width: 7, offset: 45, camber: -1 },
  size: { width: 205, aspect: 50 },
  tireId: '',
})
const next = reactive({
  wheel: { diameter: 16, width: 8, offset: 35, camber: -2.5 },
  size: { width: 225, aspect: 45 },
  tireId: '',
})

const tireById = new Map(tires.map((t) => [t.id, t]))
const currentSetup = computed(() => buildSetup(current.wheel, current.size, tireById.get(current.tireId)))
const nextSetup = computed(() => buildSetup(next.wheel, next.size, tireById.get(next.tireId)))
const bothOk = computed(() => currentSetup.value.ok && nextSetup.value.ok)

const estimates = computed(() =>
  bothOk.value
    ? [
        { who: 'Current', specs: estimatedSpecs(currentSetup.value) },
        { who: 'New', specs: estimatedSpecs(nextSetup.value) },
      ].filter((e) => e.specs.length)
    : [],
)

const problems = computed(() => [
  ...(currentSetup.value.errors ?? []).map((m) => ({ who: 'Current', type: 'error', m })),
  ...(nextSetup.value.errors ?? []).map((m) => ({ who: 'New', type: 'error', m })),
  ...(currentSetup.value.warnings ?? []).map((m) => ({ who: 'Current', type: 'warning', m })),
  ...(nextSetup.value.warnings ?? []).map((m) => ({ who: 'New', type: 'warning', m })),
])
</script>

<template>
  <header>
    <h1>Tire Fitter</h1>
    <p>Compare a new wheel and tire against what's on your car now.</p>
  </header>

  <main>
    <div class="setups">
      <SetupForm v-model="current" title="Current" variant="current" :tires="tires" />
      <SetupForm v-model="next" title="New" variant="next" :tires="tires" />
    </div>

    <ul v-if="problems.length" class="problems">
      <li v-for="(p, i) in problems" :key="i" :class="p.type">
        <strong>{{ p.who }}:</strong> {{ p.m }}
      </li>
    </ul>

    <template v-if="bothOk">
      <CrossSection
        :setups="[
          { key: 'current', label: 'Current', setup: currentSetup },
          { key: 'next', label: 'New', setup: nextSetup },
        ]"
        :estimates="estimates"
      />
      <Results :current="currentSetup" :next="nextSetup" />
    </template>
  </main>

  <footer>
    <p>{{ tires.length }} tires in the database. Estimates are approximate; check clearance on the car.</p>
  </footer>
</template>
