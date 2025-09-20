<!-- 首页 -->
<script setup>
// 导入GeoJSON文件
import mapJson from '@/assets/China.json'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'

defineOptions({
  name: 'HomePage'
})

/* 创建ECharts示例 */
const chartContainer = ref(null)
const pageContainer = ref(null)
let chartInstance = null
let resizeObserver = null
// 默认缩放比例
const zoomLevel = ref(1.5)
// 最小和最大缩放
const MIN_ZOOM = 0.3
const MAX_ZOOM = 8
// 全部省会城市及其经纬度坐标
const geoCoordMap = {
  北京: [116.46, 39.92],
  上海: [121.48, 31.22],
  天津: [117.2, 39.13],
  重庆: [106.54, 29.59],
  哈尔滨: [126.63, 45.75],
  长春: [125.35, 43.88],
  沈阳: [123.38, 41.8],
  呼和浩特: [111.65, 40.82],
  石家庄: [114.48, 38.03],
  太原: [112.53, 37.87],
  济南: [117, 36.65],
  郑州: [113.65, 34.76],
  西安: [108.95, 34.27],
  兰州: [103.73, 36.03],
  西宁: [101.74, 36.56],
  银川: [106.27, 38.47],
  乌鲁木齐: [87.68, 43.77],
  合肥: [117.27, 31.86],
  南京: [118.78, 32.04],
  杭州: [120.19, 30.26],
  福州: [119.3, 26.08],
  南昌: [115.89, 28.68],
  长沙: [113, 28.21],
  武汉: [114.31, 30.52],
  广州: [113.23, 23.16],
  南宁: [108.33, 22.84],
  海口: [110.35, 20.02],
  成都: [104.06, 30.67],
  贵阳: [106.71, 26.57],
  昆明: [102.73, 25.04],
  拉萨: [91.11, 29.97],
  台北: [121.52, 25.03],
  香港: [114.17, 22.28],
  澳门: [113.54, 22.19]
}

/* 准备数据 */
// 数据流向模拟数据（后续通过api获取）
const flightLineData = [
  {
    sender: '北京',
    color: '#ffa022',
    lines: [
      {
        toName: '上海',
        value: 95,
        serverId: 'YL852',
        ip: '10.175.81.0',
        lastBizId: 'L6351',
        sourceTable: "[1, 'P6310', 3300]"
      },
      {
        toName: '广州',
        value: 90,
        serverId: 'YL853',
        ip: '10.175.81.1',
        lastBizId: 'L6352',
        sourceTable: "[2, 'P6311', 3301]"
      },
      {
        toName: '成都',
        value: 80,
        serverId: 'YL854',
        ip: '10.175.81.2',
        lastBizId: 'L6353',
        sourceTable: "[3, 'P6312', 3302]"
      },
      {
        toName: '西安',
        value: 70,
        serverId: 'YL855',
        ip: '10.175.81.3',
        lastBizId: 'L6354',
        sourceTable: "[4, 'P6313', 3303]"
      },
      {
        toName: '武汉',
        value: 60,
        serverId: 'YL856',
        ip: '10.175.81.4',
        lastBizId: 'L6355',
        sourceTable: "[5, 'P6314', 3304]"
      }
    ]
  },
  {
    sender: '上海',
    color: '#E6574C',
    lines: [
      {
        toName: '北京',
        value: 95,
        serverId: 'SH201',
        ip: '192.168.1.1',
        lastBizId: 'A1234',
        sourceTable: "[10, 'S500', 100]"
      },
      {
        toName: '重庆',
        value: 80,
        serverId: 'SH202',
        ip: '192.168.1.2',
        lastBizId: 'A1235',
        sourceTable: "[11, 'S501', 101]"
      },
      {
        toName: '天津',
        value: 70,
        serverId: 'SH203',
        ip: '192.168.1.3',
        lastBizId: 'A1236',
        sourceTable: "[12, 'S502', 102]"
      }
    ]
  },
  {
    sender: '广州',
    color: '#a6c84c',
    lines: [
      {
        toName: '北京',
        value: 95,
        serverId: 'GZ007',
        ip: '172.16.0.1',
        lastBizId: 'B9876',
        sourceTable: "[20, 'GZ10', 500]"
      },
      {
        toName: '杭州',
        value: 80,
        serverId: 'GZ008',
        ip: '172.16.0.2',
        lastBizId: 'B9877',
        sourceTable: "[21, 'GZ11', 501]"
      },
      {
        toName: '南京',
        value: 70,
        serverId: 'GZ009',
        ip: '172.16.0.3',
        lastBizId: 'B9878',
        sourceTable: "[22, 'GZ12', 502]"
      }
    ]
  }
]

