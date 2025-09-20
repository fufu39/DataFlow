<!-- 数据流转链路界面 -->
<script setup>
import { ref, computed } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue' // 导入图标
import { useRouter } from 'vue-router'

defineOptions({
  name: 'DataPage'
})

const router = useRouter()

// --- 表格数据和分页逻辑 ---
// 模拟表格数据
const tableDataRaw = ref([])
const dataTypes = [
  '客户数据',
  '订单数据',
  '产品数据',
  '日志数据',
  '营销数据',
  '行为数据',
  '反馈数据',
  '交易数据',
  '位置数据',
  '通信数据'
]
const sensitivityLevels = ['一般', '重要', '核心']
const idPrefixes = ['C', 'T', 'M', 'U', 'F', 'R', 'X', 'B', 'Z']
for (let i = 1; i <= 120; i++) {
  tableDataRaw.value.push({
    dataId: `${idPrefixes[Math.floor(Math.random() * idPrefixes.length)]}${Math.floor(Math.random() * 8000) + 1000}`,
    dataLength: Math.floor(Math.random() * 10000) + 1000,
    dataType: dataTypes[Math.floor(Math.random() * dataTypes.length)],
    sensitivityLevel: sensitivityLevels[Math.floor(Math.random() * sensitivityLevels.length)],
    creationTime: new Date(Date.now() - Math.random() * 10000000000)
      .toLocaleString('sv-SE', { hour12: false })
      .replace('T', ' ')
  })
}

// 分页状态（默认第一个、页面展示10条）
const currentPage = ref(1)
const pageSize = ref(10)

// 计算过滤后的数据，进行搜索
const filteredData = computed(() => {
  // 如果所有筛选条件都为空，则直接返回所有数据
  if (!activeSearchTerm.value && !activeSensitivityLevel.value && !activeCirculationTime.value) {
    return tableDataRaw.value
  }
  // 根据有值的筛选条件进行过滤
  return tableDataRaw.value.filter((item) => {
    // 检查数据ID是否匹配
    const matchDataId =
      !activeSearchTerm.value ||
      item.dataId.toLowerCase().includes(activeSearchTerm.value.toLowerCase())
    // 检查数据敏感等级是否匹配
    const matchSensitivityLevel =
      !activeSensitivityLevel.value || item.sensitivityLevel === activeSensitivityLevel.value
    // 检查流转时间是否在选定当天
    const matchCirculationTime =
      !activeCirculationTime.value ||
      new Date(item.creationTime).toDateString() ===
        new Date(activeCirculationTime.value).toDateString()
    // 所有条件都必须满足
    return matchDataId && matchSensitivityLevel && matchCirculationTime
  })
})

// 用于分页的计算属性
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredData.value.slice(start, end)
})

// --- 表格操作方法 ---
// 搜索参数
const searchDataId = ref('') // 绑定输入框的值
const activeSearchTerm = ref('') // 实际用于过滤的值
const searchSensitivityLevel = ref('') // 绑定数据敏感等级的值
const activeSensitivityLevel = ref('') // 实际用于过滤的敏感等级
const searchCirculationTime = ref(null) // 绑定单个日期的值
const activeCirculationTime = ref(null) // 实际用于过滤的日期值
// 搜索
const handleSearch = () => {
  activeSearchTerm.value = searchDataId.value.trim()
  activeSensitivityLevel.value = searchSensitivityLevel.value
  activeCirculationTime.value = searchCirculationTime.value || null
  currentPage.value = 1
}
// 重置
const handleReset = () => {
  searchDataId.value = ''
  searchSensitivityLevel.value = ''
  searchCirculationTime.value = null
  activeSearchTerm.value = ''
  activeSensitivityLevel.value = ''
  activeCirculationTime.value = null
  currentPage.value = 1
}

// 根据敏感等级返回不同的tag类型
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

// 查看溯源链条按钮跳转
const handleExpandClick = (row) => {
  //传递参数
  router.push({
    name: 'DataDetail',
    query: {
      dataId: row.dataId,
      dataLength: row.dataLength,
      dataType: row.dataType,
      sensitivityLevel: row.sensitivityLevel,
      creationTime: row.creationTime
    }
  })
}
</script>

