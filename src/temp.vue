<!-- 标识生成可视化 -->
<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Flag, Promotion, View, SuccessFilled, DArrowRight } from '@element-plus/icons-vue'

defineOptions({
  name: 'VisualPage'
})

// 定义流程各阶段索引
// 0:待命, 1:发送中, 2:过滤中, 3:注入中, 4:识别中, 5:传输至接收端, 6:批次完成
const stageIndex = ref(0)
// 存储各项统计数据
const stats = reactive({
  general: 0, //一般数据
  business: 0, //业务数据
  filtered: 0, //已过滤数据
  labeled: 0, //已注入标签数据
  identified: 0, //已识别数据
  received: 0 // 已接收数量
})
// 存储全部数据块对象
const dataBlocks = ref([])
// 定义每批次数据块总数（一般数据+业务数据）
const TOTAL_BLOCKS_PER_BATCH = 25
// 存储所有正在运行的定时器ID
const runningTimeouts = new Set()

// 标签计数器
const labelCounter = ref(0)
// 批次计数器
const batchCounter = ref(0)

// 清除正在运行的定时器
const clearAllTimeouts = () => {
  runningTimeouts.forEach((timerId) => clearTimeout(timerId))
  runningTimeouts.clear()
}

// 重置整个模拟过程
const resetSimulation = () => {
  clearAllTimeouts()
  stageIndex.value = 0 //流程阶段归0
  Object.keys(stats).forEach((key) => {
    stats[key] = 0 //统计数据全部归0
  })
  dataBlocks.value = [] //清空数据块
  labelCounter.value = 0 //重置标签计数器
  batchCounter.value = 0 //重置批次计数器
  nextTick(() => generateNewBatch()) //执行生成新批次
}

// 执行：生成新批次数据
const generateNewBatch = () => {
  // 只有在流程为0或6时，才允许生成新批次
  if (stageIndex.value !== 0 && stageIndex.value !== 6) return
  stageIndex.value = 0

  stats.general = 0
  stats.business = 0
  stats.filtered = 0
  stats.labeled = 0
  stats.identified = 0
  labelCounter.value = 0
  batchCounter.value++ //批次号加一

  const zoneWidth = 100 / 5 //每个区域宽度百分比
  const newBlocks = [] //临时数组，存放新生成的数据块
  for (let i = 0; i < TOTAL_BLOCKS_PER_BATCH; i++) {
    const isBusiness = Math.random() > 0.6 //随机决定数据块类型（大约40%为业务数据）
    if (isBusiness) stats.business++
    else stats.general++
    // 生成新数据块
    newBlocks.push({
      id: Date.now() + i,
      batchId: batchCounter.value,
      type: isBusiness ? 'business' : 'general',
      state: 'idle',
      labelId: null,
      showLabel: true,
      style: {
        top: `${Math.random() * 70 + 15}%`,
        left: `${Math.random() * (zoneWidth - 10) + 5}%`,
        animationDelay: `${Math.random() * 2}s`,
        zIndex: 1
      }
    })
  }
  // 保留已接收状态的块，并与新批次合并
  dataBlocks.value = [...dataBlocks.value.filter((b) => b.state === 'received'), ...newBlocks]
}

// 执行：发送数据
const triggerSend = () => {
  // 只有在流程为0或6时，才允许发送
  if (stageIndex.value !== 0 && stageIndex.value !== 6) return
  stageIndex.value = 1
  const zoneWidth = 100 / 5

  // 将处于idle状态的块移动到下一个区域
  dataBlocks.value.forEach((block) => {
    if (block.state === 'idle') {
      block.state = 'moving'
      block.style.top = `${Math.random() * 70 + 15}%`
      block.style.left = `${zoneWidth + Math.random() * (zoneWidth - 10) + 5}%`
    }
  })
}

