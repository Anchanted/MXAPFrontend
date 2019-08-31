import Vue from "vue"
import Router from "vue-router"
import store from "../store"

import CampusMap from 'views/CampusMap'
import BuildingMap from 'views/BuildingMap'

Vue.use(Router);

const router = new Router({
  mode: "history",
  base: process.env.BASE_URL,
  routes: [
    { 
      path: '/', 
      component: CampusMap, 
      name: 'Campus' 
    },
    { 
      path: '/building', 
      component: BuildingMap, 
      name: 'Building',
      // meta: {
      //   keepAlive: true 
      // }
    },
  ]
});

router.beforeEach((to, from, next) => {
  store.dispatch('displayLoading')
  next()
})

export default router