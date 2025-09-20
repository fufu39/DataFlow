<!-- 用户数据查询界面 -->
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
// 引入 ECharts 用于背景地球
import * as echarts from 'echarts'
import 'echarts-gl'
import earthTexture from '@/assets/earth.jpg'

defineOptions({
  name: 'UserQuery'
})

// --- 视图状态管理 ---
const userId = ref('') // 路由传参的userId
const isLoading = ref(false)
const loadingText = ref('正在验证访问权限...')
const router = useRouter()

// --- 查询与路由跳转处理 ---
const handleSearch = () => {
  if (isLoading.value || !userId.value.trim()) {
    return
  }

  isLoading.value = true
  loadingText.value = '正在验证访问权限...'
  setTimeout(() => {
    loadingText.value = '权限验证通过，正在建立数据链路...'
    setTimeout(() => {
      router.push({
        name: 'UserDetail',
        query: {
          userId: userId.value
        }
      })
    }, 2000)
  }, 1000)
}

// --- 背景地球逻辑 ---
const globeBgRef = ref(null)
let globeBgChart = null
const queryContainerRef = ref(null)
let resizeObserver = null

const initGlobeBackground = () => {
  if (globeBgRef.value) {
    globeBgChart = echarts.init(globeBgRef.value)
    const option = {
      backgroundColor: 'transparent',
      globe: {
        baseTexture: earthTexture,
        shading: 'realistic',
        realisticMaterial: {
          roughness: 0.8,
          metalness: 0.8
        },
        postEffect: {
          enable: true
        },
        light: {
          main: { intensity: 1.0, shadow: false },
          ambient: { intensity: 1.0 }
        },
        viewControl: {
          autoRotate: false, // 初始设置为不自动旋转
          autoRotateSpeed: 5,
          targetCoord: [116.46, 39.92],
          // 禁用所有交互
          zoomSensitivity: 0,
          rotateSensitivity: 0,
          panSensitivity: 0
        }
      },
      series: []
    }
    globeBgChart.setOption(option)
  }
}

// 在onMounted中初始化背景地球
onMounted(() => {
  initGlobeBackground()
  setTimeout(() => {
    // 开始播放扫描动画
    showScanLine.value = true
    isScanning.value = true
    setTimeout(() => {
      showScanLine.value = false // 隐藏扫描线
      // 启动地球的自动旋转
      if (globeBgChart) {
        globeBgChart.setOption({
          globe: {
            viewControl: {
              autoRotate: true
            }
          }
        })
      }
    }, 3000)
  }, 300)
  if (queryContainerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      globeBgChart?.resize()
    })
    resizeObserver.observe(queryContainerRef.value)
  }
})
// 在onBeforeUnmount中销毁实例
onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  globeBgChart?.dispose()
})

const isScanning = ref(false) // 控制地球扫描动画
const showScanLine = ref(false) // 控制扫描线是否显示
</script>

<template>
  <div class="query-container" ref="queryContainerRef">
    <!-- 背景地球虚影容器 -->
    <div v-if="showScanLine" class="scan-line"></div>
    <div ref="globeBgRef" class="globe-background" :class="{ 'is-scanning': isScanning }"></div>
    <!-- 搜索框 -->
    <div class="query-box">
      <span class="corner top-left"></span><span class="corner top-right"></span>
      <span class="corner bottom-left"></span><span class="corner bottom-right"></span>
      <div class="query-content">
        <div class="terminal-status">
          <span>SYSTEM STATUS: </span><span class="status-online">ONLINE</span
          ><span class="blinking-cursor">_</span>
        </div>
        <h1 class="query-title">[ 数据接入点认证 ]</h1>
        <p class="query-subtitle">DATA ACCESS POINT AUTHENTICATION</p>
        <div v-if="!isLoading" class="input-area">
          <el-input
            v-model="userId"
            placeholder="INPUT USER ID..."
            class="query-input"
            @keyup.enter="handleSearch"
          />
          <!-- CONNECT按钮 -->
          <el-button type="primary" class="query-button" @click="handleSearch">
            <span class="button-text">CONNECT</span>
          </el-button>
        </div>
        <div v-else class="loading-area">
          <div class="loader"><span></span><span></span><span></span></div>
          <p class="loading-text" :data-text="loadingText">{{ loadingText }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* --- 查询页面专属样式 --- */
.query-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: calc(100% - 18px);
  position: relative;
  background-color: #0d1117;
  border-radius: 4px;
  box-shadow: 0 0 15px 3px rgba(138, 138, 138, 0.3);
  overflow: hidden;
  padding: 20px;
  box-sizing: border-box;
}

