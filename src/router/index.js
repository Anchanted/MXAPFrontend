import Vue from "vue"
import Router from "vue-router"
import CampusMap from 'views/CampusMap'
import BuildingMap from 'views/BuildingMap'

Vue.use(Router);

export default new Router({
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
