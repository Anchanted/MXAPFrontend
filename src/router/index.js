import Vue from "vue"
import Router from "vue-router"
import store from "../store"

import PageNotFound from 'views/404'
import CanvasMap from 'views/CanvasMap'
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
      name: 'PageNotFound'
    },
    {
      path: '/:buildingId(\\d+)?/:floorId(\\d+)?',
      component: CanvasMap,
      name: 'Map',
      children: [
        {
          path: 'search/:type([a-z]+)?',
          components: {
            search: SearchTop
          },
          name: 'Search',
        },
        {
          path: 'place/:type([a-z]+)/:id(\\d+)',
          components: {
            place: Place
          },
          name: 'Place',
        }
      ],
    },
  ]
});

// router.beforeEach((to, from, next) => {
//   store.dispatch('displayLoading')
//   next()
// })

router.beforeEach((to, from, next) => {
  if (to.params.buildingId && !to.params.floorId) next({ name: 'PageNotFound' })
  else next()
})

export default router