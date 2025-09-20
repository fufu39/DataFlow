<!-- 用户数据详情界面 -->
<script setup>
import { ref, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
// 导入图标
import { Plus, Minus, Aim } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import 'echarts-gl'

// 导入echart-gl所需图片
import earthTexture from '@/assets/earth.jpg'
import earthDarkTexture from '@/assets/earth-dark.jpg' // 黑暗地球
import heightTexture from '@/assets/bathymetry.jpg'
import starfieldTextture from '@/assets/starfield.jpg'

// 为组件设置名称
defineOptions({
  name: 'UserDetail'
})
const route = useRoute()
const userId = ref('')

// --- ECharts 图表引用 ---
const sentChartRef = ref(null)
const receivedChartRef = ref(null)
const sentTypeChartRef = ref(null)
const receivedTypeChartRef = ref(null)
const globeContainerRef = ref(null) // 地球图表的引用
let sentChart = null
let receivedChart = null
let sentTypeChart = null
let receivedTypeChart = null
let globeChart = null // 地球图表实例
// 添加ResizeObserver
const dashboardGridRef = ref(null)
let resizeObserver = null
// 跟踪地球纹理状态
const isDarkTexture = ref(false)
// 定义个人数据
const totalSent = ref(0) //本月发送
const totalReceived = ref(0) //本月接收
const avgLatency = ref(0) //平均延迟

// --- 数据模拟（后续替换为api获取） ---
// 个人数据模拟数据
const finSent = 125
const finReceived = 318
const finLatency = 28
// 折线图模拟数据
const lineData1 = [110, 20, 80, 55, 75, 70, 125]
const lineData2 = [85, 35, 70, 105, 90, 105, 75]
// 饼图模拟数据
const pieData1 = [
  { value: 1048, name: 'Parquet' },
  { value: 735, name: 'JSON' },
  { value: 580, name: 'CSV' }
]
const pieData2 = [
  { value: 335, name: 'Avro' },
  { value: 484, name: 'XML' },
  { value: 325, name: '其他' }
]
// 颜色映射表
const dataTypeColorMap = {
  Parquet: '#3498DB',
  JSON: '#9B59B6',
  CSV: '#2ECC71',
  XML: '#DCC152',
  Avro: '#DD7369',
  其他: '#495CCB'
}
// 近期传输记录模拟数据
const transferLog = ref([
  { time: '10:35:12', direction: '发送', target: '乌鲁木齐', type: 'Parquet', status: '成功' },
  { time: '10:33:45', direction: '接收', target: '北京', type: 'JSON', status: '成功' },
  { time: '10:31:50', direction: '发送', target: '上海', type: 'CSV', status: '成功' },
  { time: '10:29:56', direction: '发送', target: '广州', type: '其他', status: '失败' },
  { time: '10:28:14', direction: '接收', target: '成都', type: 'XML', status: '成功' },
  { time: '10:27:02', direction: '发送', target: '拉萨', type: 'Parquet', status: '成功' },
  { time: '10:26:51', direction: '发送', target: '哈尔滨', type: 'Avro', status: '成功' },
  { time: '10:25:51', direction: '接收', target: '武汉', type: 'Avro', status: '成功' },
  { time: '10:24:30', direction: '发送', target: '沈阳', type: 'JSON', status: '成功' },
  { time: '10:22:18', direction: '接收', target: '昆明', type: 'Parquet', status: '成功' },
  { time: '10:20:45', direction: '发送', target: '福州', type: 'XML', status: '成功' },
  { time: '10:19:03', direction: '接收', target: '济南', type: 'JSON', status: '成功' },
  { time: '10:17:55', direction: '发送', target: '郑州', type: 'Parquet', status: '成功' },
  { time: '10:16:21', direction: '发送', target: '呼和浩特', type: 'CSV', status: '成功' },
  { time: '10:15:09', direction: '接收', target: '兰州', type: 'JSON', status: '成功' }
])
// 全部城市经纬度
const allCoords = {
  北京: [116.4, 39.9],
  上海: [121.47, 31.23],
  天津: [117.2, 39.13],
  重庆: [106.55, 29.56],
  石家庄: [114.5, 38.03],
  太原: [112.53, 37.87],
  呼和浩特: [111.65, 40.82],
  沈阳: [123.38, 41.8],
  长春: [125.35, 43.88],
  哈尔滨: [126.63, 45.75],
  南京: [118.78, 32.04],
  杭州: [120.19, 30.26],
  合肥: [117.27, 31.86],
  福州: [119.3, 26.08],
  南昌: [115.89, 28.68],
  济南: [117.0, 36.65],
  郑州: [113.65, 34.76],
  武汉: [114.31, 30.52],
  长沙: [112.98, 28.19],
  广州: [113.26, 23.12],
  南宁: [108.33, 22.84],
  海口: [110.35, 20.02],
  成都: [104.06, 30.67],
  贵阳: [106.71, 26.57],
  昆明: [102.73, 25.04],
  拉萨: [91.11, 29.67],
  西安: [108.95, 34.26],
  兰州: [103.73, 36.03],
  西宁: [101.74, 36.56],
  银川: [106.27, 38.47],
  乌鲁木齐: [87.68, 43.77],
  香港: [114.17, 22.28],
  澳门: [113.54, 22.19],
  台北: [121.52, 25.03]
}
// 散点图城市经纬度
const cityCoords = {
  哈尔滨: allCoords['哈尔滨'],
  沈阳: allCoords['沈阳'],
  北京: allCoords['北京'],
  呼和浩特: allCoords['呼和浩特'],
  上海: allCoords['上海'],
  济南: allCoords['济南'],
  福州: allCoords['福州'],
  武汉: allCoords['武汉'],
  郑州: allCoords['郑州'],
  广州: allCoords['广州'],
  成都: allCoords['成都'],
  昆明: allCoords['昆明'],
  拉萨: allCoords['拉萨'],
  乌鲁木齐: allCoords['乌鲁木齐'],
  兰州: allCoords['兰州'],
  西安: allCoords['西安']
}

// --- ECharts 配置 ---
// 通用折线图配置
const baseLineOption = {
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderColor: '#3a3d40',
    textStyle: { color: '#e5eaf3' }
  },
  grid: { left: '12%', right: '5%', top: '15%', bottom: '15%' },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    axisLine: { lineStyle: { color: '#3a3d40' } },
    axisLabel: { color: '#a0aec0', fontSize: 10 }
  },
  yAxis: {
    type: 'value',
    axisLine: { show: true, lineStyle: { color: '#3a3d40' } },
    axisLabel: { color: '#a0aec0', fontSize: 10 },
    splitLine: { lineStyle: { color: '#2d3748', type: 'dashed' } }
  }
}
// 通用饼图配置
const basePieOption = {
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderColor: '#3a3d40',
    textStyle: { color: '#e5eaf3' }
  },
  legend: {
    bottom: '2%',
    left: 'center',
    textStyle: { color: '#a0aec0', fontSize: 10 },
    itemGap: 10,
    itemWidth: 10,
    itemHeight: 10
  },
  series: [
    {
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 5, borderColor: '#0d1117', borderWidth: 2 },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: '16', fontWeight: 'bold', color: '#e5eaf3' }
      },
      labelLine: { show: false }
    }
  ]
}

