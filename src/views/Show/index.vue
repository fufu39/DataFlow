<!-- 流动演示界面 -->
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

defineOptions({
  name: 'ShowPage'
})

// canvas引用和动画状态
const canvasRef = ref(null)
let ctx = null //canvas绘画上下文
let animationFrameId = null
const particles = [] //粒子数组
const mouse = { x: null, y: null, radius: 100 } //鼠标交互范围

// 用于模拟动态数据的响应式变量
const flowSpeed = ref(1285)
const totalData = ref(15.2)
const sourceStatus = ref('正常')
const latency = ref(15)
const writeSpeed = ref(1275)
const targetHealth = ref(99.8)
let statsInterval = null // 用于持有定时器ID

// 三层粒子配置
const config = {
  particleLayers: [
    {
      count: 200, // 粒子数量
      minSize: 0.9, // 粒子最小尺寸
      maxSize: 2.5, // 粒子最大尺寸
      minSpeed: 0.4, // 最小速度
      maxSpeed: 1.2, // 最大速度
      color: 'rgba(78, 156, 233, 0.4)',
      waveAmplitude: 90,
      waveFrequency: 0.013
    },
    {
      // count: 90,
      count: 170,
      minSize: 1.3,
      maxSize: 3.5,
      minSpeed: 0.5,
      maxSpeed: 1.5,
      color: 'rgba(70, 190, 233, 0.6)',
      waveAmplitude: 75,
      waveFrequency: 0.011
    },
    {
      // count: 80,
      count: 140,
      minSize: 2.0,
      maxSize: 4.5,
      minSpeed: 0.8,
      maxSpeed: 2.1,
      color: 'rgba(229, 234, 243, 0.8)',
      waveAmplitude: 60,
      waveFrequency: 0.009
    }
  ],
  connectionDistance: 90, //粒子间连线最大距离
  connectionOpacity: 0.12, //连线透明度
  connectionLineWidth: 0.35, //连线粗细
  mainWaveAmplitude: 180, //增加主振幅，增加夹角
  mainPathLengthRatio: 0.8 //控制波动路径覆盖画布的比例
}

// 粒子类
class Particle {
  // 初始化时随机分布
  constructor(layerConfig, canvasWidth, canvasHeight, prewarm = false) {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.config = layerConfig
    this.channel = Math.random() < 0.5 ? 1 : -1 //决定粒子在上班去还是下半区

    // 初始化粒子
    this.reset(prewarm)

    // 如果是预热粒子，立即计算其在路径上的正确Y坐标
    if (prewarm) {
      this.calculateY()
      this.startY = this.y
    }
  }

  // 重新生成粒子
  reset(prewarm = false) {
    this.x = prewarm ? Math.random() * this.canvasWidth : -this.size
    this.startY = this.canvasHeight / 2 + (Math.random() - 0.5) * this.canvasHeight * 0.9
    this.y = this.startY
    this.size = Math.random() * (this.config.maxSize - this.config.minSize) + this.config.minSize
    this.speedX =
      Math.random() * (this.config.maxSpeed - this.config.minSpeed) + this.config.minSpeed
    this.color = this.config.color
    this.waveAngle = Math.random() * Math.PI * 2
  }

  // 根据 X 坐标计算 Y 坐标，走在一条主波动曲线上
  calculateY() {
    const pathCoverageWidth = this.canvasWidth * config.mainPathLengthRatio
    const mainPathY =
      this.canvasHeight / 2 +
      this.channel *
        config.mainWaveAmplitude *
        Math.cos((this.x / pathCoverageWidth) * Math.PI * 0.8)
    const secondaryOscillation = Math.sin(this.waveAngle) * this.config.waveAmplitude
    this.y = mainPathY + secondaryOscillation
  }

  // 更新粒子状态
  update() {
    // 鼠标交互的推开效果
    if (mouse.x && mouse.y) {
      const dx = this.x - mouse.x
      const dy = this.y - mouse.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < mouse.radius) {
        const forceDirectionX = dx / distance
        const forceDirectionY = dy / distance
        const force = (mouse.radius - distance) / mouse.radius
        const directionX = forceDirectionX * force * 2
        const directionY = forceDirectionY * force * 2
        this.x -= directionX
        this.y -= directionY
      }
    }

    this.x += this.speedX // 使用基础速度

    const funnelWidth = this.canvasWidth * 0.35
    this.waveAngle += this.speedX * this.config.waveFrequency // 控制上下波动速度

