<script setup lang="ts">
import type { EChartsOption } from 'echarts'

const props = withDefaults(
  defineProps<{
    option: EChartsOption
    title: string
    height?: string
    loading?: boolean
    dataTable?: { columns: string[]; rows: (string | number)[][] }
  }>(),
  { height: '20rem', loading: false },
)

const VChart = defineAsyncComponent(async () => {
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

      <template #fallback>
        <UiSkeleton rounded="card" class="size-full" />
      </template>
    </ClientOnly>

    <div v-if="dataTable" class="sr-only">
      <table>
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
    </div>
  </figure>
</template>