// 地球飞线图的函数
function initGlobeChart() {
  const localCity = '西安' //中心地

  // 【根据传输记录】生成飞线数据
  const linesData = transferLog.value
    .filter((item) => item.target !== localCity)
    .map((item) => {
      const fromCoord = item.direction === '发送' ? allCoords[localCity] : allCoords[item.target]
      const toCoord = item.direction === '发送' ? allCoords[item.target] : allCoords[localCity]
      return {
        coords: [fromCoord, toCoord],
        lineStyle: {
          // 调整飞线颜色
          // color: item.direction === '发送' ? '#3498db' : '#2ecc71'
          color: item.direction === '发送' ? '#0099FF' : '#00FF6C'
        }
      }
    })

  // 将发送接收节点cityCoords转化为Echarts散点图所需数据格式
  const pointsData = Object.keys(cityCoords).map((city) => {
    return {
      name: city,
      value: cityCoords[city]
    }
  })

  // 星空环境背景配置(可选)
  // function createStarfield({
  //   width = 2048, // 画布宽度
  //   height = 1024, // 画布高度
  //   starCount = 2500, // 星星数量
  //   minSize = 0.2, // 星星最小半径
  //   maxSize = 0.4, // 星星最大半径
  //   background = '#000', // 背景色
  //   color = '#ffffff' // 星星颜色
  // } = {}) {
  //   const canvas = document.createElement('canvas')
  //   canvas.width = width
  //   canvas.height = height
  //   const ctx = canvas.getContext('2d')

  //   // 背景
  //   ctx.fillStyle = background
  //   ctx.fillRect(0, 0, width, height)
  //   // 画星星
  //   ctx.fillStyle = color
  //   for (let i = 0; i < starCount; i++) {
  //     const x = Math.random() * width
  //     const y = Math.random() * height
  //     const size = Math.random() * (maxSize - minSize) + minSize // 控制星点大小范围
  //     ctx.beginPath()
  //     ctx.arc(x, y, size, 0, Math.PI * 2)
  //     ctx.fill()
  //   }
  //   return canvas
  // }

  // 作为Echarts地球初始视角中心点
  const chinaCenterCoord = [108.95, 34.26]
  // 地球初始化及核心配置函数
  globeChart = echarts.init(globeContainerRef.value)

  const option = {
    backgroundColor: 'transparent',
    globe: {
      baseTexture: earthTexture, // 表面基础纹理图片
      heightTexture: heightTexture, // 灰度图增加凹凸感和真实感
      atmosphere: {
        show: true, // 开启大气层
        color: '#184573' //大气层光晕颜色
      },
      // 宇宙星空背景图片
      environment: starfieldTextture,
      // environment: createStarfield({
      //   starCount: 4000,  // 调少一点星星
      //   minSize: 0.3,     // 更小的星点
      //   maxSize: 0.2
      // }),
      shading: 'realistic', // 启动物理真实感渲染
      realisticMaterial: {
        // 微调地球表面物理材质属性
        roughness: 0.8, // 表面粗糙度
        metalness: 0.85 //金属感，0为非金属
      },
      postEffect: {
        // 启用后期处理特效，如景深、辉光等效果
        enable: true
      },
      // 配置光照
      light: {
        main: {
          intensity: 2.0, // 光照强度
          shadow: true, // 开启阴影
          color: '#ffffff' // 白色光源
        },
        ambient: {
          intensity: 0.8 // 环境光，照亮地球暗部（如背面）
        }
      },
      // 配置用户交互控制
      viewControl: {
        autoRotate: false, // 关闭自动旋转
        targetCoord: chinaCenterCoord, // 设置初始相机对准目标
        distance: 140, // 初始相机和地球表面距离
        minDistance: 50, // 最近距离
        maxDistance: 250 // 最远距离
      }
    },
    // 定义了需要绘制的数据图层
    series: [
      // 第一层：3D飞线图
      {
        type: 'lines3D',
        coordinateSystem: 'globe',
        // 动态特效
        effect: {
          show: true,
          trailLength: 0.5, // 拖尾长度
          symbol: 'arrow', // 效果形状为箭头
          symbolSize: 4 // 箭头大小
        },
        // 静态样式
        lineStyle: {
          width: 2.5, // 线宽
          opacity: 0.9
        },
        data: linesData // 前面处理的飞线数据
      },
      // 第二层：3D散点图
      {
        type: 'scatter3D',
        coordinateSystem: 'globe',
        symbolSize: 8, // 散点大小
        itemStyle: {
          color: '#e74c3c', // 散点颜色
          opacity: 0.95
        },
        label: {
          show: true,
          formatter: '{b}', // 标签内容使用数据中的name字段
          position: 'top', // 标签位置
          color: '#000', // 标签文字颜色
          fontSize: 12,
          backgroundColor: 'rgba(255,255,255,0.7)', // 背景
          padding: [2, 4],
          borderRadius: 3 // 圆角
        },
        data: pointsData // 前面处理的城市坐标数据
      }
    ]
  }
  // 将配置应用到Echarts示例上，完成渲染
  globeChart.setOption(option)
}

