<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ref, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'

defineOptions({
  name: 'WorkDetailPage'
})

const route = useRoute()
const router = useRouter()

// --- 信息处理 ---
// 存储从路由参数接收到的数据详情
const dataInfo = ref({})
// 定义一个辅助函数，用于根据敏感等级返回不同的Tag
const getTagType = (level) => {
  switch (level) {
    case '核心':
      return 'danger'
    case '重要':
      return 'warning'
    case '一般':
      return 'primary'
    default:
      return 'info'
  }
}

// --- 节点 ---
// Tooltip内容模拟生成
const getTooltipHtml = (d) => {
  const identities = {
    source: '数据所有者',
    platform: '数据提供者',
    intermediate: '数据消费者',
    destination: '数据使用者'
  }
  const identity = identities[d.type] || '数据使用者'
  return `
    <div class="tooltip-title">${d.name}信息</div>
    <div class="tooltip-content">
      <div>1. 流转ID：&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${d.nodeId}</div>
      <div>2. 数据发送方：${d.senderNodeIds}</div>
      <div>3. 数据接收方：${d.receiverNodeIds}</div>
      <div>4. 节点身份：&nbsp;&nbsp;&nbsp;${identity}</div>
      <div>5. 流转时间：&nbsp;&nbsp;&nbsp;${d.mockTime}</div>
    </div>
  `
}

// 定义节点数据
const nodes = ref([
  // Layer 0: 源节点 (3个)
  { id: 'source-1', name: '源节点1', nodeId: 'AAU01', layer: 0, type: 'source' },
  { id: 'source-2', name: '源节点2', nodeId: 'AAU02', layer: 0, type: 'source' },
  { id: 'source-3', name: '源节点3', nodeId: 'AAU03', layer: 0, type: 'source' },

  // Layer 1: 平台节点 (1个)
  { id: 'platform-1', name: '平台节点', nodeId: 'CCU33', layer: 1, type: 'platform' },

  // Layer 2: 中间节点 (1个)
  { id: 'intermediate-1', name: '中间节点', nodeId: 'VYU13', layer: 2, type: 'intermediate' },

  // Layer 3: 目的节点 (1个)
  { id: 'dest-1', name: '目的节点', nodeId: 'BKM08', layer: 3, type: 'destination' }
])

// 定义连接线数据
const links = ref([
  // 3个源节点连接到1个平台节点
  { source: 'source-1', target: 'platform-1' },
  { source: 'source-2', target: 'platform-1' },
  { source: 'source-3', target: 'platform-1' },

  // 主干链路
  { source: 'platform-1', target: 'intermediate-1' },
  { source: 'intermediate-1', target: 'dest-1' }
])

// 给提示框添加发送方和接收方数据
const nodeMapForIdLookup = new Map(nodes.value.map((n) => [n.id, n.nodeId]))
const sendersMap = new Map()
const receiversMap = new Map()
links.value.forEach(({ source, target }) => {
  if (!receiversMap.has(source)) receiversMap.set(source, [])
  if (!sendersMap.has(target)) sendersMap.set(target, [])
  receiversMap.get(source).push(nodeMapForIdLookup.get(target))
  sendersMap.get(target).push(nodeMapForIdLookup.get(source))
})
nodes.value.forEach((node) => {
  node.senderNodeIds = (sendersMap.get(node.id) || []).join(', ') || '无'
  node.receiverNodeIds = (receiversMap.get(node.id) || []).join(', ') || '无'
  node.mockTime = new Date(Date.now() - Math.random() * 10000000000)
    .toLocaleString('sv-SE', { hour12: false })
    .replace('T', ' ')
})

// 定义节点类型与颜色的映射
const typeColors = {
  source: '#409EFF', // 蓝色
  platform: '#67C23A', // 绿色
  intermediate: '#E6A23C', // 黄色
  destination: '#F56C6C' // 红色
}

const svgContainer = ref(null)
const tooltip = ref(null)
// 存储定时器和D3的变换状态
let animationInterval = null
let initialTransform = d3.zoomIdentity

// 返回上一页的函数
const goBack = () => {
  router.back()
}

onMounted(() => {
  dataInfo.value = {
    businessId: route.query.businessId,
    senderId: route.query.senderId,
    receiverId: route.query.receiverId,
    businessType: route.query.businessType,
    dataSource: route.query.dataSource,
    dataUsage: route.query.dataUsage,
    sensitivityLevel: route.query.sensitivityLevel,
    circulationTime: route.query.circulationTime
  }
  if (svgContainer.value) {
    initChart(svgContainer.value) // 如果SVG容器存在，则初始化图表
  }
})

