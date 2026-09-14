<script setup lang="ts">
import type { EChartsOption } from 'echarts'

/**
 * Chart container.
 *
 * Three problems it solves so that no caller has to solve them again.
 *
 * ECharts draws to a canvas, which is invisible to assistive technology and to
 * anyone who cannot distinguish the colours. Passing `dataTable` renders the
 * same figures as a real table, visually hidden but reachable by a screen
 * reader and by find-in-page. A chart that cannot be read is not accessible
 * because it has an alt text saying "bar chart".
 *
 * The library has no server rendering, so the chart is client-only. The height
 * is required and reserved on both sides of hydration, which is what stops the
 * page reflowing under the reader when the canvas appears.
 *
 * Theme colours come from useChartTheme, which reads the CSS tokens, so charts
 * follow a theme switch without a second palette existing anywhere.
 */
const props = withDefaults(
  defineProps<{
    option: EChartsOption
    /** Describes the chart to assistive technology. Required, not decorative. */
    title: string
    /** CSS height. Reserved before hydration to prevent a layout shift. */
    height?: string
    loading?: boolean
    /** The same figures in tabular form, for readers the canvas excludes. */
    dataTable?: { columns: string[]; rows: (string | number)[][] }
  }>(),
  { height: '20rem', loading: false },
)

const VChart = defineAsyncComponent(async () => {
  // Registering only what is used keeps the bundle from carrying every chart
  // type the library ships. Imported here rather than at module scope so none
  // of it is pulled into the server build.
  const [{ use }, { CanvasRenderer }, charts, components] = await Promise.all([
    import('echarts/core'),
    import('echarts/renderers'),
    import('echarts/charts'),
    import('echarts/components'),
  ])

  use([
    CanvasRenderer,
    charts.BarChart,
    charts.PieChart,
    charts.LineChart,
    components.GridComponent,
    components.TooltipComponent,
    components.LegendComponent,
    components.DatasetComponent,
    components.AriaComponent,
  ])

  return (await import('vue-echarts')).default
})
</script>

<template>
  <figure class="m-0" :style="{ height }">
    <figcaption class="sr-only">{{ title }}</figcaption>

    <UiSkeleton v-if="loading" rounded="card" class="size-full" />

    <ClientOnly v-else>
      <VChart class="size-full" :option="props.option" autoresize role="img" :aria-label="title" />

      <!-- Matches the reserved height exactly, so hydration swaps the canvas
           in without the surrounding content moving. -->
      <template #fallback>
        <UiSkeleton rounded="card" class="size-full" />
      </template>
    </ClientOnly>

    <table v-if="dataTable" class="sr-only">
      <caption>
        {{
          title
        }}
      </caption>
      <thead>
        <tr>
          <th v-for="column in dataTable.columns" :key="column" scope="col">{{ column }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in dataTable.rows" :key="index">
          <th scope="row">{{ row[0] }}</th>
          <td v-for="(cell, cellIndex) in row.slice(1)" :key="cellIndex">{{ cell }}</td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>
