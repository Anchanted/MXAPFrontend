import Vue from "vue"
import Router from "vue-router"
import store from "store"

import PageNotFound from 'views/404'
import MapPage from 'views/MapPage'
import Search from 'views/Search'
import Place from 'views/Place'
import Direction from 'views/Direction'

Vue.use(Router);

const routes = [
  {
    path: "*",
    component: PageNotFound,
    name: "PageNotFound"
  },
  {
    path: "/:buildingId(\\d+)?/:floorId(\\d+)?/@:locationInfo?",
    alias: "/:buildingId(\\d+)?/:floorId(\\d+)?",
    component: MapPage,
    name: "Map",
    children: [
      {
        path: "/:buildingId(\\d+)?/:floorId(\\d+)?/search/@:locationInfo?",
        alias: "search",
        components: { 
          search: Search
        },
        name: "Search",
      },
      {
        path: "/:buildingId(\\d+)?/:floorId(\\d+)?/place/@:locationInfo?",
        alias: "place",
        components: { 
          place: Place 
        },
        name: "Place",
      },
      {
        path: "/:buildingId(\\d+)?/:floorId(\\d+)?/dir/:fromText([^/]*)?/:toText([^/]*)?/@:locationInfo?",
        alias: "dir/:fromText([^/]*)?/:toText([^/]*)?",
        components: { 
          direction: Direction 
        },
        name: "Direction",
      }
    ],
  },
]

const router = new Router({
  mode: "history",
  // base: process.env.BASE_URL,
  base: process.env.NODE_ENV === "production" ? "/m/" : "/",
  routes
});

router.beforeEach((to, from, next) => {
  if (!to.params.buildingId !== !to.params.floorId) next({ name: 'PageNotFound' })
  else if (to.name === "Search" && !to.query.q) next({ name: 'PageNotFound' })
  else if (to.name === "Direction" && (to.params.buildingId || to.params.floorId)) next({ name: "Map", params: to.params })
  else {
    if (to.name === "Place") { // router enter and update
      store.commit('place/setCollapse', false)
    } else if (to.name === "Direction") {
      store.commit("direction/setCollapse", false)
    }
  
    if (to.name !== from.name) { // router leave
      if (from.name === "Place") {
        store.commit("place/setRouterLeave", true)
        store.commit('place/setCollapse', true)
      } else if (from.name === "Direction") {
        store.commit("direction/setRouterLeave", true)
        store.commit("direction/setCollapse", true)
      }
    }

    next()
  }
})

export default router