// 执行：开始过滤
const triggerFilter = () => {
  // 只有在流程为1时才能执行过滤
  if (stageIndex.value !== 1) return
  stageIndex.value = 2
  const zoneWidth = 100 / 5

  dataBlocks.value.forEach((block) => {
    if (block.state === 'moving') {
      // 业务数据移动到下一个区域
      if (block.type === 'business') {
        block.state = 'toLabeling'
        block.style.top = `${Math.random() * 70 + 15}%`
        block.style.left = `${zoneWidth * 2 + Math.random() * (zoneWidth - 10) + 5}%`
      } else {
        block.state = 'filtered' //状态变更为已过滤
        stats.filtered++
      }
    }
  })
}

// 执行：注入标签
const triggerLabel = () => {
  // 必须在流程为2才能注入标签
  if (stageIndex.value !== 2) return
  stageIndex.value = 3
  const zoneWidth = 100 / 5

  dataBlocks.value.forEach((block) => {
    if (block.state === 'toLabeling') {
      block.state = 'labeled' //状态变更为已打标签
      stats.labeled++
      labelCounter.value++
      block.labelId = `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String(labelCounter.value).padStart(3, '0')}` //生成格式化标签
      const timerId = setTimeout(() => {
        block.state = 'toIdentifying' // 状态变更为“待识别”
        // 移动到下一个区域（识别核心）
        block.style.top = `${Math.random() * 70 + 15}%`
        block.style.left = `${zoneWidth * 3 + Math.random() * (zoneWidth - 10) + 5}%`
        runningTimeouts.delete(timerId)
      }, 1000)
      runningTimeouts.add(timerId)
    }
  })
}

// 执行：重新排序已接收的数据块，在接收端整齐堆叠
const reorderReceivedBlocks = () => {
  // 筛选全部已接收的块
  const receivedBlocks = dataBlocks.value.filter((b) => b.state === 'received')
  // 将接收到的块按批次ID进行分组
  const batches = receivedBlocks.reduce((acc, block) => {
    acc[block.batchId] = acc[block.batchId] || []
    acc[block.batchId].push(block)
    return acc
  }, {})

  const zoneWidth = 100 / 5
  const recipientZoneLeft = zoneWidth * 4
  const availableWidth = zoneWidth - 5

  const batchKeys = Object.keys(batches).sort((a, b) => a - b) //获取全部批次ID排序
  const totalBatches = batchKeys.length //总批次数

  // 遍历每个批次，为其中的数据块计算最终的堆叠位置
  batchKeys.forEach((batchId, batchIndex) => {
    const batchBlocks = batches[batchId]
    const visibleBlocks = batchBlocks.slice(-5)
    // 找到同一批次中那些需要移动但最终不显示的块
    const hiddenBlocks = batchBlocks.slice(0, batchBlocks.length - 5)

    const stackBaseLeft = recipientZoneLeft + (batchIndex % 2) * (availableWidth / 2) + 5
    const stackBaseTop = 20 + Math.floor(batchIndex / 2) * 25

    // 为可见的5个块设置最终的层叠位置
    visibleBlocks.forEach((block, index) => {
      block.style.left = `${stackBaseLeft + index * 0.5}%`
      block.style.top = `${stackBaseTop + index * 1.5}%`
      block.style.zIndex = (totalBatches - batchIndex) * 10 + index // zIndex确保后来的批次在上方
      block.showLabel = false // 到达后隐藏标签ID
    })

    // 处理隐藏的块
    hiddenBlocks.forEach((block) => {
      block.style.left = `${stackBaseLeft}%`
      block.style.top = `${stackBaseTop}%`
      block.style.zIndex = (totalBatches - batchIndex) * 10
      block.showLabel = false
    })
  })
}

