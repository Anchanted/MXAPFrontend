import Vue from "vue"
import Router from "vue-router"
import store from "store"

import PageNotFound from 'views/404'
import MapPage from 'views/MapPage'
import SearchTop from 'views/Search/SearchTop'
import Place from 'views/Place'

Vue.use(Router);

const router = new Router({
  mode: "history",
  base: process.env.BASE_URL,
  routes: [
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
          components: { search: SearchTop },
          name: "Search",
        },
        {
          path: "/:buildingId(\\d+)?/:floorId(\\d+)?/place/:type(building|room|facility)/:id(\\d+)/@:locationInfo?",
          alias: "place/:type(building|room|facility)/:id(\\d+)",
          components: { place: Place },
          name: "Place",
        },
        // {
        //   path: "dir/:fromPlace([^/]*)?/:toPlace([^/]*)?",
        //   components: { direction: Direction },
        //   name: "Direction",
        // }
      ],
    },
  ]
});

router.beforeEach((to, from, next) => {
  if (to.params.buildingId && !to.params.floorId) next({ name: 'PageNotFound' })
  else next()
})

export default router