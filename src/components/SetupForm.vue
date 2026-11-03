<script setup>
import { computed, watch } from 'vue'
import { sizeComplete, tiresForSize } from '../fitment.js'
import { sizeLabel } from '../tireData.js'

const props = defineProps({
  title: { type: String, required: true },
  tires: { type: Array, required: true },
  variant: { type: String, default: 'current' },
})
const setup = defineModel({ type: Object, required: true })

// The tire's rim diameter always matches the wheel.
const fullSize = computed(() => ({ ...setup.value.size, rim: setup.value.wheel.diameter }))
const hasSize = computed(() => sizeComplete(fullSize.value))
const matches = computed(() => tiresForSize(props.tires, fullSize.value))
const selected = computed(() => matches.value.find((t) => t.id === setup.value.tireId) ?? null)

// Clear the tire choice when the size changes and it no longer matches.
watch(matches, (list) => {
  if (setup.value.tireId && !list.some((t) => t.id === setup.value.tireId)) setup.value.tireId = ''
})
</script>

<template>
  <section class="card setup" :class="variant">
    <h2><span class="swatch" aria-hidden="true"></span>{{ title }}</h2>

    <fieldset class="wheel-fields">
      <legend>Wheel</legend>
      <label>
        <span>Diameter <span class="unit">in</span></span>
        <input v-model.number="setup.wheel.diameter" type="number" step="1" min="10" max="30" />
      </label>
      <label>
        <span>Width <span class="unit">in</span></span>
        <input v-model.number="setup.wheel.width" type="number" step="0.5" min="3" max="16" />
      </label>
      <label>
        <span>Offset <span class="unit">mm</span></span>
        <input v-model.number="setup.wheel.offset" type="number" step="1" min="-100" max="100" />
      </label>
      <label>
        <span>Camber <span class="unit">°</span></span>
        <input v-model.number="setup.wheel.camber" type="number" step="0.1" min="-10" max="10" />
      </label>
    </fieldset>
    <p class="hint field-note">Negative camber tilts the top of the wheel in.</p>

    <fieldset class="tire-fields">
      <legend>Tire size</legend>
      <label>
        <span>Width <span class="unit">mm</span></span>
        <input v-model.number="setup.size.width" type="number" step="5" min="100" max="400" />
      </label>
      <label>
        <span>Aspect <span class="unit">%</span></span>
        <input v-model.number="setup.size.aspect" type="number" step="5" min="20" max="90" />
      </label>
    </fieldset>

    <div v-if="hasSize" class="picker">
      <label class="wide">
        Tire at {{ sizeLabel(fullSize) }}
        <select v-model="setup.tireId" :disabled="!matches.length">
          <option value="">
            {{ matches.length ? 'Any tire (estimate from size)' : 'No tires in the database at this size' }}
          </option>
          <option v-for="t in matches" :key="t.id" :value="t.id">{{ t.brand }} {{ t.model }}</option>
        </select>
      </label>
      <p v-if="!matches.length" class="hint">Widths and sidewall shape are estimated from the size.</p>
      <dl v-if="selected" class="tire-facts">
        <div><dt>Category</dt><dd>{{ selected.category }}</dd></div>
        <div>
          <dt>Sidewall</dt>
          <dd>{{ selected.stiffness }}<span v-if="selected.stiffnessEstimated" class="hint"> (from category)</span></dd>
        </div>
        <div v-if="selected.measuredRimIn"><dt>Measured on</dt><dd>{{ selected.measuredRimIn }}" rim</dd></div>
        <div v-if="selected.rimMinIn"><dt>Rim range</dt><dd>{{ selected.rimMinIn }}–{{ selected.rimMaxIn }}"</dd></div>
        <div v-if="selected.source" class="source"><dt>Source</dt><dd>{{ selected.source }}</dd></div>
      </dl>
    </div>
  </section>
</template>