// 执行：开始识别
const triggerIdentify = () => {
  // 必须在流程为3才能注入标签
  if (stageIndex.value !== 3) return
  stageIndex.value = 4
  const zoneWidth = 100 / 5
  const businessBlocks = dataBlocks.value.filter((b) => b.state === 'toIdentifying')
  const numCols = 4 //在识别区排列的列数
  const numRows = Math.ceil(businessBlocks.length / numCols) //计算列数

  // 遍历待识别的业务数据块，将它们在识别区内排列成网格状
  businessBlocks.forEach((block, index) => {
    stats.identified++ //增加已识别计数
    const row = Math.floor(index / numCols)
    const col = index % numCols
    const xOffsetPercent = (col + 0.5) * (100 / numCols)
    const yOffsetPercent = (row + 1) * (100 / (numRows + 1.5))
    block.state = 'identified' //状态变更为已识别
    block.style.top = `${yOffsetPercent}%`
    block.style.left = `${zoneWidth * 3 + (xOffsetPercent / 100) * (zoneWidth - 4) + 2}%`
  })
  // 模拟识别过程
  const timerId1 = setTimeout(() => {
    stageIndex.value = 5 // 进入“传输至接收端”阶段
    // 遍历所有数据块，将已识别的块标记为已接收
    dataBlocks.value.forEach((block) => {
      if (block.state === 'identified') {
        block.state = 'received' // 状态变更为“已接收”
        stats.received++ // 增加已接收计数
      }
    })
    reorderReceivedBlocks() // 调用函数将接收到的块重新排列

    // 再次使用 setTimeout 模拟数据传输和最终处理
    const timerId2 = setTimeout(() => {
      if (stageIndex.value === 5) {
        stageIndex.value = 6 // 进入“批次完成”阶段
        const currentBatchId = batchCounter.value
        // 筛选出当前批次中所有已接收的块
        const receivedBlocksInCurrentBatch = dataBlocks.value.filter(
          (b) => b.batchId === currentBatchId && b.state === 'received'
        )
        // 从中选出最后5个可见的块
        const visibleBlocksInCurrentBatch = receivedBlocksInCurrentBatch.slice(-5)
        const visibleBlockIds = new Set(visibleBlocksInCurrentBatch.map((b) => b.id))

        // 过滤 dataBlocks 数组
        dataBlocks.value = dataBlocks.value.filter((b) => {
          // 如果不是当前批次的块，则保留
          if (b.batchId !== currentBatchId) {
            return true
          }
          // 如果是当前批次的块，则仅保留那5个可见的
          return visibleBlockIds.has(b.id)
        })
      }
      // 当定时器执行完毕后，从追踪集合中移除其ID
      runningTimeouts.delete(timerId2)
    }, 2500) // 延迟2.5秒
    runningTimeouts.add(timerId2)
    runningTimeouts.delete(timerId1)
  }, 2500) // 延迟2.5秒
  runningTimeouts.add(timerId1)
}

// 初始化时生成第一批数据
onMounted(() => {
  generateNewBatch()
})

// 清理工作
onBeforeUnmount(() => {
  clearAllTimeouts()
})
</script>

