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
    path: "/@:locationInfo?/:floorId(\\d+)?",
    alias: "/:floorId(\\d+)?",
    component: MapPage,
    name: "Map",
    children: [
      {
        path: "/search/@:locationInfo?/:floorId(\\d+)?",
        alias: "search",
        components: { 
          search: Search
        },
        name: "Search",
      },
      {
        path: "/place/@:locationInfo?/:floorId(\\d+)?",
        alias: "place",
        components: { 
          place: Place 
        },
        name: "Place",
      },
      {
        path: "/dir/:fromText([^/]*)?/:toText([^/]*)?/@:locationInfo?/:floorId(\\d+)?",
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
  base: process.env.NODE_ENV === "production" ? "/m/" : "/",
  routes
});

router.beforeEach((to, from, next) => {
  if (to.matched?.[0]?.name !== "Map") {
    next()
    return
  }
  if (to.name === "Search" && !to.query.q) {
    next({ name: "Map" })
  } else {
    if (!from?.name || !from?.matched?.length) {
      if (to.name.match(/Place|Direction/)) {
        store.commit("setFirstRouteName", to.name)
      }
    }

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