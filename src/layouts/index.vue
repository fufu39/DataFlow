<!-- 主框架界面 -->
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FullScreen } from '@element-plus/icons-vue'

defineOptions({
  name: 'LayoutIndexPage'
})

const route = useRoute()
const router = useRouter()

// 导航栏是否被手动点击固定
const isSidebarPinned = ref(false)
// 鼠标是否悬停在导航栏上
const isSidebarHover = ref(false)
// 决定菜单最终是否为折叠状态
const isMenuCollapsed = computed(() => !isSidebarPinned.value && !isSidebarHover.value)
// 点击侧边栏，切换固定状态
const togglePinSidebar = (event) => {
  // 点击的目标元素或其祖先元素为.el-menu-item，就不切换
  if (event.target.closest('.el-menu-item')) {
    return
  }
  // 只有在侧边栏是展开状态时，点击才有效
  if (!isMenuCollapsed.value) {
    isSidebarPinned.value = !isSidebarPinned.value
  }
}

// 查找出子路由列表用于导航栏
const menuItems = computed(() => {
  const layoutRoute = router.options.routes.find((r) => r.path === '/' && r.children)
  return layoutRoute
    ? layoutRoute.children.filter((child) => child.meta && child.meta.title && !child.meta.hidden)
    : []
})

// 计算当前应该高亮的菜单路径
const activeMenuPath = computed(() => {
  const { meta, path } = route
  // 如果路由元信息中指定了activeMenu，则使用它，否则使用当前路由的 path
  if (meta.activeMenu) {
    return meta.activeMenu
  }
  return path
})

// 处理刷新页面和跳转函数
const handleMenuItemClick = (item) => {
  if (item.meta && item.meta.isRefresh) {
    window.location.reload()
  } else {
    router.replace(item.path)
  }
}

// 控制是否全屏
const isFullscreen = ref(false)

// 更新全屏状态的函数
const updateFullscreenState = () => {
  isFullscreen.value = !!document.fullscreenElement
}
// 处理点击全屏图标的函数
const handleFullscreen = () => {
  if (!document.fullscreenElement) {
    // 进入全屏
    document.documentElement.requestFullscreen()
  } else {
    // 退出全屏
    if (document.exitFullscreen) {
      document.exitFullscreen()
    }
  }
}
// 在组件挂载时添加事件监听
onMounted(() => {
  document.addEventListener('fullscreenchange', updateFullscreenState)
})
// 在组件卸载前移除事件监听
onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', updateFullscreenState)
})
</script>

<template>
  <el-container class="layout-container">
    <!-- 顶部全局页头 -->
    <el-header class="top-header">
      <div class="logo-title-container">
        <img src="/favicon.svg" class="header-logo-svg" alt="Logo" />
        <span class="sidebar-logo-text">数据流转监控平台</span>
        <!-- <el-tag class="version-tag" type="primary" effect="plain" round> v1.0.0 </el-tag> -->
      </div>

      <div class="header-spacer"></div>

      <div
        class="header-action-icon"
        :class="{ 'is-fullscreen': isFullscreen }"
        @click="handleFullscreen"
      >
        <el-icon size="20"><FullScreen /></el-icon>
      </div>
    </el-header>

    <!-- 下方主容器 -->
    <el-container class="bottom-container">
      <!-- 左侧菜单 -->
      <el-aside
        :width="isMenuCollapsed ? '80px' : '280px'"
        :class="{ 'is-collapsed': isMenuCollapsed }"
        @mouseenter="isSidebarHover = true"
        @mouseleave="isSidebarHover = false"
        @click="togglePinSidebar($event)"
      >
        <el-menu
          :default-active="activeMenuPath"
          class="el-menu-vertical-demo"
          background-color="#304156"
          active-text-color="#409EFF"
          :collapse="isMenuCollapsed"
          :collapse-transition="false"
        >
          <el-menu-item
            v-for="item in menuItems"
            :key="item.path"
            :index="item.path"
            @click="handleMenuItemClick(item)"
          >
            <el-icon><component :is="item.meta.icon" /></el-icon>
            <span>{{ item.meta.title }}</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 右侧主内容区容器 -->
      <el-container class="right-content-container">
        <!-- 面包屑 -->
        <el-header class="breadcrumb-header">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item
              v-for="item in route.matched"
              :key="item.path"
              :to="{ path: item.path }"
            >
              <span v-if="item.meta && item.meta.title">{{ item.meta.title }}</span>
            </el-breadcrumb-item>
          </el-breadcrumb>
        </el-header>

        <!-- 路由视图 -->
        <el-main class="layout-main">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </el-container>