<template>
  <div class="visual-container">
    <!-- 顶部控制面板 -->
    <div class="control-panel">
      <!-- 标题 -->
      <div class="title" @click="resetSimulation">
        <!-- <el-icon><Flag /></el-icon> -->
        <span>标识生成与识别可视化系统</span>
      </div>
      <!-- 操作按钮 -->
      <div class="actions">
        <div class="custom-button-group">
          <el-button
            class="btn-generate"
            @click="generateNewBatch"
            size="default"
            :disabled="stageIndex !== 0 && stageIndex !== 6"
            >生成数据</el-button
          >
          <el-button
            class="btn-send"
            @click="triggerSend"
            size="default"
            :disabled="stageIndex !== 0 && stageIndex !== 6"
            >发送数据</el-button
          >
          <el-button
            class="btn-filter"
            @click="triggerFilter"
            size="default"
            :disabled="stageIndex !== 1"
            >执行过滤</el-button
          >
          <el-button
            class="btn-label"
            @click="triggerLabel"
            size="default"
            :disabled="stageIndex !== 2"
            >注入标签</el-button
          >
          <el-button
            class="btn-identify"
            @click="triggerIdentify"
            size="default"
            :disabled="stageIndex !== 3"
            >开始识别</el-button
          >
        </div>
      </div>
    </div>

    <!-- 主流程可视化区域 -->
    <div class="main-flow">
      <!-- 动画层，用于承载所有移动的数据块 -->
      <div class="flow-animation-layer">
        <div
          v-for="block in dataBlocks"
          :key="block.id"
          :class="['data-block', block.type, block.state]"
          :style="block.style"
        >
          <div class="inner-block"></div>
          <!-- 当数据块状态为 'filtered' 时，显示粒子消散效果 -->
          <template v-if="block.state === 'filtered'">
            <div class="particle" v-for="i in 5" :key="i"></div>
          </template>
          <!-- 如果数据块有 labelId 并且需要显示，则渲染标签 -->
          <div v-if="block.labelId && block.showLabel" class="tag-id">
            {{ block.labelId }}
          </div>
        </div>
      </div>

      <!-- 1.数据源区域 -->
      <div class="flow-zone source-zone" :class="{ active: stageIndex === 0 || stageIndex === 6 }">
        <div class="zone-header">
          <el-icon><Promotion /></el-icon>
          <span>数据源</span>
        </div>
        <div class="zone-content">
          <p>混合数据流</p>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="label">一般数据</span>
              <span class="value general">{{ stats.general }}</span>
            </div>
            <div class="stat-item">
              <span class="label">业务数据</span>
              <span class="value business">{{ stats.business }}</span>
            </div>
          </div>
        </div>
        <div class="zone-status" :class="{ active: stageIndex === 1 }">
          <span v-if="stageIndex === 1">数据发送中...</span>
          <span v-else-if="stageIndex === 0 || stageIndex === 6">准备就绪</span>
          <span v-else></span>
        </div>
      </div>
      <!-- 2.网关路由区域 -->
      <div class="flow-zone gateway-zone" :class="{ active: stageIndex === 1 || stageIndex === 2 }">
        <div class="zone-header">
          <el-icon><View /></el-icon>
          <span>网关路由</span>
        </div>
        <div class="zone-content">
          <p>根据白名单重定向</p>
          <div class="stat-item single">
            <span class="label">已过滤</span>
            <span class="value filtered">{{ stats.filtered }}</span>
          </div>
        </div>
        <div class="zone-status" :class="{ active: stageIndex === 2 }">
          <span v-if="stageIndex === 2">正在筛选数据...</span>
          <span v-else>待机</span>
        </div>
      </div>
      <!-- 3.标签引擎区域 -->
      <div class="flow-zone label-zone" :class="{ active: stageIndex === 2 || stageIndex === 3 }">
        <div class="zone-header">
          <el-icon><Flag /></el-icon>
          <span>标签引擎</span>
        </div>
        <div class="zone-content">
          <p>标签生成 & 流量重构</p>
          <div class="stat-item single">
            <span class="label">已注入标签</span>
            <span class="value labeled">{{ stats.labeled }}</span>
          </div>
        </div>
        <div class="zone-status" :class="{ active: stageIndex === 3 }">
          <span v-if="stageIndex === 3">正在注入标签...</span>
          <span v-else>待机</span>
        </div>
      </div>
      <!-- 4.识别核心区域 -->
      <div
        class="flow-zone identify-zone"
        :class="{ active: stageIndex === 3 || stageIndex === 4 || stageIndex === 5 }"
      >
        <div class="zone-header">
          <el-icon><DArrowRight /></el-icon>
          <span>识别核心</span>
        </div>
        <div class="zone-content">
          <p>流量高效识别</p>
          <div class="stat-item single">
            <span class="label">已识别</span>
            <span class="value identified">{{ stats.identified }}</span>
          </div>
        </div>
        <div class="zone-status" :class="{ active: stageIndex >= 4 && stageIndex < 6 }">
          <div class="scanner" v-if="stageIndex === 4"></div>
          <span v-if="stageIndex === 4">正在扫描识别...</span>
          <span v-else-if="stageIndex === 5">识别完成</span>
          <span v-else>待机</span>
        </div>
      </div>
      <!-- 5.接收端区域 -->
      <div
        class="flow-zone recipient-zone"
        :class="{ active: stageIndex === 5 || stageIndex >= 6 }"
      >
        <div class="zone-header">
          <el-icon><SuccessFilled /></el-icon>
          <span>接收端</span>
        </div>
        <div class="zone-content">
          <p>业务数据已送达</p>
          <div class="stat-item single">
            <span class="label">已接收</span>
            <span class="value received">{{ stats.received }}</span>
          </div>
        </div>
        <div class="zone-status" :class="{ active: stageIndex >= 6 }">
          <span v-if="stageIndex >= 6">批次传输完成</span>
          <span v-else>待机</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* --- 整体布局 --- */
