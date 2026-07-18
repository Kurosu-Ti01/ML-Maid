// Shared ECharts palette for light and dark themes.
// Brand-anchored categorical colors ordered for adjacent-hue separation;
// hues chosen to survive both light and dark chart backgrounds.
export const CHART_PALETTE = [
    '#4080ff', // brand blue
    '#18a058', // green
    '#f0a020', // amber
    '#e05252', // red
    '#a174e9', // purple (matches --color-playtime accent)
    '#13b8a6', // teal
    '#ec6aa0', // pink
    '#6699ff', // light blue
    '#8f9d3a', // olive
    '#f4845f' // coral
]

// Sequential ramps for the year heatmap (calendar visualMap inRange),
// derived from the brand primary hue.
export const HEATMAP_RANGE_LIGHT = ['#e6eeff', '#3268d9']
export const HEATMAP_RANGE_DARK = ['#1d2842', '#6699ff']