    // 计算粒子目标路径 Y 坐标
    const pathCoverageWidth = this.canvasWidth * config.mainPathLengthRatio
    const mainPathY =
      this.canvasHeight / 2 +
      this.channel *
        config.mainWaveAmplitude *
        Math.cos((this.x / pathCoverageWidth) * Math.PI * 0.8)
    const secondaryOscillation = Math.sin(this.waveAngle) * this.config.waveAmplitude
    const targetY = mainPathY + secondaryOscillation

    // 粒子刚进入画布时，使用平滑过渡，避免跳跃
    if (this.x < funnelWidth) {
      let progress = this.x / funnelWidth
      progress = 1 - Math.pow(1 - progress, 4)
      this.y = this.startY + (targetY - this.startY) * progress
    } else {
      this.y = targetY
    }

    // 粒子超出右边界，用reset从左边重生
    if (this.x > this.canvasWidth + this.size) {
      this.reset()
    }
  }

  // 绘制粒子
  draw() {
    const cosAngle = Math.cos(this.waveAngle)
    const scale = ((cosAngle + 1) / 2) * 0.8 + 0.6 // 粒子缩放
    const opacity = ((cosAngle + 1) / 2) * 0.7 + 0.3 // 粒子透明度变化（呼吸感）

    const rgbColor = this.color.match(/\d+/g).slice(0, 3).join(', ')

    ctx.fillStyle = `rgba(${rgbColor}, ${opacity})`
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size * scale, 0, Math.PI * 2)
    ctx.fill()
  }
}

// 初始化粒子
function init() {
  const canvas = canvasRef.value
  if (!canvas) return
  ctx = canvas.getContext('2d')
  canvas.width = canvas.offsetWidth
  canvas.height = canvas.offsetHeight
  particles.length = 0

  // 直接生成所有粒子（预热），避免一开始是空的
  config.particleLayers.forEach((layer) => {
    for (let i = 0; i < layer.count; i++) {
      particles.push(new Particle(layer, canvas.width, canvas.height, true)) // prewarm = true
    }
  })
}

// 动画循环
function animate() {
  if (!ctx || !canvasRef.value) return

  ctx.fillStyle = 'rgba(13, 17, 23, 0.18)' //尾痕长度（最后一个数字越小越长）
  ctx.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height)

  // 直接更新和绘制所有粒子
  particles.forEach((p) => {
    p.update()
    p.draw()
  })

  // 绘制粒子之间的连线
  drawConnections()

  animationFrameId = requestAnimationFrame(animate)
}

// 绘画连线
function drawConnections() {
  let opacityValue = 1
  const activeParticles = particles.filter(
    (p) =>
      p.x > -config.connectionDistance && p.x < canvasRef.value.width + config.connectionDistance
  )

  for (let a = 0; a < activeParticles.length; a++) {
    for (let b = a; b < activeParticles.length; b++) {
      const dx = activeParticles[a].x - activeParticles[b].x
      const dy = activeParticles[a].y - activeParticles[b].y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < config.connectionDistance) {
        opacityValue = 1 - distance / config.connectionDistance
        ctx.strokeStyle = `rgba(78, 156, 233, ${opacityValue * config.connectionOpacity})`
        ctx.lineWidth = config.connectionLineWidth
        ctx.beginPath()
        ctx.moveTo(activeParticles[a].x, activeParticles[a].y)
        ctx.lineTo(activeParticles[b].x, activeParticles[b].y)
        ctx.stroke()
      }
    }
  }
}

// 鼠标交互
function handleMouseMove(event) {
  const rect = canvasRef.value.getBoundingClientRect()
  mouse.x = event.clientX - rect.left
  mouse.y = event.clientY - rect.top
}
function handleMouseOut() {
  mouse.x = null
  mouse.y = null
}

// 窗口自适应
let resizeTimer = null
function handleResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    init()
  }, 250)
}

// 生命周期钩子
onMounted(() => {
  if (canvasRef.value) {
    init()
    animate()
    window.addEventListener('resize', handleResize)
    canvasRef.value.addEventListener('mousemove', handleMouseMove)
    canvasRef.value.addEventListener('mouseout', handleMouseOut)
  }

  // 模拟数据变化
  statsInterval = setInterval(() => {
    // 模拟流速变化
    flowSpeed.value = 1285 + Math.floor(Math.random() * 100) - 50
    // 模拟数据总量增加
    totalData.value = parseFloat((totalData.value + Math.random() * 0.01).toFixed(2))
    // 模拟延迟变化
    latency.value = 15 + Math.floor(Math.random() * 6) - 3
    // 模拟写入速度变化 (略小于流速)
    writeSpeed.value = flowSpeed.value - (10 + Math.floor(Math.random() * 10))
    // 模拟健康度变化
    targetHealth.value = parseFloat((99.8 + Math.random() * 0.2 - 0.1).toFixed(2))
  }, 1500) // 每1.5秒更新一次
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', handleResize)
  if (canvasRef.value) {
    canvasRef.value.removeEventListener('mousemove', handleMouseMove)
    canvasRef.value.removeEventListener('mouseout', handleMouseOut)
  }
  // 清除定时器
  clearInterval(statsInterval)
})
</script>

