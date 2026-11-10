import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ToolView from '../views/ToolView.vue'

export default createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/tool/:id', name: 'tool', component: ToolView, props: true },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})