// --- 生命周期钩子 ---
const allCharts = shallowRef([])
onMounted(() => {
  userId.value = route.query.userId || '未知'
  // 启动数字动画，从0滚动到目标值
  animateValue(totalSent, 0, finSent, 2000)
  animateValue(totalReceived, 0, finReceived, 2000)
  animateValue(avgLatency, 0, finLatency, 2000)

  // 初始化图表
  // 折线图：数据发送量趋势 (GB)
  sentChart = echarts.init(sentChartRef.value) // 通过ref获取DOM元素并创建ECharts实例
  sentChart.setOption({
    ...baseLineOption, //采用通用折线图样式
    series: [
      {
        name: '发送量 (GB)',
        type: 'line',
        smooth: true,
        data: lineData1, //模拟数据
        itemStyle: { color: '#4e9ce9' },
        // 折线图下方渐变区域填充
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(78, 156, 233, 0.6)' },
            { offset: 1, color: 'rgba(78, 156, 233, 0)' }
          ])
        }
      }
    ]
  })
  // 折线图：数据接收量趋势 (GB)
  receivedChart = echarts.init(receivedChartRef.value)
  receivedChart.setOption({
    ...baseLineOption,
    series: [
      {
        name: '接收量 (GB)',
        type: 'line',
        smooth: true,
        data: lineData2,
        itemStyle: { color: '#48bb78' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(72, 187, 120, 0.6)' },
            { offset: 1, color: 'rgba(72, 187, 120, 0)' }
          ])
        }
      }
    ]
  })
  // 饼图；发送数据类型
  sentTypeChart = echarts.init(sentTypeChartRef.value)
  const sentPieColors = pieData1.map((item) => dataTypeColorMap[item.name])
  sentTypeChart.setOption({
    ...basePieOption,
    series: [
      {
        ...basePieOption.series[0],
        name: '发送类型',
        data: pieData1,
        color: sentPieColors
      }
    ]
  })
  // 饼图；接收数据类型
  receivedTypeChart = echarts.init(receivedTypeChartRef.value)
  const receivedPieColors = pieData2.map((item) => dataTypeColorMap[item.name])
  receivedTypeChart.setOption({
    ...basePieOption,
    series: [
      {
        ...basePieOption.series[0],
        name: '接收类型',
        data: pieData2,
        color: receivedPieColors
      }
    ]
  })

  initGlobeChart()

  allCharts.value = [sentChart, receivedChart, sentTypeChart, receivedTypeChart, globeChart]

  // window.addEventListener('resize', handleResize)
  resizeObserver = new ResizeObserver(handleResize)
  if (dashboardGridRef.value) {
    resizeObserver.observe(dashboardGridRef.value)
  }
})