.visual-container {
  width: 100%;
  height: calc(100% - 18px);
  border-radius: 4px;
  box-shadow: 0 0 15px 3px rgba(138, 138, 138, 0.3);
  padding: 20px 40px 35px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #c9d5e3; /* 默认文字颜色 */
  position: relative;
  background-color: #0f141d;
}

/* 背景星星动画 */
.visual-container::before,
.visual-container::after {
  content: '';
  position: absolute;
  z-index: 1; /* 确保在主内容之下 */
  left: 50%;
  top: 50%;
  width: 150vmax;
  height: 150vmax;
  background: transparent;
  border-radius: 50%; /* 使用圆形来绘制星星 */
  transform-origin: center;
}
/* 第一层星空（中景） */
.visual-container::before {
  /* 通过 radial-gradient 绘制出大量小点作为星星 */
  background-image:
    radial-gradient(1.5px 1.5px at 15% 50%, #fff, transparent),
    radial-gradient(1px 1px at 25% 30%, #fff, transparent),
    radial-gradient(2px 2px at 80% 20%, #fff, transparent),
    radial-gradient(1.5px 1.5px at 60% 70%, #fff, transparent),
    radial-gradient(1px 1px at 5% 90%, #fff, transparent),
    radial-gradient(2px 2px at 45% 5%, #fff, transparent),
    radial-gradient(1px 1px at 95% 95%, #fff, transparent),
    radial-gradient(1.5px 1.5px at 55% 45%, #fff, transparent);
  background-repeat: repeat;
  background-size: 300px 300px;
  animation: rotate-stars 160s linear infinite;
}

/* 第二层星空（远景，更慢） */
.visual-container::after {
  background-image:
    radial-gradient(1px 1px at 5% 15%, #fff, transparent),
    radial-gradient(1px 1px at 85% 40%, #fff, transparent),
    radial-gradient(1.5px 1.5px at 30% 80%, #fff, transparent),
    radial-gradient(1px 1px at 70% 90%, #fff, transparent),
    radial-gradient(1.5px 1.5px at 10% 5%, #fff, transparent);
  background-repeat: repeat;
  background-size: 250px 250px;
  animation: rotate-stars 200s linear infinite reverse;
}
/* 定义旋转动画 */
@keyframes rotate-stars {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

/* --- 控制面板 --- */
.control-panel {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
  flex-shrink: 0;
  z-index: 2; /* 确保在背景之上 */
}
.title {
  font-size: 26px;
  font-weight: bold;
  color: #61dafb; /* 亮蓝色 */
  text-shadow: 0 0 2px #61dafb; /* 发光效果 */
  cursor: pointer;
}
/* 按钮组 */
.custom-button-group {
  display: flex;
  gap: 8px; /* 设置按钮之间的间距 */
}

/* 按钮通用样式 */
.custom-button-group .el-button {
  border: none;
  color: white;
  transition: all 0.2s ease-in-out; /* 平滑的颜色和效果过渡 */
  letter-spacing: 1px;
}
/* 按钮在禁用状态下的通用样式 */
.custom-button-group .el-button.is-disabled {
  color: #ffffffc9 !important; /* 禁用时文字颜色变淡 */
  background-image: none; /* 移除ElementPlus可能添加的渐变 */
}
/* 1. 生成数据 - 蓝色 */
.btn-generate {
  background-color: #1387ff !important;
}
.btn-generate:hover {
  background-color: #79bbff !important;
}
.btn-generate.is-disabled {
  background-color: #a0cfff !important;
}
/* 2. 发送数据 - 绿色 */
.btn-send {
  background-color: #67c23a !important;
}
.btn-send:hover {
  background-color: #95d475 !important;
}
.btn-send.is-disabled {
  background-color: #b3e19d !important;
}
/* 3. 执行过滤 - 橙色 */
.btn-filter {
  background-color: #e6a23c !important;
}
.btn-filter:hover {
  background-color: #eebe77 !important;
}
.btn-filter.is-disabled {
  background-color: #f3d19e !important;
}
/* 4. 注入标签 - 红色 */
.btn-label {
  background-color: #f56c6c !important;
}
.btn-label:hover {
  background-color: #f89898 !important;
}
.btn-label.is-disabled {
  background-color: #fab6b6 !important;
}
/* 5. 开始识别 - 紫色 */
.btn-identify {
  background-color: #9370db !important;
}
.btn-identify:hover {
  background-color: #b393e0 !important;
}
.btn-identify.is-disabled {
  background-color: #c9b4e9 !important;
}

/* --- 主流程区域 --- */
.main-flow {
  flex-grow: 1; /* 占据剩余空间 */
  display: flex;
  gap: 15px; /* 区域之间的间距 */
  position: relative;
  z-index: 2;
}

/* --- 区域通用样式 --- */
.flow-zone {
  /* background: rgba(13, 27, 42, 0.5); */
  background: transparent;
  border: 2.5px solid #1a5c96;
  border-radius: 8px;
  flex: 1; /* 均分宽度 */
  display: flex;
  flex-direction: column;
  /* backdrop-filter: blur(5px); */
  position: relative;
  transition: all 0.4s ease; /* 过渡动画 */
  z-index: 2;
  overflow: hidden;
}
.flow-zone.active {
  border-color: #61dafb; /* 激活状态边框颜色 */
  box-shadow: 0 0 20px rgba(97, 218, 251, 0.3); /* 激活状态发光效果 */
}
.flow-zone:hover {
  transform: translateY(-5px); /* 悬浮时向上移动 */
  border-color: #00ffff;
}
.zone-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: bold;
  padding: 10px 15px;
  background: rgba(1, 4, 18, 0.5);
  border-bottom: 1px solid #1a5c96;
  border-radius: 8px 8px 0 0;
}
.zone-content {
  padding: 15px;
  flex-grow: 1;
  text-align: center;
  position: relative;
}

.zone-content p {
  font-size: 14px;
  color: #88a1b5;
  margin: 0 0 20px 0;
}
.zone-status {
  padding: 10px;
  text-align: center;
  color: #5a738a;
  border-top: 1px dashed #1a5c96;
  margin-top: auto; /* 将状态栏推到底部 */
  font-family: 'Courier New', monospace; /* 等宽字体 */
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}
.zone-status.active {
  color: #61dafb;
  font-weight: bold;
}

/* --- 数据统计样式 --- */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}
.stat-item.single {
  grid-column: 1 / -1; /* 单个统计项占据整行 */
}
.stat-item .label {
  font-size: 12px;
  color: #88a1b5;
  margin-bottom: 5px;
}
.stat-item .value {
  font-size: 24px;
  font-weight: bold;
  font-family: 'Orbitron', sans-serif; /* 数字字体 */
}
.value.general {
  color: #5a738a;
}
.value.business {
  color: #00ffff;
}
.value.filtered {
  color: #e6574c;
}
.value.labeled {
  color: #ffa022;
}
.value.identified {
  color: #39ff14;
}
.value.received {
  color: #39ff14;
}

/* --- 识别核心的扫描动画 --- */
.scanner {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, transparent, #61dafb, transparent);
  animation: scan-vertical 2s linear infinite;
}
@keyframes scan-vertical {
  0% {
    top: 0;
  }
  50% {
    top: calc(100% - 3px);
  }
  100% {
    top: 0;
  }
}

/* --- 动画层与数据块 --- */
.flow-animation-layer {
  position: absolute;
  top: 80px;
  left: 0;
  right: 0;
  bottom: 50px;
  pointer-events: none; /* 让鼠标事件穿透此层 */
  z-index: 3;
  margin-top: -20px;
  margin-bottom: -20px;
}
.data-block {
  position: absolute;
  width: 60px;
  height: 30px;
  transition:
    /* 自定义缓动函数，实现更真实的移动 */
    top 2.5s cubic-bezier(0.5, 0, 0.5, 1),
    left 2.5s cubic-bezier(0.5, 0, 0.5, 1),
    opacity 0.8s ease,
    transform 1s ease;
  transform-style: preserve-3d; /* 开启3D空间 */
  transform: rotateX(10deg);
}
.inner-block {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  transform-style: preserve-3d;
  position: relative;
  border: 1px solid;
  transition:
    background-color 1s ease,
    box-shadow 1s ease,
    border-color 1s ease;
}
/* 使用伪元素创建数据块的厚度感 */
.inner-block::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 4px;
  background: inherit;
  transform: translateZ(-3px); /* 向Z轴负方向移动，形成厚度 */
  border: 1px solid;
  border-color: inherit;
  filter: brightness(0.7); /* 使侧面变暗 */
}

/* 类型样式 */
.data-block.general .inner-block {
  background-color: #5a738a;
  border-color: #88a1b5;
}
.data-block.business .inner-block {
  background-color: #00aaff;
  border-color: #61dafb;
  box-shadow: 0 0 15px #00aaff; /* 业务数据块发光效果 */
}

/* 状态动画 */
.data-block.idle,
.data-block.moving,
.data-block.toLabeling,
.data-block.toIdentifying {
  animation: float 4s ease-in-out infinite; /* 浮动动画 */
}

.data-block.received {
  animation: none; /* 到达终点后停止浮动 */
}

@keyframes float {
  0%,
  100% {
    transform: rotateX(10deg) translateY(0) scale(1);
  }
  50% {
    transform: rotateX(10deg) translateY(-15px) scale(1.05); /* 上下浮动并轻微缩放 */
  }
}

/* 被过滤掉的数据块的消散动画 */
.data-block.filtered {
  opacity: 0;
  pointer-events: none;
  transition-duration: 0.8s;
  transform: scale(0);
}
.data-block.filtered .particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #5a738a;
  animation: explode 0.8s ease-out forwards; /* 爆炸粒子动画 */
}
@keyframes explode {
  from {
    transform: translate(-50%, -50%);
    opacity: 1;
  }
  to {
    transform: translate(var(--x), var(--y));
    opacity: 0;
  }
}
.particle:nth-child(1) {
  --x: -80px;
  --y: -50px;
}
.particle:nth-child(2) {
  --x: 80px;
  --y: 50px;
}
.particle:nth-child(3) {
  --x: -60px;
  --y: 60px;
}
.particle:nth-child(4) {
  --x: 60px;
  --y: -60px;
}
.particle:nth-child(5) {
  --x: 0px;
  --y: 80px;
}

/* 已打标签状态的样式 */
.data-block.labeled .inner-block {
  background-color: #ffa022;
  border-color: #ffc966;
  box-shadow: 0 0 15px #ffa022;
}

/* 已识别和已接收状态的样式 */
.data-block.identified .inner-block,
.data-block.received .inner-block {
  background-color: #00ff8c;
  border-color: #39ff14;
  /* 减弱荧光效果 */
  box-shadow: 0 0 8px rgba(57, 255, 20, 0.7);
}

.data-block.identified {
  animation: identified-float 6s ease-in-out infinite;
}
@keyframes identified-float {
  0%,
  100% {
    transform: rotateY(-15deg) rotateX(10deg);
  }
  50% {
    transform: rotateY(15deg) rotateX(10deg);
  }
}

/* 标签ID的样式和动画 */
.tag-id {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: transparent;
  color: #ffffff;
  font-size: 13px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  white-space: nowrap;
  opacity: 0;
  animation: inject-tag 1s forwards 0.5s;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
  pointer-events: none;
}

@keyframes inject-tag {
  from {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}
</style>
