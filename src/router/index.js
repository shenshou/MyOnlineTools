import { createRouter, createWebHashHistory } from 'vue-router'

const HomeView = () => import('../views/HomeView.vue')
const ToolView = () => import('../views/ToolView.vue')
const NavigationView = () => import('../views/NavigationView.vue')
const JavDbReviewsView = () => import('../views/JavDbReviewsView.vue')
const LtxTestView = () => import('../views/LtxTestView.vue')

export default createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/navigation', name: 'navigation', component: NavigationView },
    { path: '/javdb-reviews', name: 'javdb-reviews', component: JavDbReviewsView },
    { path: '/ltx-test', name: 'ltx-test', component: LtxTestView },
    { path: '/tool/:id', name: 'tool', component: ToolView, props: true },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