<template>
  <div class="animation-page-container">
    <!-- 左侧数据库卡片 -->
    <div class="db-container left-card">
      <div class="db-visualizer">
        <div class="ring"></div>
        <div class="ring"></div>
        <div class="ring"></div>
        <div class="core"></div>
      </div>
      <div class="db-info">
        <div class="db-info">
          <div class="db-title">发送节点</div>
          <div class="db-stat">
            流速: <span>{{ flowSpeed }} MB/s</span>
          </div>
          <div class="db-stat">
            总量: <span>{{ totalData }} TB</span>
          </div>
          <div class="db-stat">
            状态: <span class="status-ok">{{ sourceStatus }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 中间粒子流canvas -->
    <div class="canvas-wrapper">
      <canvas ref="canvasRef"></canvas>
    </div>

    <!-- 右侧数据库卡片 -->
    <div class="db-container right-card">
      <div class="db-visualizer">
        <div class="ring"></div>
        <div class="ring"></div>
        <div class="ring"></div>
        <div class="core"></div>
      </div>
      <div class="db-info">
        <div class="db-title">接收节点</div>
        <div class="db-stat">
          延迟: <span>~{{ latency }} ms</span>
        </div>
        <div class="db-stat">
          写入: <span>{{ writeSpeed }} MB/s</span>
        </div>
        <div class="db-stat">
          健康度: <span class="health-ok">{{ targetHealth }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animation-page-container {
  width: 100%;
  height: calc(100% - 18px);
  overflow: hidden;
  background-color: #0d1117;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  gap: 20px;
  box-shadow: 0 0 15px 3px rgba(138, 138, 138, 0.3);
  border-radius: 4px;
}

.canvas-wrapper {
  flex-grow: 1;
  height: 100%;
  border-left: 1px solid rgba(78, 156, 233, 0.2);
  border-right: 1px solid rgba(78, 156, 233, 0.2);
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}

/* 数据库卡片 */
.db-container {
  width: 280px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 50px;
  flex-shrink: 0;
  color: #fff;
  position: relative;
  overflow: hidden;
  padding: 20px;
  border-radius: 8px;
  background: rgba(27, 28, 29, 0.7);
  border: 1px solid #3a3d40;
}

.db-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, transparent, #4e9ce9, transparent);
  animation: scan-top 2.5s linear infinite;
}

@keyframes scan-top {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* 波动图形 */
.db-visualizer {
  width: 80px;
  height: 80px;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.ring {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(0.2);
  width: 140%;
  height: 140%;
  border-radius: 50%;
  border: 1px solid #4e9ce9;
  transform-origin: center center;
  animation: ring-pulse 3s linear infinite;
  opacity: 0;
  will-change: transform, opacity;
  pointer-events: none;
}

.ring:nth-child(1) {
  animation-delay: 0s;
}
.ring:nth-child(2) {
  animation-delay: -1s;
}
.ring:nth-child(3) {
  animation-delay: -2s;
}

.core {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #4e9ce9;
  box-shadow:
    0 0 15px #4e9ce9,
    0 0 25px #4e9ce9;
  animation: core-pulse 1.5s ease-in-out infinite alternate;
}

@keyframes ring-pulse {
  0% {
    transform: translate(-50%, -50%) scale(0.2);
    opacity: 0;
  }
  15% {
    transform: translate(-50%, -50%) scale(0.55);
    opacity: 0.55;
  }
  45% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.95;
  }
  80% {
    transform: translate(-50%, -50%) scale(1.35);
    opacity: 0.25;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.6);
    opacity: 0;
  }
}

@keyframes core-pulse {
  from {
    transform: scale(0.9);
    box-shadow:
      0 0 15px #4e9ce9,
      0 0 25px #4e9ce9;
  }
  to {
    transform: scale(1);
    box-shadow:
      0 0 25px #4e9ce9,
      0 0 40px #4e9ce9;
  }
}

.db-info {
  text-align: center;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
.db-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 12px;
}
.db-stat {
  font-size: 0.9rem;
  color: #a0aec0;
}
.db-stat span {
  color: #fff;
  font-weight: bold;
}
</style>