/* 扫描线样式和动画 */
.scan-line {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 3px;
  background: #61dafb;
  box-shadow: 0 0 15px 3px #61dafb;
  z-index: 2; /* 介于地球和查询框之间 */
  animation: scan-effect 3s ease-out forwards;
}
@keyframes scan-effect {
  from {
    top: 0%;
  }
  to {
    top: 100%;
  }
}
/* 背景地球样式 */
.globe-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  filter: blur(1px) opacity(0.35); /* 虚化和透明效果 */
  pointer-events: none; /* 确保背景不可交互 */
  clip-path: polygon(0 0, 100% 0, 100% 0, 0 0);
}
.globe-background.is-scanning {
  animation: reveal-globe 3s ease-out forwards;
}
/* 地球显示动画 */
@keyframes reveal-globe {
  from {
    clip-path: polygon(0 0, 100% 0, 100% 0, 0 0); /* 从顶部一条线开始 */
  }
  to {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); /* 扩展到整个容器大小 */
  }
}

/* 搜索框 */
.query-box {
  width: 90%;
  max-width: 650px;
  padding: 40px;
  /* 向上偏移 */
  margin-top: -80px;
  background: rgba(1, 4, 18, 0.7);
  border: 1px solid #1a5c96;
  position: relative;
  box-shadow:
    0 0 20px rgba(0, 150, 255, 0.3),
    inset 0 0 15px rgba(0, 150, 255, 0.2);
  /* backdrop-filter: blur(10px); */
  color: #c9d5e3;
  z-index: 99; /* 确保查询框在背景之上 */
  cursor: pointer;
  /* 增加呼吸辉光动画 */
  animation: box-glow 2s infinite ease-in-out;
  transition:
    transform 0.25s ease-in-out,
    background-color 0.25s ease-in-out;
}
.query-box:hover,
.query-box:focus-within {
  /* transform: translateY(-7px); */
  background: transparent;
}
@keyframes box-glow {
  0%,
  100% {
    box-shadow:
      0 0 20px rgba(0, 150, 255, 0.3),
      inset 0 0 15px rgba(0, 150, 255, 0.2);
  }
  50% {
    box-shadow:
      0 0 30px rgba(0, 150, 255, 0.5),
      inset 0 0 20px rgba(0, 150, 255, 0.3);
  }
}

.corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid #00aaff6e;
  animation: corner-pulse 2s infinite ease-in-out;
}
.corner.top-left {
  top: -2px;
  left: -2px;
  border-right: none;
  border-bottom: none;
}
.corner.top-right {
  top: -2px;
  right: -2px;
  border-left: none;
  border-bottom: none;
}
.corner.bottom-left {
  bottom: -2px;
  left: -2px;
  border-right: none;
  border-top: none;
}
.corner.bottom-right {
  bottom: -2px;
  right: -2px;
  border-left: none;
  border-top: none;
}
@keyframes corner-pulse {
  50% {
    border-color: #00aaff;
  }
}

.query-content {
  text-align: center;
}
.terminal-status {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #88a1b5;
  text-align: left;
  margin-bottom: 20px;
}
.status-online {
  color: #39ff14;
  font-weight: bold;
}
.blinking-cursor {
  font-weight: bold;
  color: #39ff14;
  animation: blink 1s step-end infinite;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}

