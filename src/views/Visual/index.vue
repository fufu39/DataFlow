<script setup>
import { ref, reactive, onBeforeUnmount } from 'vue'
import { Position, CollectionTag, CircleCheck, Filter, Aim } from '@element-plus/icons-vue'

defineOptions({
  name: 'VisualPage'
})

// 定义流程各阶段索引
// -1:待命, 0:已生成, 1:发送中, 2:过滤中, 3:注入中, 4:识别中, 5:传输至接收端, 6:批次完成
// -2 (生成中), -3 (注入中), -4 (识别中) 是临时锁定状态，用于禁用所有按钮
const stageIndex = ref(-1)
// 存储各项统计数据
const stats = reactive({
  general: 0, //一般数据
  business: 0, //业务数据
  filtered: 0, //已过滤数据
  labeled: 0, //已注入标识数据
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
  stageIndex.value = -1 //流程阶段回到待命
  Object.keys(stats).forEach((key) => {
    stats[key] = 0 //统计数据全部归0
  })
  dataBlocks.value = [] //清空数据块
  labelCounter.value = 0 //重置标签计数器
  batchCounter.value = 0 //重置批次计数器
  // nextTick(() => generateNewBatch())
}

// 执行：生成新批次数据
const generateNewBatch = () => {
  // 只有在流程为-1或6时，才允许生成新批次
  if (stageIndex.value !== -1 && stageIndex.value !== 6) return
  // 临时状态禁用全部按钮
  stageIndex.value = -2

  // 立即清空旧数据块（视觉上），并禁用按钮
  dataBlocks.value = dataBlocks.value.filter((b) => b.state === 'received')
  stageIndex.value = 0

  const zoneWidth = 100 / 5
  // 定义粒子汇聚和数据块扩展的中心点
  const convergePoint = { x: zoneWidth / 2, y: 45 }

  // --- 步骤1: 创建并启动粒子汇聚动画 ---
  const particles = []
  for (let i = 0; i < TOTAL_BLOCKS_PER_BATCH; i++) {
    particles.push({
      id: Date.now() + i,
      style: {
        top: `${Math.random() * 80 + 10}%`,
        left: `${Math.random() * (zoneWidth - 4) + 2}%`,
        '--target-x': `${convergePoint.x}%`,
        '--target-y': `${convergePoint.y}%`,
        transform: `scale(${Math.random() * 0.8 + 0.5})`,
        animationDelay: `${Math.random() * 0.3}s`
      }
    })
  }
  generationParticles.value = particles
  const animationDuration = 1200

  // --- 步骤2: 在粒子动画结束后，执行数据块的“扩展”动画 ---
  const timerId = setTimeout(() => {
    generationParticles.value = []

    stats.general = 0
    stats.business = 0
    stats.filtered = 0
    stats.labeled = 0
    stats.identified = 0
    labelCounter.value = 0
    batchCounter.value++

    const newBlocks = []
    for (let i = 0; i < TOTAL_BLOCKS_PER_BATCH; i++) {
      const isBusiness = Math.random() > 0.3
      if (isBusiness) stats.business++
      else stats.general++

      // 先计算出数据块的“最终”随机位置
      const finalTop = `${Math.random() * 70 + 15}%`
      const finalLeft = `${Math.random() * (zoneWidth - 10) + 5}%`

      newBlocks.push({
        id: Date.now() + i,
        batchId: batchCounter.value,
        type: isBusiness ? 'business' : 'general',
        state: 'idle',
        labelId: null,
        showLabel: true,
        style: {
          // 将数据块的“初始”位置设置在中心点
          top: `${convergePoint.y}%`,
          left: `${convergePoint.x}%`,
          // 初始状态为缩小、透明
          transform: 'scale(0.1)',
          opacity: 0,
          // 将最终位置暂存在 style 中，方便后续读取
          '--final-top': finalTop,
          '--final-left': finalLeft,
          animationDelay: `${Math.random() * 2}s`,
          zIndex: 1
        }
      })
    }
    dataBlocks.value.push(...newBlocks)

    // 使用一个极短的延时（比 nextTick 更可靠）来确保初始样式被渲染
    setTimeout(() => {
      dataBlocks.value.forEach((block) => {
        // 只对刚刚创建的、带有 '--final-top' 标记的块执行动画
        if (block.style['--final-top']) {
          // 更新到最终样式，CSS transition 会自动处理动画
          block.style.top = block.style['--final-top']
          block.style.left = block.style['--final-left']
          block.style.transform = 'scale(1)'
          block.style.opacity = 1
          // 清理临时属性
          delete block.style['--final-top']
          delete block.style['--final-left']
        }
      })
      stageIndex.value = 0
    }, 20) // 20ms 延迟
    runningTimeouts.delete(timerId)
  }, animationDuration)
  runningTimeouts.add(timerId)
}

// 执行：发送数据
const triggerSend = () => {
  // 只有在流程为0时，才允许发送
  if (stageIndex.value !== 0) return
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

  // --- 步骤1: 启动扫描动画 ---
  stageIndex.value = 2 // 立即更新阶段，激活区域样式
  isFiltering.value = true // 锁定
  showFilterScanner.value = true // 激活 v-if，显示扫描线
  const scanDuration = 1500 // 扫描动画总时长
  const dissipationDuration = 800 // 数据块自身的消散动画时长 (来自CSS)
  const zoneWidth = 100 / 5

  // --- 步骤2: 遍历当前区域的数据块，为它们安排动画 ---
  dataBlocks.value.forEach((block) => {
    if (block.state === 'moving') {
      // --- 对于“一般数据”，计算并触发渐进式消散 ---
      if (block.type === 'general') {
        const blockTopPercent = parseFloat(block.style.top) || 50 // 获取块的垂直位置
        // 根据块的垂直位置，计算它应该在何时开始消散
        // 目标：扫描线扫到它的时候，它开始播放0.8秒的消散动画
        const delayRange = scanDuration - dissipationDuration // 动画延迟的总范围
        const topRange = 85 - 15 // 块在Y轴上的大致活动范围
        const startDelay = Math.max(0, (blockTopPercent - 15) / topRange) * delayRange
        // 使用setTimeout为每个块安排独立的动画和清理任务
        const blockTimerId = setTimeout(() => {
          // 1. 触发CSS消散动画
          block.state = 'filtered'
          stats.filtered++
          // 2. 在消散动画结束后，将自己从数组中移除
          const removalTimerId = setTimeout(() => {
            const index = dataBlocks.value.findIndex((b) => b.id === block.id)
            if (index !== -1) {
              dataBlocks.value.splice(index, 1)
            }
            runningTimeouts.delete(removalTimerId)
          }, dissipationDuration + 200)
          runningTimeouts.add(removalTimerId)
        }, startDelay)
        runningTimeouts.add(blockTimerId)
      }
    }
  })

  // --- 步骤3: 在扫描动画结束后，统一处理“业务数据”的流转 ---
  const moveTimerId = setTimeout(() => {
    showFilterScanner.value = false // 扫描动画结束 (1.5s)，立即移除扫描线
    dataBlocks.value.forEach((block) => {
      // 找到那些没有被过滤掉的业务数据块
      if (block.state === 'moving' && block.type === 'business') {
        // 将它们流转到下一个区域
        block.state = 'toLabeling'
        block.style.top = `${Math.random() * 70 + 15}%`
        block.style.left = `${zoneWidth * 2 + Math.random() * (zoneWidth - 10) + 5}%`
      }
    })

    // 增加额外延迟，等待数据块移动动画 (2.5s) 完成
    const moveDuration = 2500 // 对应 .data-block 的 2.5s transition
    const unlockTimerId = setTimeout(() => {
      isFiltering.value = false // 此时才真正解锁
      runningTimeouts.delete(unlockTimerId)
    }, moveDuration)
    runningTimeouts.add(unlockTimerId)

    runningTimeouts.delete(moveTimerId)
  }, scanDuration)
  runningTimeouts.add(moveTimerId)
}

// 新增函数：注入干扰项
// (此函数在 triggerLabel 末尾调用)
const injectDecoyBlocks = () => {
  // 返回一个 Promise，以便在动画完成后才解锁按钮
  return new Promise((resolve) => {
    const zoneWidth = 100 / 5
    const zoneLeft = zoneWidth * 3 // 目标区域：识别核心
    const numDecoys = Math.floor(Math.random() * 6) + 5 // 随机 5-10 个
    const newDecoys = []

    for (let i = 0; i < numDecoys; i++) {
      newDecoys.push({
        id: Date.now() + i + 2000, // 新的 ID 范围
        batchId: batchCounter.value,
        type: 'decoy', // 新类型：干扰项
        state: 'decoy-idle', // 新状态：干扰项待命
        labelId: null,
        showLabel: false,
        style: {
          top: '110%', // 初始位置在屏幕下方
          left: `${zoneLeft + Math.random() * (zoneWidth - 10) + 5}%`, // 随机横向位置
          transform: 'scale(1)',
          opacity: 1,
          animationDelay: `${Math.random() * 0.5}s`, // 错开浮动动画
          zIndex: Math.random() > 0.5 ? 2 : 0 // 随机层级
        }
      })
    }
    dataBlocks.value.push(...newDecoys)

    // 触发“吹入”动画
    setTimeout(() => {
      dataBlocks.value.forEach((block) => {
        if (block.type === 'decoy' && block.style.top === '110%') {
          block.style.top = `${Math.random() * 70 + 15}%` // 移动到区域内的随机Y位置
        }
      })
    }, 20)

    // 干扰项的“吹入”动画在 CSS 中设置为 1.5s
    const decoyTimerId = setTimeout(() => {
      runningTimeouts.delete(decoyTimerId)
      resolve() // 1.5s 后，Promise 完成
    }, 1500)
    runningTimeouts.add(decoyTimerId)
  })
}

// 执行：注入标识
const triggerLabel = () => {
  // 必须在流程为2才能注入标识
  if (stageIndex.value !== 2) return
  // 按钮禁用
  // 设置为临时状态 -3，禁用所有按钮
  stageIndex.value = -3
  const zoneWidth = 100 / 5

  // 在此阶段随机插入3-5个粉色数据块
  const numSpecialBlocks = Math.floor(Math.random() * 3) + 3
  const newSpecialBlocks = []
  for (let i = 0; i < numSpecialBlocks; i++) {
    newSpecialBlocks.push({
      id: Date.now() + i + 1000, // 增加偏移量避免瞬时ID冲突
      batchId: batchCounter.value,
      type: 'special', // 新类型，用于CSS设置粉色
      state: 'toLabeling', // 初始状态为“待打标签”，以便被后续逻辑捕获
      labelId: null,
      showLabel: true,
      style: {
        // 初始位置随机分布在“标识引擎”区域
        top: `${Math.random() * 70 + 15}%`,
        left: `${zoneWidth * 2 + Math.random() * (zoneWidth - 10) + 5}%`,
        // 初始状态为透明和缩小，用于淡入
        transform: 'scale(0.8)',
        opacity: 0,
        animationDelay: `${Math.random() * 2}s`,
        // zIndex 随机，实现和蓝色块的穿插 (蓝色块默认为1)
        zIndex: Math.random() > 0.5 ? 2 : 0
      }
    })
  }
  // 将新创建的粉色块添加到主数组中
  dataBlocks.value.push(...newSpecialBlocks)

  // 使用短setTimeout来触发 CSS 过渡，实现淡入效果
  setTimeout(() => {
    dataBlocks.value.forEach((block) => {
      // 找到刚才添加的透明块
      if (block.type === 'special' && block.style.opacity === 0) {
        block.style.transform = 'scale(1)'
        block.style.opacity = 1
      }
    })
  }, 20) // 20ms 延迟确保初始状态已渲染

  // 筛选出所有需要处理的数据块 (现在自动包括了 'business' 和我们刚添加的 'special')
  const blocksToProcess = dataBlocks.value.filter((block) => block.state === 'toLabeling')
  if (blocksToProcess.length === 0) {
    // 逻辑变更：如果没块要处理，直接注入干扰项
    injectDecoyBlocks().then(() => {
      stageIndex.value = 3 // 解锁下一步
    })
    return
  }

  // 延迟 0.5s 执行，等待粉色块浮现并停顿
  const labelTimerId = setTimeout(() => {
    // 1. 遍历所有块，让它们变色、获取ID，并开始移动
    blocksToProcess.forEach((block) => {
      block.state = 'labeled' // 变色逻辑(CSS)会在这里触发
      stats.labeled++
      labelCounter.value++
      block.labelId = `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String(
        labelCounter.value
      ).padStart(3, '0')}` // 标识(HTML)会在这里触发

      // 状态变更和“开始移动”逻辑
      block.state = 'toIdentifying' // 状态变更为“待识别”
      // 移动到下一个区域（识别核心），这个CSS动画时长为 2.5s
      block.style.top = `${Math.random() * 70 + 15}%`
      block.style.left = `${zoneWidth * 3 + Math.random() * (zoneWidth - 10) + 5}%`
    })
    runningTimeouts.delete(labelTimerId)

    // 动画顺序调整
    // 设置一个定时器，等待 2.5s，即等所有块都移动完成
    const moveDuration = 2500 // 必须与 .data-block 的 transition 时长(2.5s)匹配
    const moveTimerId = setTimeout(() => {
      // 所有块移动到位后，才开始注入干扰项
      injectDecoyBlocks().then(() => {
        // 干扰项也“吹入”完成后，才将流程推进到下一阶段
        stageIndex.value = 3
      })
      runningTimeouts.delete(moveTimerId)
    }, moveDuration)
    runningTimeouts.add(moveTimerId)
  }, 500) // 延迟 0.5s 执行变色和打标签
  runningTimeouts.add(labelTimerId)
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
  // 判断当前批次数（堆叠数）是否超过6
  if (batchKeys.length > 6) {
    const timerId = setTimeout(() => {
      resetSimulation() // 调用重置函数
      runningTimeouts.delete(timerId)
    }, 1500) // 延迟1.5秒后执行
    runningTimeouts.add(timerId)
    return
  }
  const totalBatches = batchKeys.length //总批次数

  // 遍历每个批次，为其中的数据块计算最终的堆叠位置
  batchKeys.forEach((batchId, batchIndex) => {
    const batchBlocks = batches[batchId]
    
    const specialBlocks = batchBlocks.filter((b) => b.type === 'special')
    const businessBlocks = batchBlocks.filter((b) => b.type === 'business')

    const specialBlock = specialBlocks.slice(-1)[0] // 取出唯一的粉色块
    const businessToShow = businessBlocks.slice(-4) // 最多取 4 个蓝色块

    const visibleBlocks = []

    if (specialBlock) {
      // 如果有粉色块，动态计算中间点
      const middleIndex = Math.floor(businessToShow.length / 2)
      
      // 1. 添加中间点之前的蓝色块
      visibleBlocks.push(...businessToShow.slice(0, middleIndex))
      // 2. 添加粉色块
      visibleBlocks.push(specialBlock)
      // 3. 添加中间点之后的蓝色块
      visibleBlocks.push(...businessToShow.slice(middleIndex))
    } else {
      // 如果没有粉色块，就只显示最多 5 个蓝色块
      visibleBlocks.push(...businessBlocks.slice(-5))
    }

    const allVisibleIds = new Set(visibleBlocks.map((b) => b.id))
    const hiddenBlocks = batchBlocks.filter((b) => !allVisibleIds.has(b.id))

    // 控制水平位置和垂直位置
    const stackBaseLeft = recipientZoneLeft + (batchIndex % 2) * (availableWidth / 2) + 4
    const stackBaseTop = Math.floor(batchIndex / 2) * 25 + 16

    // 为可见的块设置最终的层叠位置
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

// 新增函数：执行识别
// (此函数在 triggerIdentify 内部调用)
const proceedWithIdentification = () => {
  stageIndex.value = 4 // 激活“识别中”状态
  const zoneWidth = 100 / 5
  // 筛选时排除了干扰项（它们已被移除）
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
    block.state = 'identified'
    block.style.top = `${yOffsetPercent}%`
    block.style.left = `${zoneWidth * 3 + (xOffsetPercent / 100) * (zoneWidth - 4) + 2}%`
  })
  // 模拟识别过程
  const timerId1 = setTimeout(() => {
    stageIndex.value = 5 // 进入“传输至接收端”阶段
    // 遍历所有数据块，将已识别的块标记为已接收
    dataBlocks.value.forEach((block) => {
      if (block.state === 'identified') {
        block.state = 'received' // 状态变更为“已接收” (CSS里已改为按类型变色)
        stats.received++ // 增加已接收计数
      }
    })
    reorderReceivedBlocks() // 调用函数将接收到的块重新排列

    // 再次使用 setTimeout 模拟数据传输和最终处理
    const timerId2 = setTimeout(() => {
      if (stageIndex.value === 5) {
        stageIndex.value = 6 // 进入“批次完成”阶段
        const currentBatchId = batchCounter.value

        // 复后的清理逻辑，筛选出当前批次中所有已接收的块
        const receivedBlocksInCurrentBatch = dataBlocks.value.filter(
          (b) => b.batchId === currentBatchId && b.state === 'received'
        )

        // --- 重新执行 reorderReceivedBlocks 中的“可见块”筛选逻辑 ---
        // 这一步至关重要，确保我们只保留那些“可见”的块
        const specialBlocks = receivedBlocksInCurrentBatch.filter((b) => b.type === 'special')
        const businessBlocks = receivedBlocksInCurrentBatch.filter((b) => b.type === 'business')

        const specialBlock = specialBlocks.slice(-1)[0]
        const businessToShow = businessBlocks.slice(-4)
        const visibleBlocks = [] // 用来存放真正可见的块

        if (specialBlock) {
          // 动态居中逻辑
          const middleIndex = Math.floor(businessToShow.length / 2)
          visibleBlocks.push(...businessToShow.slice(0, middleIndex))
          visibleBlocks.push(specialBlock)
          visibleBlocks.push(...businessToShow.slice(middleIndex))
        } else {
          // Fallback
          visibleBlocks.push(...businessBlocks.slice(-5))
        }
        // --- 筛选逻辑结束 ---

        // 现在 visibleBlockIdsInCurrentBatch 只包含那 5 个可见块的 ID
        const visibleBlockIdsInCurrentBatch = new Set(
          visibleBlocks.map((b) => b.id)
        )

        // 过滤 dataBlocks 数组
        dataBlocks.value = dataBlocks.value.filter((b) => {
          // 如果不是当前批次的块，则保留
          if (b.batchId !== currentBatchId) {
            return true
          }
          // 如果是当前批次的块，则仅保留那些“可见”的 (在 reorder 中选中的)
          return visibleBlockIdsInCurrentBatch.has(b.id)
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

// 执行：开始识别
const triggerIdentify = () => {
  // 必须在流程为3才能开始识别
  if (stageIndex.value !== 3) return
  // 按钮禁用与干扰项消除
  stageIndex.value = -4 // 设置为临时状态 -4，禁用所有按钮

  const decoys = dataBlocks.value.filter((b) => b.type === 'decoy')
  // 增加排序和交错延迟
  decoys.sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top)) // 按Y轴排序

  if (decoys.length > 0) {
    // 1. 如果有干扰项，触发它们的“向上吹出”消除动画
    decoys.forEach((decoy, index) => {
      decoy.style.animationDelay = `${index * 0.05}s`
      decoy.style.transitionDelay = '' // 清除
      decoy.state = 'decoy-removing' // 触发 CSS 消失动画
    })

    // 2. 在消除动画 (1s + 交错延迟) 结束后，再执行后续逻辑
    const baseRemovalTime = 1000 // 对应 CSS 的 1s
    const totalRemovalTime = baseRemovalTime + (decoys.length - 1) * 50

    const removalTimerId = setTimeout(() => {
      // 3. 从主数组中彻底移除干扰项
      dataBlocks.value = dataBlocks.value.filter((b) => b.type !== 'decoy')
      // 4. 继续执行原本的识别逻辑
      proceedWithIdentification()
      runningTimeouts.delete(removalTimerId)
    }, totalRemovalTime) // 使用计算后的总时间
    runningTimeouts.add(removalTimerId)
  } else {
    // 没有干扰项，立即执行
    proceedWithIdentification()
  }
}

// onMounted(() => {
//   generateNewBatch()
// })

// 清理工作
onBeforeUnmount(() => {
  clearAllTimeouts()
})

// 为每个区域创建单独的悬停状态
const isSourceHovered = ref(false)
const isGatewayHovered = ref(false)
const isLabelHovered = ref(false)
const isIdentifyHovered = ref(false)
const isRecipientHovered = ref(false)

// 存放生成阶段的动画粒子
const generationParticles = ref([])
// 过滤扫描动画的显示状态
const isFiltering = ref(false)
// 专门控制扫描线的显示
const showFilterScanner = ref(false)
</script>

<template>
  <div class="visual-container">
    <div class="starfield">
      <div class="stars stars1"></div>
      <div class="stars stars2"></div>
      <div class="stars stars3"></div>
    </div>
    <div class="control-panel">
      <div class="title" @dblclick="resetSimulation">
        <span>标识生成与识别可视化系统</span>
      </div>
      <div class="actions">
        <div class="custom-button-group">
          <el-button
            class="btn-generate"
            @click="generateNewBatch"
            size="default"
            :disabled="stageIndex !== -1 && stageIndex !== 6"
          >
            生成数据
          </el-button>
          <el-button
            class="btn-send"
            @click="triggerSend"
            size="default"
            :disabled="stageIndex !== 0"
          >
            发送数据
          </el-button>
          <el-button
            class="btn-filter"
            @click="triggerFilter"
            size="default"
            :disabled="stageIndex !== 1"
          >
            执行过滤
          </el-button>
          <el-button
            class="btn-label"
            @click="triggerLabel"
            size="default"
            :disabled="stageIndex !== 2 || isFiltering"
          >
            注入标识
          </el-button>
          <el-button
            class="btn-identify"
            @click="triggerIdentify"
            size="default"
            :disabled="stageIndex !== 3"
          >
            开始识别
          </el-button>
        </div>
      </div>
    </div>

    <div class="main-flow">
      <div class="flow-animation-layer">
        <div
          v-for="p in generationParticles"
          :key="p.id"
          class="generation-particle"
          :style="p.style"
        ></div>
        <div
          v-for="block in dataBlocks"
          :key="block.id"
          :class="['data-block', block.type, block.state]"
          :style="block.style"
        >
          <div class="inner-block"></div>
          <template v-if="block.state === 'filtered'">
            <div class="particle" v-for="i in 5" :key="i"></div>
          </template>
          <div v-if="block.labelId && block.showLabel" class="tag-id">
            {{ block.labelId }}
          </div>
        </div>
      </div>

      <div class="flow-zone source-zone" :class="{ active: stageIndex === 0 }">
        <div
          class="zone-header"
          @mouseenter="isSourceHovered = true"
          @mouseleave="isSourceHovered = false"
        >
          <Transition name="fade-swap" mode="out-in">
            <div v-if="!isSourceHovered" class="header-content default">
              <el-icon size="18"><Position /></el-icon>
              <span>数据源</span>
            </div>
            <div v-else class="header-content hovered">
              <p>生成混合数据流</p>
            </div>
          </Transition>
        </div>
        <div class="zone-content">
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
        <div class="zone-status" :class="{ active: stageIndex >= 0 }">
          <span v-if="stageIndex === 0">数据流准备就绪</span>
          <span v-else-if="stageIndex >= 1">数据发送完成</span>
          <span v-else>待机</span>
        </div>
      </div>
      <div class="flow-zone gateway-zone" :class="{ active: stageIndex === 1 }">
        <div
          class="zone-header"
          @mouseenter="isGatewayHovered = true"
          @mouseleave="isGatewayHovered = false"
        >
          <Transition name="fade-swap" mode="out-in">
            <div v-if="!isGatewayHovered" class="header-content default">
              <el-icon size="18"><Filter /></el-icon>
              <span>网关路由</span>
            </div>
            <div v-else class="header-content hovered">
              <p>根据白名单进行重定向</p>
            </div>
          </Transition>
        </div>
        <div class="zone-content">
          <div v-if="showFilterScanner" class="filter-scanner"></div>
          <div class="stat-item single">
            <span class="label">已过滤</span>
            <span class="value filtered">{{ stats.filtered }}</span>
          </div>
        </div>
        <div class="zone-status" :class="{ active: stageIndex >= 1 }">
          <span v-if="stageIndex >= 2">数据过滤完成</span>
          <span v-else>待机</span>
        </div>
      </div>
      <div class="flow-zone label-zone" :class="{ active: stageIndex === 2 }">
        <div
          class="zone-header"
          @mouseenter="isLabelHovered = true"
          @mouseleave="isLabelHovered = false"
        >
          <Transition name="fade-swap" mode="out-in">
            <div v-if="!isLabelHovered" class="header-content default">
              <el-icon size="18"><CollectionTag /></el-icon>
              <span>标识引擎</span>
            </div>
            <div v-else class="header-content hovered">
              <p>标识生成与流量重构</p>
            </div>
          </Transition>
        </div>
        <div class="zone-content">
          <div class="stat-item single">
            <span class="label">已标识</span>
            <span class="value labeled">{{ stats.labeled }}</span>
          </div>
        </div>
        <div class="zone-status" :class="{ active: stageIndex >= 2 }">
          <span v-if="stageIndex >= 3">标识注入完成</span>
          <span v-else>待机</span>
        </div>
      </div>
      <div class="flow-zone identify-zone" :class="{ active: stageIndex === 3 }">
        <div
          class="zone-header"
          @mouseenter="isIdentifyHovered = true"
          @mouseleave="isIdentifyHovered = false"
        >
          <Transition name="fade-swap" mode="out-in">
            <div v-if="!isIdentifyHovered" class="header-content default">
              <el-icon size="18"><Aim /></el-icon>
              <span>识别核心</span>
            </div>
            <div v-else class="header-content hovered">
              <p>高效识别流量</p>
            </div>
          </Transition>
        </div>
        <div class="zone-content">
          <div class="stat-item single">
            <span class="label">已识别</span>
            <span class="value identified">{{ stats.identified }}</span>
          </div>
        </div>
        <div class="zone-status" :class="{ active: stageIndex >= 3 }">
          <span v-if="stageIndex >= 4">数据识别完成</span>
          <span v-else>待机</span>
        </div>
      </div>
      <div
        class="flow-zone recipient-zone"
        :class="{ active: stageIndex === 4 || stageIndex === 5 }"
      >
        <div
          class="zone-header"
          @mouseenter="isRecipientHovered = true"
          @mouseleave="isRecipientHovered = false"
        >
          <Transition name="fade-swap" mode="out-in">
            <div v-if="!isRecipientHovered" class="header-content default">
              <el-icon size="18"><CircleCheck /></el-icon>
              <span>接收端</span>
            </div>
            <div v-else class="header-content hovered">
              <p>接收业务数据</p>
            </div>
          </Transition>
        </div>
        <div class="zone-content">
          <div class="stat-item single">
            <span class="label">已接收</span>
            <span class="value received">{{ stats.received }}</span>
          </div>
        </div>
        <div class="zone-status" :class="{ active: stageIndex === 4 || stageIndex >= 5 }">
          <span v-if="stageIndex >= 5">批次传输完成</span>
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
.starfield {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0; /* 在网格背景之下 */
  transform-origin: center;
  overflow: hidden;
}
.stars {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 150vmax;
  height: 150vmax;
  background: transparent;
  border-radius: 50%;
  transform-origin: center;
  background-repeat: repeat;
}
.stars1 {
  /* 前景 */
  background-image:
    radial-gradient(2px 2px at 80% 20%, #fff, transparent),
    radial-gradient(1.5px 1.5px at 15% 50%, #fff, transparent),
    radial-gradient(1.5px 1.5px at 60% 70%, #fff, transparent),
    radial-gradient(2px 2px at 35% 85%, #fff, transparent);
  background-size: 300px 300px;
  animation: rotate-stars 120s linear infinite;
}
.stars2 {
  /* 中景 */
  background-image:
    radial-gradient(1.5px 1.5px at 55% 45%, #fff, transparent),
    radial-gradient(1px 1px at 25% 30%, #fff, transparent),
    radial-gradient(1.5px 1.5px at 30% 80%, #fff, transparent),
    radial-gradient(1px 1px at 10% 5%, #fff, transparent),
    radial-gradient(1.5px 1.5px at 90% 60%, #fff, transparent);
  background-size: 250px 250px;
  animation: rotate-stars 160s linear infinite reverse;
}
.stars3 {
  /* 远景 */
  background-image:
    radial-gradient(1px 1px at 5% 90%, #fff, transparent),
    radial-gradient(1px 1px at 50% 50%, #fff, transparent),
    radial-gradient(1px 1px at 95% 95%, #fff, transparent),
    radial-gradient(1px 1px at 85% 40%, #fff, transparent),
    radial-gradient(1px 1px at 70% 90%, #fff, transparent);
  background-size: 200px 200px;
  animation: rotate-stars 200s linear infinite;
}
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
  user-select: none; /* 禁止用户选中文本 */
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
  font-weight: bold;
}
.btn-generate:hover {
  background-color: #79bbff !important;
}
.btn-generate.is-disabled {
  background-color: #a0cfff !important;
  font-weight: normal;
}
/* 2. 发送数据 - 绿色 */
.btn-send {
  background-color: #67c23a !important;
  font-weight: bold;
}
.btn-send:hover {
  background-color: #95d475 !important;
}
.btn-send.is-disabled {
  background-color: #b3e19d !important;
  font-weight: normal;
}
/* 3. 执行过滤 - 橙色 */
.btn-filter {
  background-color: #e6a23c !important;
  font-weight: bold;
}
.btn-filter:hover {
  background-color: #eebe77 !important;
}
.btn-filter.is-disabled {
  background-color: #f3d19e !important;
  font-weight: normal;
}
/* 4. 注入标识 - 红色 */
.btn-label {
  background-color: #f56c6c !important;
  font-weight: bold;
}
.btn-label:hover {
  background-color: #f89898 !important;
}
.btn-label.is-disabled {
  background-color: #fab6b6 !important;
  font-weight: normal;
}
/* 5. 开始识别 - 紫色 */
.btn-identify {
  background-color: #9370db !important;
  font-weight: bold;
}
.btn-identify:hover {
  background-color: #b393e0 !important;
}
.btn-identify.is-disabled {
  background-color: #c9b4e9 !important;
  font-weight: normal;
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
  background: transparent;
  /* border: 2.5px solid #1a5c96; */
  border-radius: 8px;
  flex: 1; /* 均分宽度 */
  display: flex;
  flex-direction: column;
  /* backdrop-filter: blur(5px); */
  position: relative;
  transition: all 0.4s ease; /* 过渡动画 */
  /* z-index: 2; */
  overflow: hidden;
  border: 1.5px solid rgba(0, 170, 255, 0.2);
  box-shadow:
    inset 0 0 0 1.5px rgba(0, 170, 255, 0.15),
    0 0 5px rgba(0, 170, 255, 0.1);
  cursor: pointer;
}
.flow-zone.active {
  /* border-color: #61dafb;
  box-shadow: 0 0 20px rgba(97, 218, 251, 0.3); */
  border-color: rgba(0, 255, 255, 0.6);
  box-shadow:
    inset 0 0 0 1.5px rgba(97, 218, 251, 0.4),
    0 0 20px rgba(97, 218, 251, 0.5),
    0 0 40px rgba(97, 218, 251, 0.2);
}
.flow-zone:hover {
  /* transform: translateY(-5px);
  border-color: #00ffff; */
  border-color: rgba(0, 255, 255, 0.6);
  box-shadow:
    inset 0 0 0 1.5px rgba(0, 255, 255, 0.3),
    0 0 15px rgba(0, 255, 255, 0.4);
}

/* 修改层级关系 */
.zone-header,
.zone-content,
.zone-status {
  z-index: 4;
}
.zone-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 16px;
  font-weight: bold;
  padding: 10px 15px;
  background: rgba(1, 4, 18, 0.5);
  border-bottom: 1px solid #1a5c96;
  border-radius: 8px 8px 0 0;
  min-height: 40px;
}
.header-content {
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-content.hovered p {
  margin: 0;
  font-size: 16px;
  color: #c9d5e3;
}
/* 定义切换动画 */
.fade-swap-enter-active,
.fade-swap-leave-active {
  transition: all 0.2s ease;
}
.fade-swap-enter-from,
.fade-swap-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.zone-status {
  padding: 10px;
  text-align: center;
  color: #5a738a;
  border-top: 1px dashed #1a5c96;
  margin-top: auto; /* 将状态栏推到底部 */
  font-family: 'Courier New', monospace;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}
.zone-status.active {
  color: #61dafb;
  font-weight: bold;
}

/* --- 数据统计样式 --- */
.zone-content {
  padding: 10px;
  flex-grow: 1;
  text-align: center;
  position: relative;
}
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  margin-top: -10px;
}
.stat-item.single {
  grid-column: 1 / -1; /* 单个统计项占据整行 */
}
.stat-item .label {
  font-size: 14px;
  color: #88a1b5;
  color: #c4c9cd;
  margin-bottom: 4px;
}
.stat-item .value {
  font-size: 20px;
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
    opacity 0.6s ease,
    transform 0.6s ease;
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
  /* box-shadow: 0 0 15px #00aaff; */
}

/* 新增粉色数据块样式 */
.data-block.special .inner-block {
  background-color: #ff69b4; /* 亮粉色 */
  border-color: #ff85c0;
}

/* 新增干扰项样式 */
.data-block.decoy .inner-block {
  background-color: #909399; /* 灰白色 */
  border-color: #c0c4cc;
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

/* 干扰项动画 */
.data-block.decoy-idle {
  /* 干扰项吹入动画，比标准移动(2.5s)快 */
  transition:
    top 1.5s cubic-bezier(0.2, 0.8, 0.7, 1),
    left 1.5s cubic-bezier(0.2, 0.8, 0.7, 1),
    opacity 0.6s ease,
    transform 0.6s ease;
  animation: float 4s ease-in-out infinite; /* 同样浮动 */
}

/* 干扰项消除动画（向上吹出） */
.data-block.decoy-removing {
  /* 动画属性应用 */
  animation-name: blow-out-up;
  animation-duration: 1s; /* 必须匹配 JS 中的 baseRemovalTime */
  animation-timing-function: cubic-bezier(0.5, 0, 0.75, 1);
  animation-fill-mode: forwards; /* 关键：使动画停留在 'to' 状态 */
  
  /* 移除 transition，防止与 animation 冲突 */
  transition: none; 
}
/* 干扰项向上吹出动画 */
@keyframes blow-out-up {
  from {
    /* 动画开始时：保持原样，完全不透明 */
    opacity: 1;
    transform: rotateX(10deg) scale(1);
  }
  to {
    /* 动画结束时：移动到顶部外侧、完全透明、缩小 */
    top: -20%;
    opacity: 0;
    transform: rotateX(10deg) scale(0.5);
  }
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

/* 生成阶段粒子动画 */
.generation-particle {
  position: absolute;
  width: 12px;
  height: 12px;
  background-color: #36a4ff;
  border-radius: 50%;
  box-shadow:
    0 0 10px #36a4ff,
    0 0 20px #36a4ff;
  opacity: 0;
  /* 应用动画：动画名 时长 缓动函数 填充模式 */
  animation: converge 1.2s ease-in forwards;
}
@keyframes converge {
  0% {
    opacity: 1;
  }
  100% {
    /* 移动到 CSS 变量定义的目标点 */
    top: var(--target-y);
    left: var(--target-x);
    opacity: 0;
    transform: scale(0.1); /* 消失时缩小 */
  }
}

/* --- 过滤扫描动画样式 --- */
.filter-scanner {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 4px; /* 扫描线的厚度 */
  background: linear-gradient(90deg, transparent, #00ffff, transparent); /* 青色渐变光线 */
  box-shadow: 0 0 10px #00ffff;
  border-radius: 2px;
  /* 动画：动画名 持续时间 缓动函数 */
  animation: scan-down 1.5s ease-out;
}
@keyframes scan-down {
  from {
    top: 0;
  }
  to {
    top: 100%;
  }
}

/* 被过滤掉的数据块的消散动画 */
.data-block.filtered {
  /* opacity: 0; */
  pointer-events: none;
  /* transition-duration: 0.8s; */
  /* transform: scale(0); */
}
.data-block.filtered .inner-block {
  opacity: 0;
  transition: opacity 0.2s ease; /* 一个极快的淡出 */
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
}

/* 已接收状态的样式 */
.data-block.business.received .inner-block {
  background-color: #00aaff;
  border-color: #61dafb;
}
.data-block.special.received .inner-block {
  background-color: #ff69b4; /* 亮粉色 */
  border-color: #ff85c0;
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
  animation: inject-tag 1s forwards 0.5s; /* 默认 0.5s 延迟 */
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
</style>