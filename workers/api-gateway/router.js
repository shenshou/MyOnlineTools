import { ltxRoutes } from './services/ltx.js'

const routes = [...ltxRoutes]

export function getRoute(pathname, method) {
  return routes.find(route => route.methods.includes(method) && route.match.test(pathname)) || null
}

export function getRoutes() {
  return routes
}
