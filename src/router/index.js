import { createRouter, createWebHistory } from 'vue-router'
// 导入主布局组件
import Layout from '@/layouts/index.vue'
// 导入图标
import { HomeFilled, Histogram, UserFilled, StarFilled, Flag, List } from '@element-plus/icons-vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 默认重定向到home
    {
      path: '/',
      redirect: '/home'
    },
    {
      path: '/',
      component: Layout,
      children: [
        // 首页
        {
          path: '/home',
          name: 'Home',
          component: () => import('@/views/Home/index.vue'),
          meta: {
            title: '首页',
            icon: HomeFilled
          }
        },
        // 数据流转链路
        {
          path: '/data',
          name: 'DataChain',
          component: () => import('@/views/DataChain/index.vue'),
          meta: {
            title: '数据流转链路',
            icon: Histogram
          }
        },
        {
          path: '/data/detail',
          name: 'DataDetail',
          component: () => import('@/views/DataDetail/index.vue'),
          meta: {
            title: '数据溯源链条详情',
            activeMenu: '/data',
            hidden: true // 自定义标志
          }
        },
        // 业务流转链路
        {
          path: '/work',
          name: 'WorkChain',
          component: () => import('@/views/WorkChain/index.vue'),
          meta: {
            title: '业务流转链路',
            icon: List
          }
        },
        {
          path: '/work/detail',
          name: 'WorkDetail',
          component: () => import('@/views/WorkDetail/index.vue'),
          meta: {
            title: '业务溯源链条详情',
            activeMenu: '/work',
            hidden: true // 自定义标志
          }
        },
        // 用户数据查询
        {
          path: '/query',
          name: 'UserQuery',
          component: () => import('@/views/UserQuery/index.vue'),
          meta: {
            title: '用户数据查询',
            icon: UserFilled
          }
        },
        {
          path: '/query/user',
          name: 'UserDetail',
          component: () => import('@/views/UserDetail/index.vue'),
          meta: {
            title: '用户数据详情',
            icon: UserFilled,
            hidden: true // 自定义标志
          }
        },
        // 标识生成可视化
        {
          path: '/visual',
          name: 'Visual',
          component: () => import('@/views/Visual/index.vue'),
          meta: {
            title: '标识生成可视化',
            icon: Flag
          }
        },
        // 数据流动演示
        {
          path: '/show',
          name: 'Show',
          component: () => import('@/views/Show/index.vue'),
          meta: {
            title: '数据流动演示',
            icon: StarFilled
          }
        }
        // {
        //   path: '/refresh',
        //   name: 'Refresh',
        //   // component不会被加载，可以不写或写一个空组件
        //   component: () => {},
        //   meta: {
        //     title: '刷新页面',
        //     icon: BrushFilled,
        //     // 自定义标志
        //     isRefresh: true
        //   }
        // }
      ]
    },
    // 404路由
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/views/NotFound/index.vue')
    }
  ]
})

export default router
