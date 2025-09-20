<!-- 404界面 -->
<script setup>
defineOptions({
  name: 'NotFoundPage'
})
import { useRouter } from 'vue-router'

// 获取路由实例
const router = useRouter()

// 定义返回首页的方法
const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="not-found-container">
    <el-empty :image-size="250">
      <template #default>
        <div class="custom-content">
          <h1 class="title-404">404</h1>
          <p class="subtitle">抱歉，您访问的页面不存在</p>
          <el-button type="primary" size="large" @click="goHome" plain> 返回首页 </el-button>
        </div>
      </template>

      <template #description></template>
    </el-empty>
  </div>
</template>

<style scoped>
.not-found-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
}

.custom-content {
  text-align: center;
  margin-top: -40px;
}

/* 404大标题样式 */
.title-404 {
  font-size: 5rem;
  font-weight: bold;
  color: var(--el-text-color-primary);
  margin: 0;
}
/* 副标题样式 */
.subtitle {
  font-size: 1.1rem;
  color: var(--el-text-color-secondary);
  margin: 10px 0 20px;
}
</style>