/* 搜索框样式 */
.query-title {
  font-family: 'Courier New', monospace;
  font-size: 28px;
  font-weight: bold;
  color: #61dafb;
  margin-bottom: 8px;
}
.query-subtitle {
  font-family: 'Orbitron', sans-serif;
  font-size: 12px;
  letter-spacing: 3px;
  color: #88a1b5;
  margin-bottom: 40px;
  opacity: 0.8;
}
.input-area {
  display: flex;
}
.query-input {
  height: 42px;
}
.query-input :deep(.el-input__wrapper) {
  height: 100%;
  background-color: rgba(10, 25, 47, 0.8) !important;
  box-shadow: 0 0 0 1px #1a5c96 inset !important;
  border-radius: 4px 0 0 4px !important;
  padding: 1px 15px;
  transition: all 0.3s ease;
}
.query-input :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px #61dafb inset,
    0 0 10px #61dafb !important;
}
.query-input :deep(.el-input__inner) {
  color: #e5eaf3;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  letter-spacing: 2px;
}
.query-input :deep(.el-input__inner::placeholder) {
  color: #5a738a;
  letter-spacing: 0;
}

/* 修改按钮样式 */
.query-button {
  height: 42px;
  width: 120px;
  border-radius: 0 4px 4px 0 !important;
  background: transparent !important;
  border: 1px solid #00aaff !important;
  color: #00aaff !important;
  transition: all 0.3s ease !important;
  position: relative;
  overflow: hidden;
}
.button-text {
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 1px;
  font-weight: bold;
}
.query-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0, 170, 255, 0.5), transparent);
  transition: left 0.4s ease;
}
.query-button:hover {
  color: #fff !important;
  background: rgba(0, 170, 255, 0.2) !important;
  box-shadow: 0 0 15px #00aaff !important;
}
.query-button:hover::before {
  left: 100%;
}

.loading-area {
  padding: 11px 0;
}
.loader {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}
.loader span {
  width: 10px;
  height: 10px;
  background-color: #61dafb;
  border-radius: 50%;
  animation: loading-bounce 1.4s infinite ease-in-out both;
}
.loader span:nth-child(1) {
  animation-delay: -0.32s;
}
.loader span:nth-child(2) {
  animation-delay: -0.16s;
}
@keyframes loading-bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}
.loading-text {
  font-family: 'Courier New', monospace;
  color: #61dafb;
  font-size: 14px;
  position: relative;
}
.loading-text::before,
.loading-text::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: transparent;
  /* background: #0d1117; */
  overflow: hidden;
}
.loading-text::before {
  left: 2px;
  text-shadow: -1px 0 rgba(255, 0, 0, 0.7);
  animation: glitch-1 2s linear infinite reverse;
}
.loading-text::after {
  left: -2px;
  text-shadow: 1px 0 rgba(0, 0, 255, 0.7);
  animation: glitch-2 2s linear infinite reverse;
}
@keyframes glitch-1 {
  /* 在动画的大部分时间里，将伪元素完全裁剪掉 (使其不可见) */
  0%,
  12%,
  15%,
  48%,
  50%,
  100% {
    clip-path: inset(50%);
  }
  /* 只在动画的特定瞬间，显示文字的某个切片 */
  13% {
    clip-path: inset(23% 0 49% 0);
  }
  14% {
    clip-path: inset(16% 0 71% 0);
  }
  49% {
    clip-path: inset(28% 0 18% 0);
  }
}
@keyframes glitch-2 {
  0%,
  12%,
  15%,
  48%,
  50%,
  100% {
    clip-path: inset(50%);
  }
  13% {
    clip-path: inset(79% 0 1% 0);
  }
  14% {
    clip-path: inset(2% 0 28% 0);
  }
  49% {
    clip-path: inset(85% 0 10% 0);
  }
}
</style>
