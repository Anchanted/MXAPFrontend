import Vue from "vue"
import Router from "vue-router"
import store from "store"

import PageNotFound from 'views/404'
import MapPage from 'views/MapPage'
import SearchTop from 'views/Search/SearchTop'
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
        path: "/:buildingId(\\d+)?/:floorId(\\d+)?/search/:type(building|room|facility)?/@:locationInfo?",
        alias: "search/:type(building|room|facility)?",
        components: { 
          search: SearchTop 
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
  base: process.env.BASE_URL,
  routes
});

router.beforeEach((to, from, next) => {
  if (to.params.buildingId && !to.params.floorId) next({ name: 'PageNotFound' })
  else if (to.name === "Direction" && (to.params.buildingId || to.params.floorId)) next({ name: "Map", params: to.params })
  else next()
})

export default router