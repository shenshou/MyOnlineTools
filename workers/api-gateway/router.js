import { javdbRoutes } from './services/javdb.js'
import { ltxRoutes } from './services/ltx.js'

const routes = [...javdbRoutes, ...ltxRoutes]

export function getRoute(pathname, method) {
  return routes.find(route => route.methods.includes(method) && route.match.test(pathname)) || null
}

export function getRoutes() {
  return routes
}