onBeforeUnmount(() => {
  // window.removeEventListener('resize', handleResize)
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  // 销毁所有ECharts实例
  allCharts.value.forEach((chart) => chart?.dispose())
})

// --- 工具函数 ---
// 窗口大小变化时要执行的逻辑
const handleResize = () => {
  allCharts.value.forEach((chart) => chart?.resize()) // 图表实例全部重新计算尺寸适应容器大小
}

// 创建数字滚动动画函数
function animateValue(targetRef, start, end, duration) {
  let startTimestamp = null
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp
    const progress = Math.min((timestamp - startTimestamp) / duration, 1)
    targetRef.value = Math.floor(progress * (end - start) + start)
    if (progress < 1) {
      window.requestAnimationFrame(step)
    }
  }
  window.requestAnimationFrame(step)
}

// 悬停按钮
const showReset = ref(false)
// 单击按钮复位地球视角
function resetGlobeView() {
  if (!globeChart) return
  globeChart.setOption({
    globe: {
      viewControl: {
        targetCoord: [108.95, 34.26],
        distance: 140
      }
    }
  })
}
// 双击切换地球纹理
function toggleGlobeTexture() {
  if (!globeChart) return
  // 切换状态
  isDarkTexture.value = !isDarkTexture.value
  // 根据当前状态设置新的纹理、大气层、光照配置
  if (isDarkTexture.value) {
    // 如果是黑暗纹理
    globeChart.setOption({
      globe: {
        baseTexture: earthDarkTexture,
        // 隐藏大气层
        atmosphere: {
          show: false
        },
        light: {
          ambient: {
            // 增强环境光，让暗部更亮
            intensity: 20
          }
        }
      }
    })
  } else {
    // 恢复默认状态
    globeChart.setOption({
      globe: {
        baseTexture: earthTexture,
        // 恢复大气层
        atmosphere: {
          show: true,
          color: '#184573'
        },
        light: {
          ambient: {
            intensity: 0.8
          }
        }
      }
    })
  }
}

// 地球视角控制函数
const ZOOM_FACTOR = 1.3 // 缩放因子（数值越大，每次缩放幅度越大）
const MIN_DISTANCE = 50
const MAX_DISTANCE = 250

// 放大地球（靠近）
function zoomIn() {
  if (!globeChart) return
  const option = globeChart.getOption()
  const currentDistance = option.globe[0].viewControl.distance
  const newDistance = Math.max(MIN_DISTANCE, currentDistance / ZOOM_FACTOR)

  globeChart.setOption({
    globe: {
      viewControl: {
        distance: newDistance
      }
    }
  })
}
// 缩小地球（远离）
function zoomOut() {
  if (!globeChart) return
  const option = globeChart.getOption()
  const currentDistance = option.globe[0].viewControl.distance
  const newDistance = Math.min(MAX_DISTANCE, currentDistance * ZOOM_FACTOR)

  globeChart.setOption({
    globe: {
      viewControl: {
        distance: newDistance
      }
    }
  })
}
</script>