</template>

<style scoped>
/* 整体布局容器 */
.layout-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 顶部全局页头样式 */
.top-header {
  display: flex;
  align-items: center;
  background-color: var(--el-bg-color);
  /* border-bottom: 3px solid var(--el-border-color); */
  border-bottom: 3px solid #5b5b5b;
  height: 75px;
  padding: 0 25px;
}
.header-logo-svg {
  width: 32px;
  height: 32px;
  margin-right: 8px;
}
.logo-title-container {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.logo-title-container :deep(.version-tag) {
  margin-left: 10px;
  transform: translateY(3px);
  height: 20px;
  line-height: 18px;
  align-self: center;
}

/* logo文本：呼吸效果 */
/* 主色调：#409eff */
.sidebar-logo-text {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  animation: neon-glow 1.3s ease-in-out infinite alternate; /* 呼吸动画 */
}
@keyframes neon-glow {
  from {
  }
  to {
    text-shadow:
      0 0 10px #40a0ffd9,
      0 0 30px #40a0ffbc,
      0 0 50px #40a0ff9a,
      0 0 90px #40a0ff78;
  }
}
.header-spacer {
  flex-grow: 1;
}
/* 右侧操作图标的容器样式 */
.header-action-icon {
  padding: 8px;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.header-action-icon .el-icon {
  transition: transform 0.3s ease-out;
}
.header-action-icon.is-fullscreen .el-icon {
  transform: rotate(180deg);
}
.header-action-icon:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

/* 下方整体主容器 */
.bottom-container {
  flex: 1;
  overflow: auto;
}

/* 左侧菜单栏 */
.el-aside {
  /* 侧边栏背景色 */
  background-color: #282a2c;
  color: #fff;
  height: 100%;
  transition: all 0.4s ease;
  overflow-x: hidden;
}
.el-aside:not(.is-collapsed) {
  cursor: pointer;
}

.el-menu {
  border-right: none;
  height: 100%;
  width: 100%;
  background-color: transparent;
  padding-top: 20px;
}

/* 菜单项 */
.el-menu-item {
  font-size: 16px;
  color: #ebebeb;
  border-radius: 24px;
  height: 48px;
  margin: 0 10px 10px 10px;
  font-weight: bold;
}
.el-menu-item span {
  margin-left: 10px;
}

/* 菜单项 hover 状态 */
.el-menu-item:hover {
  background-color: #323537;
}

/* 菜单项选中状态 */
.el-menu-item.is-active {
  background-color: #1f3760 !important;
  color: #409eff !important;
}

/* 右侧内容容器 */
.right-content-container {
  display: flex;
  flex-direction: column;
}

/* 面包屑所在的头部 */
.breadcrumb-header {
  display: flex;
  align-items: center;
  background-color: var(--el-bg-color);
  /* border-bottom: 2px solid var(--el-border-color); */
  height: 50px;
  color: #fff;
}

/* 折叠时隐藏文字 */
.el-aside.is-collapsed .el-menu-item span {
  display: none;
}
/* 折叠时调整菜单项布局 */
.el-aside.is-collapsed .el-menu-item {
  justify-content: center;
  padding: 0;
  height: 48px;
  width: 56px; /* 固定图标容器宽度，和侧栏宽度保持内边距 */
  transition: all 0.4s ease;
}

/* 主内容区 */
.layout-main {
  flex: 1;
  padding: 18px 18px 0 18px;
  /* 组件视窗背景色 */
  background-color: #1b1c1d;
  color: #fff;
  overflow-y: hidden;
  overflow-x: hidden;
}
</style>