onUnmounted(() => {
  if (animationInterval) {
    clearInterval(animationInterval) // 清理动画定时器
  }
})

// D3绘图逻辑
const initChart = (svgElement) => {
  // 选择SVG元素并清空其内容，防止热更新时重复绘制
  const svg = d3.select(svgElement)
  svg.selectAll('*').remove()

  // 获取SVG容器的实际宽高，并设置 viewBox 以实现响应式缩放
  const width = svgElement.clientWidth
  const height = svgElement.clientHeight
  svg.attr('viewBox', [0, 0, width, height])

  // 动态计算节点位置
  const layers = [...new Set(nodes.value.map((d) => d.layer))]
  const layerWidth = width / (layers.length + 4) //修改线长度

  nodes.value.forEach((node) => {
    // 计算 x 坐标
    node.x = (node.layer + 1) * layerWidth
    // 计算 y 坐标
    const nodesInLayer = nodes.value.filter((d) => d.layer === node.layer)
    const nodeIndex = nodesInLayer.findIndex((d) => d.id === node.id)
    const layerHeight = height / (nodesInLayer.length + 1)
    node.y = (nodeIndex + 1) * layerHeight
  })

  // 定义连接线的箭头样式
  const defs = svg.append('defs')
  defs
    .append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '-0 -5 10 10')
    .attr('refX', 42)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('xoverflow', 'visible')
    .append('svg:path')
    .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
    .attr('fill', '#9ca3af')
    .style('stroke', 'none')

  // 创建一个总的<g>元素容器，方便整体进行缩放和平移
  const g = svg.append('g')

  const nodeMap = new Map(nodes.value.map((n) => [n.id, n]))
  const processedLinks = links.value.map((link) => ({
    source: nodeMap.get(link.source),
    target: nodeMap.get(link.target)
  }))

  // 绑定并绘制连接线，节点组
  const link = g
    .append('g')
    .selectAll('path')
    .data(processedLinks)
    .join('path')
    .attr('class', 'link-path')
    .attr('marker-end', 'url(#arrowhead)')

  const node = g
    .append('g')
    .selectAll('g')
    .data(nodes.value)
    .join('g')
    .attr('class', 'node-group')
    .attr('transform', (d) => `translate(${d.x}, ${d.y})`)

  // 绘制节点圆形
  node
    .append('circle')
    .attr('r', 45) // 此处可修改圆形大小
    .style('fill', '#2c2f32')
    .style('stroke', (d) => typeColors[d.type] || '#ccc')
    .style('stroke-width', 2)
    .style('transition', 'transform 0.2s ease-out')
  // 绘制节点名称
  node
    .append('text')
    .attr('y', -5)
    .attr('text-anchor', 'middle')
    .style('fill', '#e5e7eb')
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .text((d) => d.name)
  // 绘制节点ID（可以修改样式）
  node
    .append('text')
    .attr('y', 18)
    .attr('text-anchor', 'middle')
    .style('fill', '#E5E7EBEB')
    .style('font-size', '12px')
    .style('font-family', '"Times New Roman", monospace, Times, serif')
    .text((d) => d.nodeId)

  // 根据节点坐标更新节点和连接线的位置
  function updatePositions() {
    node.attr('transform', (d) => `translate(${d.x}, ${d.y})`)
    link.attr('d', (d) =>
      d3.line()([
        [d.source.x, d.source.y],
        [d.target.x, d.target.y]
      ])
    )
  }
  updatePositions()

  // 定义节点的拖拽行为
  const drag = d3
    .drag()
    .on('start', (event) =>
      d3.select(event.sourceEvent.target.closest('.node-group')).raise().classed('active', true)
    )
    .on('drag', (event, d) => {
      d.x = event.x
      d.y = event.y
      updatePositions()
    })
    .on('end', (event) =>
      d3.select(event.sourceEvent.target.closest('.node-group')).classed('active', false)
    )
  node.call(drag)

  // 定义节点的悬停交互行为 (提示框和高亮)
  node
    .on('mouseover', (event, d) => {
      // 放大当前节点
      d3.select(event.currentTarget).select('circle').attr('transform', 'scale(1.15)')

      // 实现高亮效果：将非相关节点和连接线变暗
      const connectedLinks = processedLinks.filter(
        (l) => d.id === l.source.id || d.id === l.target.id
      )
      const connectedNodes = new Set(connectedLinks.flatMap((l) => [l.source.id, l.target.id]))
      node.classed('faded', (n) => !connectedNodes.has(n.id))
      link.classed('faded', (l) => !connectedLinks.includes(l))

      const tooltipNode = tooltip.value
      const borderColor = typeColors[d.type] || '#e5e7eb'
      tooltipNode.style.borderColor = borderColor
      tooltipNode.style.display = 'block'
      tooltipNode.innerHTML = getTooltipHtml(d)
      // 延迟设置样式以触发CSS过渡
      requestAnimationFrame(() => {
        tooltipNode.style.opacity = 1
        tooltipNode.style.transform = 'translateY(0)'
      })
    })
    .on('mousemove', (event) => {
      const tooltipNode = tooltip.value
      tooltipNode.style.left = `${event.pageX + 5}px`
      tooltipNode.style.top = `${event.pageY + 5}px`
    })
    .on('mouseout', (event) => {
      d3.select(event.currentTarget).select('circle').attr('transform', 'scale(1)')
      node.classed('faded', false)
      link.classed('faded', false)

      const tooltipNode = tooltip.value
      tooltipNode.style.opacity = 0
      tooltipNode.style.transform = 'translateY(10px)'
      setTimeout(() => {
        if (tooltipNode.style.opacity === '0') {
          tooltipNode.style.display = 'none'
        }
      }, 300)
    })

  // 定义缩放和平移的行为
  const zoom = d3.zoom().on('zoom', (event) => {
    g.attr('transform', event.transform)
  })
  svg
    .call(zoom)
    .on('dblclick.zoom', null) // 禁用默认的双击放大功能
    .on('dblclick', () => {
      // 双击时，平滑过渡到初始位置和大小
      svg.transition().duration(750).call(zoom.transform, initialTransform)
    })

  // 计算图表的边界，并自动居中显示
  const bounds = g.node().getBBox()
  if (bounds.width > 0 && bounds.height > 0) {
    const fullWidth = width
    const fullHeight = height
    const midX = bounds.x + bounds.width / 2
    const midY = bounds.y + bounds.height / 2
    // 调整下面可以修改默认图表大小
    const scale = 0.9 * Math.min(fullWidth / bounds.width, fullHeight / bounds.height)
    const translateX = fullWidth / 2 - scale * midX + 100 // 向左偏移一点
    const translateY = fullHeight / 2 - scale * midY - 18 // 向上偏移一点
    const translate = [translateX, translateY]
    initialTransform = d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
    svg.call(zoom.transform, initialTransform)
  }

  // 定义数据包流动动画
  const startDataPacketAnimation = () => {
    if (processedLinks.length === 0) return
    const randomLink = processedLinks[Math.floor(Math.random() * processedLinks.length)]
    const path = link
      .filter((d) => d.source.id === randomLink.source.id && d.target.id === randomLink.target.id)
      .node()
    if (!path) return
    const sourceNodeType = randomLink.source.type
    const packet = g.append('circle').attr('r', 4).style('fill', typeColors[sourceNodeType])

    packet
      .transition()
      .duration(2500)
      .ease(d3.easeLinear)
      .attrTween('transform', function () {
        return function (t) {
          const point = path.getPointAtLength(t * path.getTotalLength())
          return `translate(${point.x}, ${point.y})`
        }
      })
      .on('end', () => packet.remove())
  }
  animationInterval = setInterval(startDataPacketAnimation, 800)
}
</script>