<template>
  <div class="user-dashboard-container">
    <div class="dashboard-grid" ref="dashboardGridRef">
      <!-- 左 -->
      <div class="column left-column">
        <div class="tech-card">
          <div class="card-header">
            <h3>个人数据概览 (ID: {{ userId }})</h3>
            <div class="header-decoration"></div>
          </div>
          <div class="card-content">
            <div class="overview-stats">
              <div class="stat-item">
                <div class="stat-value">{{ totalSent.toLocaleString() }} GB</div>
                <div class="stat-label">本月发送</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ totalReceived.toLocaleString() }} GB</div>
                <div class="stat-label">本月接收</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ avgLatency }} ms</div>
                <div class="stat-label">平均延迟</div>
              </div>
            </div>
          </div>
        </div>
        <div class="tech-card" style="flex-grow: 1">
          <div class="card-header">
            <h3>数据发送量趋势 (GB)</h3>
            <div class="header-decoration"></div>
          </div>
          <div class="card-content chart-container">
            <div
              ref="sentChartRef"
              style="
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                margin-top: -30px;
              "
            ></div>
          </div>
        </div>
        <div class="tech-card" style="flex-grow: 1">
          <div class="card-header">
            <h3>数据接收量趋势 (GB)</h3>
            <div class="header-decoration"></div>
          </div>
          <div class="card-content chart-container">
            <div
              ref="receivedChartRef"
              style="
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                margin-top: -30px;
              "
            ></div>
          </div>
        </div>
      </div>

      <!-- 中 -->
      <div
        class="column center-column"
        @mouseenter="showReset = true"
        @mouseleave="showReset = false"
        style="position: relative"
      >
        <div class="globe-wrapper" ref="globeContainerRef"></div>
        <!-- 悬停显示按钮 -->
        <transition name="fade-slide">
          <el-button-group v-if="showReset" class="globe-controls">
            <el-button size="default" :icon="Minus" title="缩小" @click="zoomOut" />
            <el-button
              size="default"
              :icon="Aim"
              title="复位"
              @click="resetGlobeView"
              @dblclick="toggleGlobeTexture"
            />
            <el-button size="default" :icon="Plus" title="放大" @click="zoomIn" />
          </el-button-group>
        </transition>
      </div>

      <!-- 右 -->
      <div class="column right-column">
        <div class="tech-card">
          <div class="card-header">
            <h3>发送数据类型</h3>
            <div class="header-decoration"></div>
          </div>
          <div class="card-content chart-container">
            <div ref="sentTypeChartRef" style="width: 100%; height: 100%"></div>
          </div>
        </div>
        <div class="tech-card">
          <div class="card-header">
            <h3>接收数据类型</h3>
            <div class="header-decoration"></div>
          </div>
          <div class="card-content chart-container">
            <div ref="receivedTypeChartRef" style="width: 100%; height: 100%"></div>
          </div>
        </div>
        <div class="tech-card" style="flex-grow: 1">
          <div class="card-header">
            <h3>近期传输记录</h3>
            <div class="header-decoration"></div>
          </div>
          <div class="card-content table-wrapper">
            <el-table :data="transferLog" style="width: 100%" height="100%">
              <el-table-column prop="time" label="时间" align="center" />
              <el-table-column prop="direction" label="方向" align="center" />
              <el-table-column prop="target" label="目标节点" align="center" />
              <el-table-column prop="status" label="状态" align="center">
                <template #default="{ row }">
                  <span :class="row.status === '成功' ? 'status-success' : 'status-fail'">
                    {{ row.status }}
                  </span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* --- 整体布局 --- */
.user-dashboard-container {
  width: 100%;
  height: calc(100% - 18px);
  background-color: #0d1117;
  padding: 20px;
  box-sizing: border-box;
  box-shadow: 0 0 15px 3px rgba(138, 138, 138, 0.3);
  border-radius: 4px;
}

.dashboard-grid {
  display: grid;
  /* 列分配 */
  grid-template-columns: 2.5fr 5fr 2.5fr;
  grid-template-rows: 1fr;
  gap: 0px;
  width: 100%;
  height: 100%;
}

