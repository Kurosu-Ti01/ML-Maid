import { createRouter, createWebHashHistory } from 'vue-router'
import MainView from '@/views/MainView.vue'
import EditView from '@/views/EditView.vue'
import AddView from '@/views/AddView.vue'

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
  },
  {
    path: '/add',
    name: 'Add',
    component: AddView
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