<template>
  <div class="page-container">
    <el-card>
      <!-- 顶部标题和搜索区域 -->
      <template #header>
        <div class="card-header">
          <!-- 标题 -->
          <span class="card-header-title">数据流转链路查询</span>
          <!-- 搜索区域 -->
          <div class="search-area">
            <el-input
              v-model="searchDataId"
              placeholder="数据ID"
              clearable
              @keyup.enter="handleSearch"
              class="search-input"
              size="default"
            />
            <el-select
              v-model="searchSensitivityLevel"
              placeholder="数据敏感等级"
              clearable
              class="search-input"
              size="default"
            >
              <el-option
                v-for="item in sensitivityLevels"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
            <el-date-picker
              v-model="searchCirculationTime"
              type="date"
              placeholder="产生时间"
              class="search-input"
              size="default"
            />
            <el-button size="default" :icon="Search" type="primary" @click="handleSearch">
              搜索
            </el-button>
            <el-button size="default" :icon="Refresh" @click="handleReset"> 重置 </el-button>
          </div>
        </div>
      </template>

      <!-- 表格组件 -->
      <el-table :data="paginatedData" style="width: 100%" height="calc(100vh - 300px)">
        <el-table-column prop="dataId" label="数据ID" align="center" />
        <el-table-column prop="dataLength" label="源数据长度" align="center" sortable />
        <el-table-column prop="dataType" label="数据类型" align="center" />
        <el-table-column prop="sensitivityLevel" label="数据敏感等级" align="center">
          <template #default="{ row }">
            <el-tag
              :type="getTagType(row.sensitivityLevel)"
              size="default"
              effect="plain"
              round
              style="cursor: pointer; font-size: 13px; padding: 13px 13px"
            >
              {{ row.sensitivityLevel }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creationTime" label="产生时间" align="center" sortable />
        <el-table-column fixed="right" label="操作" width="200" align="center">
          <template #default="{ row }">
            <el-button type="primary" plain size="default" @click="handleExpandClick(row)">
              查看溯源链条
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, prev, pager, next, sizes"
          :total="filteredData.length"
          size="default"
        />
      </div>
    </el-card>

    <!-- 路由视图 -->
    <router-view />
  </div>
</template>

<style scoped>
/* 卡片头部样式 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* color: #fff; */
}
/* 设置标题文字大小 */
.card-header-title {
  font-size: 18px;
  font-weight: bold;
}

/* 搜索区域样式 */
.search-area {
  display: flex;
  align-items: center;
  gap: 20px;
  font-weight: normal;
}
/* 设置input框长度 */
.search-input {
  width: 160px;
}
/* 设置日期选择器长度 */
.page-container :deep(.search-area .el-date-editor) {
  width: 160px !important;
}
/* 设置按钮边距 */
.search-area :deep(.el-button + .el-button) {
  margin-left: 0;
}

/* 分页样式 */
.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 5px;
}

/* --- 黑暗主题样式保持不变 --- */
/* card组件整体样式 */
.page-container :deep(.el-card) {
  border: none;
  background-color: #1b1c1d;
}

/* card组件header部分 */
.page-container :deep(.el-card__header) {
  padding: 15px 20px;
}
/* card组件body部分 */
.page-container :deep(.el-card__body) {
  padding: 20px 20px 10px;
}
/* card组件阴影 */
.page-container :deep(.el-card.is-always-shadow) {
  box-shadow: 0 0 15px 3px rgba(138, 138, 138, 0.3);
}

.page-container :deep(.search-area .el-input__wrapper),
.page-container :deep(.search-area .el-range-input),
.page-container :deep(.search-area .el-select__wrapper) {
  background-color: #282a2c;
  box-shadow: none;
  border: 1px solid #3a3d40;
}

/* 表格 */
.page-container :deep(.el-table) {
  background-color: transparent;
}
/* 表头 */
.page-container :deep(.el-table th.el-table__cell) {
  background-color: transparent;
  /* color: #a0aec0; */
  color: #4e9ce9;
  font-weight: 700;
  font-size: 16px;
  border-bottom: 1px solid #3a3d40;
  text-transform: uppercase;
  padding: 0 0 16px 0;
}
/* 表格行 */
.page-container :deep(.el-table tr) {
  background-color: transparent;
  /* color: #dcdfe6; */
  color: #fff;
  transition: background-color 0.2s ease;
}
/* 表格行悬停效果 */
.page-container :deep(.el-table tr:hover > td.el-table__cell) {
  background-color: #2c2f32;
}
/* 表格单元格 */
.page-container :deep(.el-table td.el-table__cell) {
  padding: 12px 0;
  font-size: 14px;
  border-bottom: 1px solid #2d3748;
}
/* 表格单元格内容 */
.page-container :deep(.el-table .cell) {
  white-space: nowrap; /* 强制不换行 */
}
/* 固定到右侧的表头和单元格 */
/* .page-container :deep(th.el-table-fixed-column--right),
.page-container :deep(td.el-table-fixed-column--right) {
  background-color: #1b1c1d !important;
} */

.page-container :deep(.el-table__inner-wrapper::before) {
  display: none;
}

/* 分页器 */
.page-container :deep(.el-pagination) {
  --el-pagination-text-color: #a0aec0;
  --el-pagination-button-disabled-bg-color: transparent;
  --el-pagination-button-bg-color: transparent;
  color: #fff;
}
.page-container :deep(.el-pager li) {
  background-color: transparent;
}
.page-container :deep(.el-pager li.is-active) {
  color: var(--el-color-primary);
  font-weight: bold;
}
</style>