.column {
  display: flex;
  flex-direction: column;
  gap: 15px;
  height: 100%;
  min-height: 0;
}

/* --- 科技感卡片通用样式 --- */
.tech-card {
  background-color: rgba(13, 27, 42, 0.8);
  border: 1px solid #1c3a59;
  border-radius: 4px;
  padding: 13px 20px;
  position: relative;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(5px);
  z-index: 9;
  flex-grow: 0;
}
/* 左上、右下边框样式 */
.tech-card::before,
.tech-card::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  border-color: #4e9ce9;
  border-style: solid;
  transition: all 0.3s ease;
}
.tech-card::before {
  top: -2px;
  left: -2px;
  border-width: 2px 0 0 2px;
}
.tech-card::after {
  bottom: -2px;
  right: -2px;
  border-width: 0 2px 2px 0;
}

.card-header {
  margin-bottom: 15px;
  position: relative;
}
.card-header h3 {
  color: #e5eaf3;
  font-size: 16px;
  margin: 0;
  padding-bottom: 5px;
  border-bottom: 1px solid #1c3a59;
}
.header-decoration {
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 50px;
  height: 2px;
  background-color: #4e9ce9;
  box-shadow: 0 0 5px #4e9ce9;
  animation: scan-line 4s linear infinite;
}
@keyframes scan-line {
  0% {
    transform: translateX(-100%);
    opacity: 0;
  }
  25% {
    opacity: 1;
  }
  75% {
    transform: translateX(calc(100% + 150px));
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.card-content {
  flex-grow: 1;
  position: relative;
  min-height: 0;
}
.chart-container {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
}

/* 设置表格高度 */
.table-wrapper {
  max-height: calc(100vh - 18px - 344px - 285px);
  overflow-y: auto;
}

/* --- 特定模块样式 --- */
.overview-stats {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 100%;
}
.stat-item {
  text-align: center;
}
.stat-value {
  color: #4e9ce9;
  font-size: 24px;
  font-weight: bold;
  font-family: 'DS-Digital', sans-serif;
}
.stat-label {
  color: #a0aec0;
  font-size: 12px;
  margin-top: 5px;
}

/* --- 地球样式 --- */
.center-column {
  justify-content: center;
  align-items: center;
}
.globe-wrapper {
  width: 100%;
  height: 100%;
  max-width: none;
  aspect-ratio: unset;
  position: relative;
  cursor: grab;
}

.globe-wrapper:active {
  cursor: grabbing;
}

/* --- 表格样式深度定制 --- */
.tech-card :deep(.el-table) {
  background-color: transparent;
  color: #a0aec0;
  --el-table-border-color: #1c3a59;
  --el-table-header-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-row-hover-bg-color: rgba(78, 156, 233, 0.1);
}
.tech-card :deep(.el-table th),
.tech-card :deep(.el-table td) {
  background-color: transparent !important;
  border-color: #1c3a59;
  padding: 8px 0;
  font-size: 12px;
  text-align: center;
}
.tech-card :deep(.el-table th) {
  color: #4e9ce9;
}
.tech-card :deep(.el-table--enable-row-hover .el-table__body tr:hover > td) {
  background-color: rgba(78, 156, 233, 0.1);
}
.tech-card :deep(.el-table__inner-wrapper::before) {
  display: none;
}
.status-success {
  color: #48bb78;
}
.status-fail {
  color: #e53e3e;
}

/* 悬停按钮 */
.globe-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  backdrop-filter: blur(5px);
}

/* 定制组合按钮样式 */
.globe-controls :deep(.el-button) {
  background-color: rgba(20, 20, 20, 0.7) !important;
  border-color: #555555 !important;
  color: #cccccc;
  transition: all 0.3s ease;
}
.globe-controls :deep(.el-button:hover) {
  background-color: rgba(230, 230, 230, 0.2) !important;
  border-color: #fff !important;
  color: #fff !important;
}
/* .globe-controls :deep(.el-button) {
  background-color: rgba(13, 27, 42, 0.7) !important;
  border-color: #1c3a59 !important;
  color: #c1c8d3;
}
.globe-controls :deep(.el-button:hover) {
  background-color: rgba(78, 156, 233, 0.3) !important;
  border-color: #4e9ce9 !important;
  color: #4e9ce9 !important;
} */

/* transition过渡效果 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
.fade-slide-enter-to,
.fade-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