<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <el-page-header :icon="ArrowLeft" @back="goBack">
          <template #content>
            <span class="page-header-title"> 业务溯源链条详情 </span>
          </template>
        </el-page-header>
      </template>

      <div class="chart-container">
        <!-- 信息面板 -->
        <div class="user-info-panel">
          <div class="panel-header">
            <div class="avatar-pulse">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="feather feather-clipboard"
              >
                <path
                  d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
                ></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                <line x1="8" y1="12" x2="16" y2="12"></line>
                <line x1="8" y1="16" x2="16" y2="16"></line>
              </svg>
            </div>
            <div class="panel-title">数据信息</div>
          </div>
          <div class="panel-body">
            <div class="info-row">
              <span class="info-label">业务ID</span>
              <span class="info-value user-name">{{ dataInfo.businessId || '...' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">业务流转路径</span>
              <span class="info-value flow-container">
                <span>{{ dataInfo.senderId || '...' }}</span>
                <span class="flow-arrow">→</span>
                <span>{{ dataInfo.receiverId || '...' }}</span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">业务类型</span>
              <span class="info-value">{{ dataInfo.businessType || '...' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">数据来源用途</span>
              <span class="info-value flow-container">
                <span>{{ dataInfo.dataSource || '...' }}</span>
                <span class="flow-arrow">-</span>
                <span>{{ dataInfo.dataUsage || '...' }}</span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">敏感等级</span>
              <span class="info-value">
                <el-tag
                  v-if="dataInfo.sensitivityLevel"
                  :type="getTagType(dataInfo.sensitivityLevel)"
                  size="small"
                  effect="plain"
                  round
                >
                  {{ dataInfo.sensitivityLevel }}
                </el-tag>
                <span v-else>...</span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">流转时间</span>
              <span class="info-value">{{
                dataInfo.circulationTime ? dataInfo.circulationTime.slice(0, 10) : '...'
              }}</span>
            </div>
          </div>
        </div>
        <!-- 提示框 -->
        <div ref="tooltip" class="chart-tooltip"></div>
        <!-- 流程图 -->
        <svg ref="svgContainer" width="100%" height="100%"></svg>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.page-container {
  width: 100%;
  height: calc(100vh - 125px - 36px);
}
/* 定义黑暗主题的card样式 */
.page-container :deep(.el-card) {
  border: none;
  background-color: #1b1c1d;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.page-container :deep(.el-card__header) {
  padding: 15px 20px;
  border-bottom: 1px solid #3a3d40;
}
.page-container :deep(.el-card__body) {
  padding: 0;
}
.page-container :deep(.el-card.is-always-shadow) {
  box-shadow: 0 0 15px 3px rgba(138, 138, 138, 0.3);
}
.page-header-title {
  font-size: 18px;
  font-weight: bold;
  color: #e5e7eb;
}
.page-container :deep(.el-page-header__header) {
  height: auto;
}
.page-container :deep(.el-page-header__title),
.page-container :deep(.el-page-header__icon) {
  color: #a0aec0;
}
.chart-container {
  width: 100%;
  height: calc(100vh - 182px);
  position: relative;
  overflow: hidden;
}
.user-info-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
  width: 280px;
  background-color: rgba(40, 42, 44, 0.7);
  border: 1px solid #4a4a4a;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
  overflow: hidden;
}
.panel-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background-color: rgba(255, 255, 255, 0.05);
}
.avatar-pulse {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #409eff30;
  color: #409eff;
  box-shadow: 0 0 0 0 rgba(64, 158, 255, 1);
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 10px rgba(64, 158, 255, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
  }
}
.panel-title {
  color: #e5e7eb;
  font-size: 16px;
  font-weight: bold;
  margin-left: 12px;
}
.panel-body {
  padding: 5px 16px 5px;
  /* 修改合适字体 */
  font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace;
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 0;
  border-bottom: 1px solid #3a3d40;
}
.info-row:last-child {
  border-bottom: none;
}
.info-label {
  color: #a0aec0;
  font-size: 13px;
}
.info-value {
  color: #dcdfe6;
  font-size: 14px;
}
.user-name {
  color: #409eff;
  font-weight: bold;
}
.flow-container {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
}
.flow-arrow {
  color: #dcdfe6;
  font-weight: bold;
}

/* 提示框样式 */
.chart-tooltip {
  display: none;
  opacity: 0;
  position: fixed;
  background-color: rgba(249, 250, 251, 0.95);
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 16px;
  color: #1f2937;
  font-size: 14px;
  line-height: 1.6;
  pointer-events: none;
  z-index: 20;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  transform: translateY(10px);
  border: 2px solid #e5e7eb;
  transition:
    opacity 0.3s ease-in-out,
    transform 0.3s ease-in-out,
    border-color 0.3s ease-in-out;
}
:deep(.tooltip-title) {
  font-size: 16px;
  font-weight: bold;
  text-align: center;
  color: #111827;
  padding-bottom: 8px;
  border-bottom: 1px solid #d1d5db;
  margin-bottom: 8px;
}
:deep(.tooltip-content > div) {
  padding: 2px 0;
}

/* 节点样式 */
:deep(.link-path) {
  fill: none;
  stroke: #4b5563;
  stroke-width: 1px;
  transition: opacity 0.3s ease;
}
:deep(.node-group) {
  transition: opacity 0.3s ease;
}
:deep(.faded) {
  opacity: 0.3;
}
:deep(.node-group:hover) {
  cursor: grab;
}
</style>
