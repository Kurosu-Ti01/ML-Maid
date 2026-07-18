import { CHART_PALETTE } from './palette'

export const DarkTheme = {
    color: CHART_PALETTE,
    backgroundColor: 'rgba(0,0,0,0)',
    textStyle: {},
    title: {
        textStyle: {
            color: '#eeeeee'
        },
        subtextStyle: {
            color: '#aaaaaa'
        }
    },
    line: {
        itemStyle: {
            borderWidth: '2'
        },
        lineStyle: {
            width: '3'
        },
        symbolSize: '8',
        symbol: 'emptyCircle',
        smooth: false
    },
    radar: {
        itemStyle: {
            borderWidth: '2'
        },
        lineStyle: {
            width: '3'
        },
        symbolSize: '8',
        symbol: 'emptyCircle',
        smooth: false
    },
    bar: {
        itemStyle: {
            barBorderWidth: 0,
            barBorderColor: '#ccc'
        }
    },
    pie: {
        itemStyle: {
            borderWidth: 0,
            borderColor: '#ccc'
        }
    },
    scatter: {
        itemStyle: {
            borderWidth: 0,
            borderColor: '#ccc'
        }
    },
    boxplot: {
        itemStyle: {
            borderWidth: 0,
            borderColor: '#ccc'
        }
    },
    parallel: {
        itemStyle: {
            borderWidth: 0,
            borderColor: '#ccc'
        }
    },
    sankey: {
        itemStyle: {
            borderWidth: 0,
            borderColor: '#ccc'
        }
    },
    funnel: {
        itemStyle: {
            borderWidth: 0,
            borderColor: '#ccc'
        }
    },
    gauge: {
        itemStyle: {
            borderWidth: 0,
            borderColor: '#ccc'
        }
    },
    candlestick: {
        itemStyle: {
            color: '#e09834',
            color0: '#8fd3e8',
            borderColor: '#e09834',
            borderColor0: '#8fd3e8',
            borderWidth: '2'
        }
    },
    graph: {
        itemStyle: {
            borderWidth: 0,
            borderColor: '#ccc'
        },
        lineStyle: {
            width: '1',
            color: '#ffffff'
        },
        symbolSize: '8',
        symbol: 'emptyCircle',
        smooth: false,
        color: [
            '#dd6b66',
            '#759aa0',
            '#e69d87',
            '#8dc1a9',
            '#ea7e53',
            '#eedd78',
            '#73a373',
            '#73b9bc',
            '#7289ab',
            '#91ca8c',
            '#f49f42'
        ],
        label: {
            color: '#ffffff'
        }
    },
    map: {
        itemStyle: {
            areaColor: '#eeeeee',
            borderColor: '#999999',
            borderWidth: 0.5
        },
        label: {
            color: '#000000'
        },
        emphasis: {
            itemStyle: {
                areaColor: '#ffdb5c',
                borderColor: '#999999',
                borderWidth: 1
            },
            label: {
                color: '#ffffff'
            }
        }
    },
    geo: {
        itemStyle: {
            areaColor: '#eeeeee',
            borderColor: '#999999',
            borderWidth: 0.5
        },
        label: {
            color: '#000000'
        },
        emphasis: {
            itemStyle: {
                areaColor: '#ffdb5c',
                borderColor: '#999999',
                borderWidth: 1
            },
            label: {
                color: '#ffffff'
            }
        }
    },
    categoryAxis: {
        axisLine: {
            show: true,
            lineStyle: {
                color: '#6E7079'
            }
        },
        axisTick: {
            show: true,
            lineStyle: {
                color: '#6E7079'
            }
        },
        axisLabel: {
            show: true,
            color: '#6E7079'
        },
        splitLine: {
            show: false,
            lineStyle: {
                color: ['#E0E6F1']
            }
        },
        splitArea: {
            show: false,
            areaStyle: {
                color: ['rgba(250,250,250,0.2)', 'rgba(210,219,238,0.2)']
            }
        }
    },
    valueAxis: {
        axisLine: {
            show: false,
            lineStyle: {
                color: '#6E7079'
            }
        },
        axisTick: {
            show: false,
            lineStyle: {
                color: '#6E7079'
            }
        },
        axisLabel: {
            show: true,
            color: '#6E7079'
        },
        splitLine: {
            show: true,
            lineStyle: {
                color: ['#E0E6F1']
            }
        },
        splitArea: {
            show: false,
            areaStyle: {
                color: ['rgba(250,250,250,0.2)', 'rgba(210,219,238,0.2)']
            }
        }
    },
    logAxis: {
        axisLine: {
            show: false,
            lineStyle: {
                color: '#6E7079'
            }
        },
        axisTick: {
            show: false,
            lineStyle: {
                color: '#6E7079'
            }
        },
        axisLabel: {
            show: true,
            color: '#6E7079'
        },
        splitLine: {
            show: true,
            lineStyle: {
                color: ['#E0E6F1']
            }
        },
        splitArea: {
            show: false,
            areaStyle: {
                color: ['rgba(250,250,250,0.2)', 'rgba(210,219,238,0.2)']
            }
        }
    },
    timeAxis: {
        axisLine: {
            show: true,
            lineStyle: {
                color: '#6E7079'
            }
        },
        axisTick: {
            show: true,
            lineStyle: {
                color: '#6E7079'
            }
        },
        axisLabel: {
            show: true,
            color: '#6E7079'
        },
        splitLine: {
            show: false,
            lineStyle: {
                color: ['#E0E6F1']
            }
        },
        splitArea: {
            show: false,
            areaStyle: {
                color: ['rgba(250,250,250,0.2)', 'rgba(210,219,238,0.2)']
            }
        }
    },
    toolbox: {
        iconStyle: {
            borderColor: '#999999'
        },
        emphasis: {
            iconStyle: {
                borderColor: '#666666'
            }
        }
    },
    legend: {
        textStyle: {
            color: '#cccccc'
        }
    },
    tooltip: {
        axisPointer: {
            lineStyle: {
                color: '#cccccc',
                width: 1
            },
            crossStyle: {
                color: '#cccccc',
                width: 1
            }
        }
    },
    timeline: {
        lineStyle: {
            color: '#DAE1F5',
            width: 2
        },
        itemStyle: {
            color: '#A4B1D7',
            borderWidth: 1
        },
        controlStyle: {
            color: '#A4B1D7',
            borderColor: '#A4B1D7',
            borderWidth: 1
        },
        checkpointStyle: {
            color: '#316bf3',
            borderColor: '#ffffff'
        },
        label: {
            color: '#A4B1D7'
        },
        emphasis: {
            itemStyle: {
                color: '#ffffff'
            },
            controlStyle: {
                color: '#A4B1D7',
                borderColor: '#A4B1D7',
                borderWidth: 1
            },
            label: {
                color: '#A4B1D7'
            }
        }
    },
    visualMap: {
        color: ['#bf444c', '#d88273', '#f6efa6']
    },
    dataZoom: {
        handleSize: 'undefined%',
        textStyle: {}
    },
    markPoint: {
        label: {
            color: '#ffffff'
        },
        emphasis: {
            label: {
                color: '#ffffff'
            }
        }
    }
}
