<template>
  <div class="statistics">
    <el-tabs v-model="activeTab" class="statistics-tabs">
      <el-tab-pane label="Main" name="main">
        <div class="tab-content">
          <h3>Overall Statistics</h3>
          <div class="main-stats-container">
            <div class="stats-cards">
              <div class="stat-card">
                <div class="stat-icon">🎮</div>
                <div class="stat-content">
                  <div class="stat-value">{{ formatTime(overallStats.totalPlayTime) }}</div>
                  <div class="stat-label">Total Play Time</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">📅</div>
                <div class="stat-content">
                  <div class="stat-value">{{ formatTime(overallStats.todayPlayTime) }}</div>
                  <div class="stat-label">Today</div>
                </div>
              </div>


              <div class="stat-card">
                <div class="stat-icon">📚</div>
                <div class="stat-content">
                  <div class="stat-value">{{ overallStats.gamesPlayed }}</div>
                  <div class="stat-label">Games Played</div>
                </div>
              </div>


              <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                  <div class="stat-value">{{ formatTime(overallStats.thisWeekPlayTime) }}</div>
                  <div class="stat-label">This Week</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">🎯</div>
                <div class="stat-content">
                  <div class="stat-value">{{ overallStats.totalSessions }}</div>
                  <div class="stat-label">Total Sessions</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">🗓️</div>
                <div class="stat-content">
                  <div class="stat-value">{{ formatTime(overallStats.thisMonthPlayTime) }}</div>
                  <div class="stat-label">This Month</div>
                </div>
              </div>
            </div>

            <el-scrollbar class="stats-recent-sessions-el">
              <h4>Recent Game Sessions</h4>
              <div v-if="recentSessions.length > 0" class="recent-session-list-el">
                <el-card v-for="(session, idx) in recentSessions" :key="idx" class="recent-session-card" shadow="hover">
                  <div class="recent-session-row">
                    <span class="recent-session-title-el">{{ session.title }}</span>
                    <span class="recent-session-time-el">{{ formatSessionTime(session.startTime) }}</span>
                    <span class="recent-session-duration-el">{{ formatTime(session.durationSeconds) }}</span>
                  </div>
                </el-card>
              </div>
              <div v-else class="recent-session-empty-el">No recent sessions found.</div>
            </el-scrollbar>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="Day" name="day">
        <div class="tab-content">
          <div class="header-section">
            <h3>Daily Statistics</h3>
            <div class="day-selector">
              <el-date-picker v-model="selectedDay" type="date" format="YYYY-MM-DD" value-format="YYYY-MM-DD"
                placeholder="Today" @change="onDayChange" />
            </div>
          </div>
          <div class="chart-container">
            <v-chart v-if="isDayChartReady && activeTab === 'day'" class="chart" :option="dayChartOption" autoresize />
            <div v-else class="loading-placeholder">
              Loading chart...
            </div>
          </div>
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
          <div class="header-section">
            <h3>Monthly Statistics</h3>
            <div class="month-selector">
              <el-date-picker v-model="selectedMonth" type="month" format="YYYY-MM" value-format="YYYY-MM"
                placeholder="This Month" @change="onMonthChange" />
            </div>
          </div>
          <div class="chart-container">
            <v-chart v-if="isMonthChartReady && activeTab === 'month'" class="chart" :option="monthChartOption"
              autoresize />
            <div v-else class="loading-placeholder">
              Loading chart...
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="Year" name="year">
        <div class="tab-content">
          <div class="header-section">
            <h3>Yearly Statistics</h3>
            <div class="year-selector">
              <el-date-picker v-model="selectedYear" type="year" format="YYYY" value-format="YYYY"
                placeholder="This Year" @change="onYearChange" />
            </div>
          </div>
          <div class="chart-container">
            <v-chart v-if="isYearChartReady && activeTab === 'year'" class="chart" :option="yearChartOption"
              autoresize />
            <div v-else class="loading-placeholder">
              Loading chart...
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts" name="Statistics">
  import { ref, onMounted, nextTick, watch, computed, provide } from 'vue'
  import { use, registerTheme } from 'echarts/core'
  import { CanvasRenderer } from 'echarts/renderers'
  import { BarChart, CustomChart, LineChart, HeatmapChart } from 'echarts/charts'
  import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    DatasetComponent,
    TransformComponent,
    DataZoomComponent,
    CalendarComponent,
    VisualMapComponent
  } from 'echarts/components'
  import { graphic } from 'echarts/core'
  import VChart, { THEME_KEY } from 'vue-echarts'
  import { useTheme } from '@/composables/useTheme'
  import { DarkTheme } from '@/assets/echarts/dark-theme'
  import type { ComposeOption } from 'echarts/core'
  import type {
    BarSeriesOption,
    CustomSeriesOption,
    LineSeriesOption,
    HeatmapSeriesOption
  } from 'echarts/charts'
  import type {
    TitleComponentOption,
    TooltipComponentOption,
    LegendComponentOption,
    GridComponentOption,
    DatasetComponentOption,
    DataZoomComponentOption,
    CalendarComponentOption
  } from 'echarts/components'

  // Register required ECharts components
  use([
    CanvasRenderer,
    BarChart,
    CustomChart,
    LineChart,
    HeatmapChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    DatasetComponent,
    TransformComponent,
    DataZoomComponent,
    CalendarComponent,
    VisualMapComponent
  ])

  // Create specific ECharts option types for different charts
  type WeekChartOption = ComposeOption<
    | BarSeriesOption
    | TitleComponentOption
    | TooltipComponentOption
    | LegendComponentOption
    | GridComponentOption
    | DatasetComponentOption
  >

  type DayChartOption = ComposeOption<
    | CustomSeriesOption
    | TitleComponentOption
    | TooltipComponentOption
    | LegendComponentOption
    | GridComponentOption
    | DataZoomComponentOption
  >

  // New: Month chart option type
  type MonthChartOption = ComposeOption<
    | LineSeriesOption
    | TitleComponentOption
    | TooltipComponentOption
    | LegendComponentOption
    | GridComponentOption
  >

  // New: Year chart option type (calendar heatmap)
  type YearChartOption = ComposeOption<
    | HeatmapSeriesOption
    | TitleComponentOption
    | TooltipComponentOption
    | LegendComponentOption
    | CalendarComponentOption
  >

  const activeTab = ref('main')
  const isChartReady = ref(false)
  const isDayChartReady = ref(false)
  const isMonthChartReady = ref(false)
  const isYearChartReady = ref(false)

  // Register custom dark theme
  registerTheme('dark', DarkTheme)

  // Use theme
  const { isDark } = useTheme()

  // Provide theme to all child ECharts components
  provide(THEME_KEY, computed(() => isDark.value ? 'dark' : undefined))

  // Get today's date as the default value
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0] // YYYY-MM-DD format
  }

  // Get current month string YYYY-MM
  const getCurrentMonthString = () => {
    const today = new Date()
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`
  }

  // Get current year string YYYY
  const getCurrentYearString = () => new Date().getFullYear().toString()

  // Selected day (default is today)
  const selectedDay = ref(getTodayDate())
  // Selected month (default is current month)
  const selectedMonth = ref(getCurrentMonthString())
  // Selected year (default is current year)
  const selectedYear = ref(getCurrentYearString())

  // Overall statistics data
  const overallStats = ref({
    totalPlayTime: 0,
    totalSessions: 0,
    gamesPlayed: 0,
    todayPlayTime: 0,
    thisWeekPlayTime: 0,
    thisMonthPlayTime: 0
  })

  // Recent game sessions data
  const recentSessions = ref<Array<{ title: string; startTime: string; durationSeconds: number }>>([])

  // Format time from seconds to readable format
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  // Format session time
  function formatSessionTime(timeStr: string) {
    const d = new Date(timeStr + 'Z')
    const yyyy = d.getFullYear()
    const mm = (d.getMonth() + 1).toString().padStart(2, '0')
    const dd = d.getDate().toString().padStart(2, '0')
    const hh = d.getHours().toString().padStart(2, '0')
    const min = d.getMinutes().toString().padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`
  }

  // Chart configuration for the Day tab (Profile chart)
  const dayChartOption = ref<DayChartOption>({
    title: {
      text: 'Daily Gaming Timeline',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const data = params.data
        const startTime = data[1]
        const endTime = data[2]
        const duration = data[3] // Already in minutes
        const gameTitle = data[4]
        const launchMethod = data[5]

        const startHour = Math.floor(startTime)
        const endHour = Math.floor(endTime)
        const startMin = Math.floor((startTime - startHour) * 60)
        const endMin = Math.floor((endTime - endHour) * 60)

        return `
          <strong>${gameTitle}</strong><br/>
          Time: ${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')} - ${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}<br/>
          Duration: ${duration.toFixed(0)} minutes<br/>
          Launch: ${launchMethod || 'Unknown'}
        `
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
      containLabel: true,
      height: 300
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: 24,
      axisLabel: {
        formatter: (value: number) => {
          // Simple hour formatting
          const hour = Math.floor(value)
          const minute = Math.round((value % 1) * 60)
          if (minute === 0) {
            return `${hour}:00`
          } else {
            return `${hour}:${minute.toString().padStart(2, '0')}`
          }
        }
      },
      splitLine: {
        show: true,
        lineStyle: {
          type: 'dashed',
          opacity: 0.5
        }
      }
    },
    yAxis: {
      type: 'category',
      data: [], // Will be set dynamically based on sessions
      show: false // Hide y-axis since we're showing timeline
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        xAxisIndex: [0],
        start: 0,
        end: 100,
        bottom: '5%',
        filterMode: 'weakFilter',
        showDataShadow: false,
        labelFormatter: ''
      },
      {
        type: 'inside',
        xAxisIndex: [0],
        start: 0,
        end: 100,
        filterMode: 'weakFilter'
      }
    ],
    series: []
  })

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
  const weekChartOption = ref<WeekChartOption>({
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

  // Chart configuration for the Month tab (daily totals area/line chart)
  const monthChartOption = ref<MonthChartOption>({
    title: {
      text: 'Daily Total Play Time',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        if (!params || params.length === 0) return ''
        const p = params[0]
        return `${p.axisValue}<br/>${p.seriesName}: ${Number(p.data).toFixed(2)} hours`
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
    xAxis: {
      type: 'category',
      data: []
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

  // Year chart option (calendar heatmap)
  const yearChartOption = ref<YearChartOption>({
    title: { text: 'Yearly Daily Play Time', left: 'center' },
    tooltip: {
      formatter: (params: any) => {
        if (!params) return ''
        const d = params.data
        return `${d[0]}: ${((d[1] || 0) / 3600).toFixed(2)} hours`
      }
    },
    visualMap: {
      min: 0,
      max: 24 * 3600, // up to 24h in seconds
      orient: 'horizontal',
      right: 'center',
      bottom: '40%',
      itemHeight: 1000,
      calculable: true,
      inRange: { color: ['#e0f3ff', '#0066cc'] }
    },
    calendar: [{ range: getCurrentYearString(), cellSize: ['auto', 20] }],
    series: [{
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data: []
    }]
  })

  onMounted(async () => {
    // Initial data load
    loadOverallStats()
    loadDailyStatistics()
    loadWeeklyStatistics()
    loadMonthlyDailyStats()
    loadYearlyDailyStats()
    loadRecentSessions()
  })

  // Watch for tab changes
  watch(activeTab, async (newTab) => {
    if (newTab === 'day') {
      // When switching to the Day tab, delay chart initialization
      isDayChartReady.value = false
      await nextTick()
      setTimeout(() => {
        isDayChartReady.value = true
      }, 300)
    } else if (newTab === 'week') {
      // When switching to the Week tab, delay chart initialization
      isChartReady.value = false
      await nextTick()
      setTimeout(() => {
        isChartReady.value = true
      }, 300)
    } else if (newTab === 'month') {
      // When switching to the Month tab, delay chart initialization
      isMonthChartReady.value = false
      await nextTick()
      setTimeout(() => {
        isMonthChartReady.value = true
      }, 300)
    } else if (newTab === 'year') {
      // When switching to the Year tab, delay chart initialization
      isYearChartReady.value = false
      await nextTick()
      setTimeout(() => {
        isYearChartReady.value = true
      }, 300)
    } else {
      // Hide charts when switching to other tabs
      isDayChartReady.value = false
      isChartReady.value = false
      isMonthChartReady.value = false
      isYearChartReady.value = false
    }
  }, { immediate: true })

  // ==========================================
  // DAILY STATISTICS CHART (Day Tab)
  // ==========================================

  // Load daily statistics
  const loadDailyStatistics = async () => {
    try {
      console.log('Loading daily statistics...')

      // Convert selected day to YYYY-MM-DD format
      const dateString = selectedDay.value
      console.log(`Loading statistics for day: ${dateString}`)

      // Call the API
      const dailyData = await window.electronAPI?.getDailyGameSessions(dateString)
      if (dailyData) {
        console.log('Daily data received:', dailyData)
        updateDailyChart(dailyData)
      }

    } catch (error) {
      console.error('Failed to load daily statistics:', error)
    }
  }

  // Process daily data and update Profile chart
  const updateDailyChart = (dailyData: any[]) => {
    if (!dailyData || dailyData.length === 0) {
      // No data for this day
      dayChartOption.value.yAxis = { type: 'value', min: 0, max: 10, show: false }
      dayChartOption.value.series = []
      return
    }

    // Get unique games and assign colors using ECharts default palette
    const uniqueGames = [...new Set(dailyData.map(d => d.title))].sort()

    // Generate colors using ECharts default color palette
    const defaultColors = [
      '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
      '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#ff9f7f'
    ]
    const gameColors: { [key: string]: string } = {}
    uniqueGames.forEach((game, index) => {
      gameColors[game] = defaultColors[index % defaultColors.length]
    })

    // Convert time strings to decimal hours for easier processing
    const sessions = dailyData.map(session => {
      const startTime = new Date(session.startTime + 'Z') // Add Z to indicate UTC
      const endTime = new Date(session.endTime + 'Z')

      // Convert to local time decimal hours
      let startHour = startTime.getHours() + startTime.getMinutes() / 60
      let endHour = endTime.getHours() + endTime.getMinutes() / 60

      // Handle cross-day sessions: if session crosses midnight, cap it at 24:00
      if (endTime.getDate() !== startTime.getDate()) {
        // Session crosses to next day, only show until end of current day
        endHour = 24
      }

      // Additional safety check: if endHour is less than startHour, it likely crossed midnight
      if (endHour < startHour) {
        endHour = 24
      }

      return {
        ...session,
        startHour,
        endHour
      }
    })

    // Sort sessions by start time
    sessions.sort((a, b) => a.startHour - b.startHour)

    // Create timeline data following official example pattern
    const timelineData = createVerticalTimelineData(sessions, uniqueGames)

    // Set up Y-axis categories (like official example)
    const categories = timelineData.categories
    dayChartOption.value.yAxis = {
      type: 'category',
      data: categories,
      show: false
    }

    dayChartOption.value.series = [{
      name: 'Gaming Sessions',
      type: 'custom',
      renderItem: (params: any, api: any) => {
        const categoryIndex = api.value(0) // Y category index
        const startTime = api.value(1)     // Start time
        const endTime = api.value(2)       // End time
        const gameTitle = api.value(4)     // Game title

        const start = api.coord([startTime, categoryIndex])
        const end = api.coord([endTime, categoryIndex])
        const height = api.size([0, 1])[1] * 0.6

        // Create the rectangle shape (same as official example)
        const rectShape = {
          x: start[0],
          y: start[1] - height / 2,
          width: end[0] - start[0],
          height: height
        }

        // Clip the rectangle to the visible coordinate system area
        const clippedShape = graphic.clipRectByRect(
          rectShape,
          {
            x: params.coordSys.x,
            y: params.coordSys.y,
            width: params.coordSys.width,
            height: params.coordSys.height
          }
        )

        // Use game-specific color
        const color = gameColors[gameTitle] || defaultColors[0]

        return clippedShape && {
          type: 'rect',
          transition: ['shape'],
          shape: clippedShape,
          style: {
            fill: color,
            stroke: '#fff',
            lineWidth: 1,
            opacity: 0.8
          }
        }
      },
      itemStyle: {
        opacity: 0.8
      },
      encode: {
        x: [1, 2], // Start and end time
        y: 0       // Category index
      },
      data: timelineData.chartData
    }]

    // Update legend with games and their colors
    dayChartOption.value.legend = {
      top: 'bottom',
      type: 'scroll',
      data: uniqueGames.map(game => ({
        name: game,
        itemStyle: {
          color: gameColors[game]
        }
      }))
    }
  }

  // Create vertical timeline data following official example pattern
  const createVerticalTimelineData = (sessions: any[], _uniqueGames: string[]) => {
    const chartData: any[] = []
    const categories: string[] = []

    // Track occupied time slots for each vertical level
    const levelOccupancy: { start: number, end: number }[] = []

    sessions.forEach(session => {
      let assignedLevel = 0

      // Find the lowest available level that doesn't have time conflicts
      while (assignedLevel < levelOccupancy.length) {
        const hasConflict = levelOccupancy[assignedLevel] &&
          !(session.endHour <= levelOccupancy[assignedLevel].start ||
            session.startHour >= levelOccupancy[assignedLevel].end)

        if (!hasConflict) {
          break
        }
        assignedLevel++
      }

      // Extend levelOccupancy array if needed
      while (levelOccupancy.length <= assignedLevel) {
        levelOccupancy.push({ start: 0, end: 0 })
      }

      // Record the time slot as occupied at this level
      levelOccupancy[assignedLevel] = {
        start: session.startHour,
        end: session.endHour
      }

      // Create category name for this level if not exists
      const categoryName = `Level ${assignedLevel + 1}`
      if (!categories.includes(categoryName)) {
        categories.push(categoryName)
      }

      // Data format: [categoryIndex, startTime, endTime, duration, gameTitle, launchMethod]
      chartData.push([
        assignedLevel,        // Category index (Y position)
        session.startHour,    // Start time (X start)
        session.endHour,      // End time (X end)
        (session.endHour - session.startHour) * 60, // Duration in minutes
        session.title,        // Game title
        session.launchMethod  // Launch method
      ])
    })

    return { chartData, categories }
  }

  // Handle day selection change
  const onDayChange = (value: string | null) => {
    if (value) {
      console.log('Selected day:', value)
      loadDailyStatistics()
    }
  }

  // ==========================================
  // WEEKLY STATISTICS CHART (Week Tab)
  // ==========================================

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

  // ==========================================
  // MONTHLY STATISTICS CHART (Month Tab)
  // ==========================================

  // Load monthly daily totals for the selected year/month
  const loadMonthlyDailyStats = async () => {
    try {
      console.log('Loading monthly daily statistics...')

      // Determine year and month
      let year: number
      let month: number
      if (typeof selectedMonth.value === 'string') {
        const parts = selectedMonth.value.split('-')
        year = parseInt(parts[0], 10)
        month = parseInt(parts[1], 10)
      } else {
        const d = selectedMonth.value as Date
        year = d.getFullYear()
        month = d.getMonth() + 1
      }

      console.log(`Loading statistics for month: ${year}-${month.toString().padStart(2, '0')}`)

      // Call the API exposed by preload (camelCase)
      const monthlyData = await window.electronAPI?.getMonthlyDailyStats(year, month)
      if (monthlyData) {
        console.log('Monthly daily data received:', monthlyData)
        updateMonthChart(year, month, monthlyData)
      }

    } catch (error) {
      console.error('Failed to load monthly daily statistics:', error)
    }
  }

  // Update month chart from API data
  const updateMonthChart = (year: number, month: number, monthlyData: any[]) => {
    // Number of days in selected month
    const daysInMonth = new Date(year, month, 0).getDate()

    // Prepare labels (e.g. 'MM-DD') and default zeros
    const monthStr = month.toString().padStart(2, '0')
    const labels = Array.from({ length: daysInMonth }, (_, i) => `${monthStr}-${(i + 1).toString().padStart(2, '0')}`)

    // Map API results (sessionDate -> totalSeconds)
    const dayMap = new Map<number, number>()
    monthlyData.forEach((row: any) => {
      const parts = row.sessionDate.split('-')
      const day = parseInt(parts[2], 10)
      const hours = (row.totalSeconds || 0) / 3600
      dayMap.set(day, hours)
    })

    const seriesData = Array.from({ length: daysInMonth }, (_, i) => {
      const v = dayMap.get(i + 1)
      return v != null ? Number(v.toFixed(2)) : 0
    })

    monthChartOption.value.xAxis = { type: 'category', data: labels }
    monthChartOption.value.series = [{
      name: 'Total Hours',
      type: 'line',
      smooth: true,
      areaStyle: {},
      data: seriesData
    }]
  }

  // Handle month selection change
  function onMonthChange(value: string | null) {
    if (value) {
      console.log('Selected month:', value)
      loadMonthlyDailyStats()
    }
  }

  // ==========================================
  // YEARLY STATISTICS CHART (Year Tab)
  // ==========================================

  // Load yearly daily totals
  const loadYearlyDailyStats = async () => {
    try {
      const year = typeof selectedYear.value === 'string' ? parseInt(selectedYear.value, 10) : (selectedYear.value as Date).getFullYear()
      console.log('Loading yearly daily stats for', year)
      const data = await window.electronAPI?.getYearlyDailyStats(year)
      if (data) updateYearChart(year, data)
    } catch (e) {
      console.error('Failed to load yearly daily stats', e)
    }
  }

  // Update year chart from API data
  const updateYearChart = (year: number, rows: any[]) => {
    // Convert rows {sessionDate, totalSeconds} to [dateStr, value] with dateStr 'YYYY-MM-DD'
    const heatData: [string, number][] = rows.map(r => [r.sessionDate, r.totalSeconds || 0])

    yearChartOption.value.calendar = [{ range: String(year), cellSize: ['auto', 20] }]
    yearChartOption.value.series = [{ type: 'heatmap', coordinateSystem: 'calendar', data: heatData }]
  }

  function onYearChange(value: string | null) {
    if (value) loadYearlyDailyStats()
  }

  // ==========================================
  // OVERALL STATISTICS (Main Tab)
  // ==========================================

  // Load overall statistics
  const loadOverallStats = async () => {
    try {
      console.log('Loading overall statistics...')
      const data = await window.electronAPI?.getOverallStats()
      if (data) {
        console.log('Overall stats received:', data)
        overallStats.value = data
      }
    } catch (e) {
      console.error('Failed to load overall stats', e)
    }
  }

  // Load recent game sessions
  async function loadRecentSessions() {
    try {
      const data = await window.electronAPI?.getRecentSessions()
      if (Array.isArray(data)) {
        recentSessions.value = data.slice(0, 10)
      }
    } catch (e) {
      console.error('Failed to load recent sessions', e)
    }
  }

  // Initial data load
  onMounted(async () => {
    await loadOverallStats()
    await loadRecentSessions()
    // Other initial loads...
  })
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

  .day-selector {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .year-selector {
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

  /* Main tab styles */
  .main-stats-container {
    display: flex;
    gap: 30px;
    height: 100%;
  }

  .stats-cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
    min-width: 450px;
  }

  .stat-card {
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 15px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }

  .stat-icon {
    font-size: 2.5em;
    opacity: 0.8;
  }

  .stat-content {
    flex: 1;
  }

  .stat-value {
    font-size: 1.8em;
    font-weight: bold;
    color: #2c3e50;
    line-height: 1.2;
  }

  .stat-label {
    font-size: 0.9em;
    color: #7f8c8d;
    margin-top: 4px;
  }

  .stats-placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    min-height: 300px;
  }

  .placeholder-content {
    text-align: center;
    color: white;
  }

  .placeholder-icon {
    font-size: 4em;
    margin-bottom: 20px;
    opacity: 0.8;
  }

  .placeholder-content p {
    font-size: 1.2em;
    margin: 0;
    opacity: 0.9;
  }

  /* Recent sessions styles */
  .stats-recent-sessions {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 20px;
    margin-top: 20px;
  }

  .recent-session-list {
    max-height: 200px;
    overflow-y: auto;
    margin-top: 10px;
  }

  .recent-session-item {
    padding: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }

  .recent-session-item:last-child {
    border-bottom: none;
  }

  .recent-session-title {
    font-size: 1.1em;
    color: #fff;
    margin: 0;
  }

  .recent-session-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.9em;
    color: #ccc;
    margin-top: 4px;
  }

  .recent-session-time,
  .recent-session-duration {
    display: inline-block;
  }

  .recent-session-empty {
    color: #999;
    text-align: center;
    padding: 10px 0;
  }

  /* Recent Sessions scrollbar and card */
  :deep(.el-card__body) {
    padding: 0;
  }

  .stats-recent-sessions-el {
    height: 100%;
    width: 100%;
    min-width: 260px;
    margin-left: 10px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.08);
    padding: 18px 12px 12px 12px;
    display: flex;
    flex-direction: column;
  }

  .stats-recent-sessions-el h4 {
    margin: 0 0 10px 0;
    color: #409eff;
    border-bottom: 2px solid #f0f0f0;
    padding-bottom: 8px;
  }

  .recent-session-list-el {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .recent-session-card {
    padding: 7px 12px;
    border-radius: 8px;
    background: linear-gradient(90deg, #e3f0ff 0%, #f8fbff 100%);
    box-shadow: 0 1px 4px rgba(64, 158, 255, 0.07);
  }

  .recent-session-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .recent-session-title-el {
    font-weight: 500;
    color: #409eff;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .recent-session-time-el {
    color: #666;
    font-size: 0.95em;
    min-width: 110px;
  }

  .recent-session-duration-el {
    color: #67c23a;
    font-size: 1em;
    min-width: 60px;
    text-align: right;
  }

  .recent-session-empty-el {
    color: #999;
    text-align: center;
    padding: 10px 0;
  }

  .main-stats-container {
    display: flex;
    gap: 30px;
    height: 100%;
  }
</style>
