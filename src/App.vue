<script setup>
// 引入 Element Plus 全局化配置组件和中文语言包
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

// Element Plus 全局配置
const zIndex = 3000
const size = 'small'
</script>

<template>
  <el-config-provider :locale="zhCn" :size="size" :z-index="zIndex">
    <router-view />
  </el-config-provider>
</template>

<style scoped></style>
