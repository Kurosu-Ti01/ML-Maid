<template>
  <div class="statistics">
    <el-tabs v-model="activeTab" class="statistics-tabs">
      <el-tab-pane label="Main" name="main">
        <div class="tab-content">
          <h3>Overall Statistics</h3>
          <p>Main statistics overview will be displayed here...</p>
        </div>
      </el-tab-pane>

      <el-tab-pane label="Day" name="day">
        <div class="tab-content">
          <h3>Daily Statistics</h3>
          <p>Daily gaming statistics will be displayed here...</p>
        </div>
      </el-tab-pane>

      <el-tab-pane label="Week" name="week">
        <div class="tab-content">
          <div class="header-section">
            <h3>Weekly Statistics</h3>
            <div class="week-selector">
              <el-date-picker v-model="selectedWeek" type="week" format="YYYY [Week] ww" value-format="YYYY-MM-DD"
                placeholder="This Week" :first-day-of-week="1" @change="onWeekChange" />
            </div>
          </div>
          <div class="chart-container">
            <v-chart v-if="isChartReady && activeTab === 'week'" class="chart" :option="weekChartOption" autoresize />
            <div v-else class="loading-placeholder">
              Loading chart...
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="Month" name="month">
        <div class="tab-content">
          <h3>Monthly Statistics</h3>
          <p>Monthly gaming statistics will be displayed here...</p>
        </div>
      </el-tab-pane>

      <el-tab-pane label="Year" name="year">
        <div class="tab-content">
          <h3>Yearly Statistics</h3>
          <p>Yearly gaming statistics will be displayed here...</p>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts" name="Statistics">
  import { ref, onMounted, nextTick, watch } from 'vue'
  import { use } from 'echarts/core'
  import { CanvasRenderer } from 'echarts/renderers'
  import { BarChart } from 'echarts/charts'
  import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    DatasetComponent,
    TransformComponent
  } from 'echarts/components'
  import VChart from 'vue-echarts'
  import type { ComposeOption } from 'echarts/core'
  import type {
    BarSeriesOption
  } from 'echarts/charts'
  import type {
    TitleComponentOption,
    TooltipComponentOption,
    LegendComponentOption,
    GridComponentOption,
    DatasetComponentOption
  } from 'echarts/components'

  // Register required ECharts components
  use([
    CanvasRenderer,
    BarChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    DatasetComponent,
    TransformComponent
  ])

  // Create minimal ECharts option type
  type ECOption = ComposeOption<
    | BarSeriesOption
    | TitleComponentOption
    | TooltipComponentOption
    | LegendComponentOption
    | GridComponentOption
    | DatasetComponentOption
  >

  const activeTab = ref('main')
  const isChartReady = ref(false)

  // Get the current week's Monday as the default value (ISO 8601 standard)
  const getCurrentWeekMonday = () => {
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const monday = new Date(today)
    // Convert Sunday (0) to 7 for easier calculation
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek
    monday.setDate(today.getDate() - adjustedDay + 1) // Go back to this week's Monday
    return monday
  }

  // Selected week (default is current week's Monday)
  const selectedWeek = ref(getCurrentWeekMonday())

  // Chart configuration for the Week tab
  const weekChartOption = ref<ECOption>({
    title: {
      text: 'Weekly Gaming Hours by Game',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      top: 'bottom',
      type: 'scroll'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    dataset: {
      source: [
        ['Day'],
        ['Mon'],
        ['Tue'],
        ['Wed'],
        ['Thu'],
        ['Fri'],
        ['Sat'],
        ['Sun']
      ]
    },
    xAxis: {
      type: 'category'
    },
    yAxis: {
      type: 'value',
      name: 'Hours',
      axisLabel: {
        formatter: '{value}h'
      }
    },
    series: []
  })

  onMounted(async () => {
    // Initial data load
    loadWeeklyStatistics()
  })

  // Watch for tab changes
  watch(activeTab, async (newTab) => {
    if (newTab === 'week') {
      // When switching to the Week tab, delay chart initialization
      isChartReady.value = false
      await nextTick()
      setTimeout(() => {
        isChartReady.value = true
      }, 300)
    } else {
      // Hide chart when switching to other tabs
      isChartReady.value = false
    }
  }, { immediate: true })

  const loadWeeklyStatistics = async () => {
    try {
      console.log('Loading weekly statistics...')

      // Convert selected week to YYYY-MM-DD format
      let dateString: string
      if (typeof selectedWeek.value === 'string') {
        // If it's already a string from the date picker
        dateString = selectedWeek.value
      } else {
        // If it's a Date object from initial setup
        dateString = selectedWeek.value.toISOString().split('T')[0]
      }
      console.log(`Loading statistics for week starting: ${dateString}`)

      // Call the API
      const weeklyData = await window.electronAPI?.getWeeklyStatsByDate(dateString)
      if (weeklyData) {
        console.log('Weekly data received:', weeklyData)

        // Process the data for chart display
        updateWeeklyChart(weeklyData)
      }

    } catch (error) {
      console.error('Failed to load weekly statistics:', error)
    }
  }

  // Process weekly data and update chart (stacked by games)
  const updateWeeklyChart = (weeklyData: any[]) => {
    // Create day names mapping starting from Monday (1=Monday, 2=Tuesday, ..., 0=Sunday)
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    // Get all unique games from the data
    const uniqueGames = [...new Set(weeklyData.map(d => d.title))].sort()

    // Create header row with day and all game titles
    const header = ['Day', ...uniqueGames]

    // Create data rows for each day
    const dataRows = dayNames.map((dayName, displayIndex) => {
      const row = [dayName]

      // For each game, find its data for this day
      uniqueGames.forEach(gameTitle => {
        // Convert display index back to database dayOfWeek (0=Sunday, 1=Monday, ...)
        const dbDayOfWeek = displayIndex === 6 ? 0 : displayIndex + 1
        const gameData = weeklyData.find(d =>
          d.sessionDayOfWeek === dbDayOfWeek && d.title === gameTitle
        )
        const hours = gameData ? (gameData.totalSeconds / 3600).toFixed(2) : '0'
        row.push(hours)
      })

      return row
    })

    // Create series configuration for stacked bar chart
    const series = uniqueGames.map((gameTitle) => ({
      name: gameTitle,
      type: 'bar' as const,
      stack: 'total',
      emphasis: {
        focus: 'series' as const
      }
    }))

    // Update chart configuration for stacked games
    weekChartOption.value.dataset = {
      source: [header, ...dataRows]
    }
    weekChartOption.value.series = series
    weekChartOption.value.grid = {
      left: '3%',
      right: '4%',
      bottom: uniqueGames.length > 5 ? '20%' : '15%',
      containLabel: true
    }
  }

  // Handle week selection change
  const onWeekChange = (value: string | null) => {
    if (value) {
      console.log('Selected week:', value)
      loadWeeklyStatistics()
    }
  }
</script>

<style scoped>
  .statistics {
    padding: 0 20px;
  }

  .statistics h2 {
    color: #333;
    margin-bottom: 20px;
    text-align: center;
  }

  .statistics-tabs {
    margin-top: 0;
  }

  .tab-content {
    min-height: 400px;
  }

  .tab-content h3 {
    color: #409eff;
    margin-top: 0;
    margin-bottom: 15px;
    border-bottom: 2px solid #f0f0f0;
    padding-bottom: 10px;
  }

  .header-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .header-section h3 {
    margin-bottom: 0;
  }

  .week-selector {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .tab-content p {
    color: #666;
    font-size: 16px;
    line-height: 1.6;
  }

  .chart-container {
    width: 100%;
    height: 500px;
    margin-top: 20px;
  }

  .chart {
    width: 100%;
    height: 100%;
  }

  .loading-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    font-size: 16px;
  }
</style>
