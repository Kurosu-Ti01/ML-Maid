import { createRouter, createWebHashHistory } from 'vue-router'
import MainView from '@/views/MainView.vue'
import EditView from '@/views/EditView.vue'

const routes = [
  {
    path: '/',
    name: 'Main',
    component: MainView
  },
  {
    path: '/edit',
    name: 'Edit',
    component: EditView
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