// 颜色映射
const senderColorMap = new Map(flightLineData.map((item) => [item.sender, item.color]))
// 根据flightLineData动态生成发送地和接收地
const allSenders = [...new Set(flightLineData.map((d) => d.sender))]
const allReceivers = [...new Set(flightLineData.flatMap((d) => d.lines.map((l) => l.toName)))]
// 筛选纯粹的接收地（本身不是发送地）
const pureReceivers = allReceivers.filter((receiver) => !allSenders.includes(receiver))
// 数据转换函数：将数据流向数据转化为飞线图所需数据
const convertData = (senderName, lines) => {
  const fromCoord = geoCoordMap[senderName]
  if (!fromCoord) return []
  return lines
    .map((line) => {
      const toCoord = geoCoordMap[line.toName]
      if (toCoord) {
        return {
          fromName: senderName,
          toName: line.toName,
          coords: [fromCoord, toCoord],
          value: line.value,
          serverId: line.serverId,
          ip: line.ip,
          lastBizId: line.lastBizId,
          sourceTable: line.sourceTable
        }
      }
      return null
    })
    .filter(Boolean)
}

/* ECharts配置项 */
const getChartOption = (mapJson) => {
  // 注册地图数据
  echarts.registerMap('china', mapJson)
  return {
    // 背景色：透明
    backgroundColor: 'transparent',
    // 标题
    title: {
      text: '实时数据流转监控',
      left: 'center',
      top: '0px',
      textStyle: { color: '#e5eaf3', fontSize: 24 }
    },
    // 提示框
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      showDelay: 0,
      formatter: (params) => {
        // 去除省份的提示框
        if (params.componentType === 'geo' || params.componentSubType === 'map') {
          return false // 返回false完全阻止提示框显示
        }
        if (params.seriesType === 'scatter' || params.seriesType === 'effectScatter') {
          return `${params.name}<br/>经纬度: [${params.value[0]}, ${params.value[1]}]`
        }
        if (params.seriesType === 'lines') {
          const data = params.data
          return `
            <div style="text-align: left; line-height: 1.5;">
              <b style="font-size: 16px;">数据流转链路信息</b><br/>
              数据链路ID：${data.lastBizId}<br/>
              该链路数据量：${data.value}<br/>
              源数据列表：${data.sourceTable}<br/>
              代理服务器ID：${data.serverId}<br/>
              代理服务器所在地：${data.toName}<br/>
              代理服务器IP：${data.ip}
            </div>
          `
        }
        return false
      }
    },
    // 地理坐标系组件
    geo: {
      map: 'china',
      roam: true, // 开启缩放和平移
      zoom: zoomLevel.value, // 默认缩放比例
      center: [108.5, 34.3], // 地图中心点
      scaleLimit: { min: MIN_ZOOM, max: MAX_ZOOM }, // 限制缩放范围
      silent: true,
      label: {
        show: false // 不显示省份标签
      },
      itemStyle: {
        areaColor: '#1b1c1d', // 地图背景颜色
        borderColor: '#409eff', // 边界线颜色
        borderWidth: 1.5
      },
      emphasis: {
        disabled: true // 禁用省份悬停效果
        // label: {
        //   show: false
        // },
        // itemStyle: {
        //   areaColor: '#3B3E42'
        // }
      }
    },
    // 系列列表
    series: [
      // 第一层：省会的小亮点
      {
        name: '省会城市',
        type: 'scatter',
        coordinateSystem: 'geo',
        data: Object.keys(geoCoordMap).map((name) => ({
          name,
          value: geoCoordMap[name]
        })),
        symbolSize: 8,
        itemStyle: { color: '#1688FF' },
        emphasis: {
          scale: 2, // 悬停时放大为2倍
          itemStyle: {
            // color: '#1B5795'
            color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
              { offset: 0, color: '#1688FF' },
              { offset: 1, color: '#00FFFF' }
            ])
          }
        },
        zlevel: 3
      },
      // 发送点涟漪
      {
        name: '发送地',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: allSenders.map((name) => ({
          name,
          value: geoCoordMap[name].concat(100)
        })),
        symbolSize: 12,
        rippleEffect: { brushType: 'stroke', scale: 4 },
        itemStyle: {
          color: (params) => senderColorMap.get(params.data.name),
          shadowBlur: 10,
          shadowColor: (params) => senderColorMap.get(params.data.name)
        },
        emphasis: {
          scale: 1.5 // 悬停时放大为1.5倍
        },
        zlevel: 1005
      },
      // 接收地涟漪
      {
        name: '接收地',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: pureReceivers.map((name) => ({
          name,
          value: geoCoordMap[name].concat(50)
        })),
        symbolSize: 10,
        rippleEffect: { brushType: 'stroke', scale: 3 },
        itemStyle: { color: '#46bee9', shadowBlur: 8, shadowColor: '#46bee9' },
        emphasis: {
          scale: 1.5 // 悬停时放大为1.5倍
        },
        zlevel: 1004
      },
      // 第二层：数据流向动态飞线
      ...flightLineData.map((senderData, i) => ({
        name: senderData.sender + ' Top 流向',
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 100 + i,
        // 飞线特效配置
        effect: {
          show: true,
          period: 4, // 箭头运动的周期
          trailLength: 0, // 箭头尾迹长度（已去掉）
          symbol: 'arrow',
          symbolSize: 7
        },
        lineStyle: {
          color: senderData.color, // 对应的颜色
          width: 2, // 线条粗细
          opacity: 0.7, // 线条透明度
          curveness: 0.2 // 线的弯曲度
        },
        emphasis: {
          lineStyle: {
            width: 3.5
          }
        },
        data: convertData(senderData.sender, senderData.lines)
      }))
    ]
  }
}

/* 生命周期钩子 */
// 组件挂载后初始化图表
onMounted(() => {
  chartInstance = echarts.init(chartContainer.value)
  const option = getChartOption(mapJson)
  chartInstance.setOption(option)
  // 监听缩放事件，动态调整点的大小
  chartInstance.on('georoam', () => {
    const geo = chartInstance.getModel().getComponent('geo')
    if (geo) {
      let zoom = geo.option.zoom
      // 限制范围
      if (zoom < MIN_ZOOM) zoom = MIN_ZOOM // 限制最小缩放
      if (zoom > MAX_ZOOM) zoom = MAX_ZOOM // 限制最大缩放
      zoomLevel.value = zoom

      const scale = zoom * 0.75 // 每次缩放按0.75倍调整
      const newOption = chartInstance.getOption()
      newOption.series.forEach((series) => {
        if (series.type === 'scatter') {
          series.symbolSize = 6 * scale
        }
        if (series.type === 'effectScatter') {
          series.symbolSize = (series.name === '发送地' ? 15 : 10) * scale
        }
        if (series.type === 'lines') {
          series.lineStyle.width = 2.7 * scale
          series.effect.symbolSize = 6 * scale
          if (series.emphasis && series.emphasis.lineStyle) {
            series.emphasis.lineStyle.width = series.lineStyle.width * 2
          }
        }
      })
      chartInstance.setOption(newOption)
    }
  })
  // 监听双击事件，用于地图复位
  if (pageContainer.value) {
    pageContainer.value.addEventListener('dblclick', resetMap)
  }

  if (pageContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      // 当容器尺寸变化时，直接调用 ECharts 的 resize 方法
      chartInstance?.resize()
    })
    // 开始监听父容器
    resizeObserver.observe(pageContainer.value)
  }
})
// 组件卸载前销毁实例并移除监听
onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  if (pageContainer.value) {
    pageContainer.value.removeEventListener('dblclick', resetMap)
  }
  if (chartInstance) {
    chartInstance.dispose()
  }
})
// 图表自适应函数
// const resizeChart = () => chartInstance?.resize()

/* 选择缩放函数 */
const updateZoom = (val) => {
  if (val < MIN_ZOOM || val > MAX_ZOOM) {
    ElMessage.warning(`缩放比例必须在 ${MIN_ZOOM} ~ ${MAX_ZOOM} 之间`)
    return
  }
  zoomLevel.value = val

  const scale = val * 0.75 // 缩放比例，和georoam保持一致
  const newOption = chartInstance.getOption()
  newOption.series.forEach((series) => {
    if (series.type === 'scatter') {
      series.symbolSize = 6 * scale
    }
    if (series.type === 'effectScatter') {
      series.symbolSize = (series.name === '发送地' ? 15 : 10) * scale
    }
    if (series.type === 'lines') {
      series.lineStyle.width = 2.7 * scale
      series.effect.symbolSize = 6 * scale
      if (series.emphasis && series.emphasis.lineStyle) {
        series.emphasis.lineStyle.width = series.lineStyle.width * 2
      }
    }
  })

  chartInstance.setOption({
    geo: { zoom: val },
    series: newOption.series
  })
}

/* 地图复位函数 */
const resetMap = () => {
  const defaultZoom = 1.5
  const defaultCenter = [108.5, 34.3]
  zoomLevel.value = defaultZoom

  const scale = defaultZoom * 0.75
  const newOption = chartInstance.getOption()
  newOption.series.forEach((series) => {
    if (series.type === 'scatter') {
      series.symbolSize = 6 * scale
    }
    if (series.type === 'effectScatter') {
      series.symbolSize = (series.name === '发送地' ? 15 : 10) * scale
    }
    if (series.type === 'lines') {
      series.lineStyle.width = 2.7 * scale
      series.effect.symbolSize = 6 * scale
      if (series.emphasis && series.emphasis.lineStyle) {
        series.emphasis.lineStyle.width = series.lineStyle.width * 2
      }
    }
  })

  chartInstance.setOption({
    geo: {
      zoom: defaultZoom,
      center: defaultCenter
    },
    series: newOption.series
  })
}
</script>

<template>
  <div class="chart-page" ref="pageContainer">
    <div ref="chartContainer" class="chart-container"></div>
    <!-- 缩放控制器 -->
    <div class="zoom-control">
      <el-input-number
        v-model="zoomLevel"
        :min="MIN_ZOOM"
        :max="MAX_ZOOM"
        :step="0.1"
        :precision="1"
        size="default"
        @change="(val) => updateZoom(val)"
      />
    </div>
  </div>
</template>

<style scoped>
/* 整个界面宽高设置 */
.chart-page {
  width: 100%;
  height: calc(100vh - 125px);
  position: relative;
}
.chart-container {
  width: 100%;
  height: 100%;
}
/* 缩放控制器位置 */
.zoom-control {
  color: aliceblue;
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 10;
}
</style>
