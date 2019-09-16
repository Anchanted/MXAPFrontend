<template>
  <div id="app">
    <!-- <div id="nav">
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link>
    </div>
    <router-view /> -->
    <router-view :key="key"></router-view>
    <loading v-if="loading" :style="loadingStyle"></loading>
  </div>
</template>

<script>
import Loading from 'components/Loading'
import { mapState } from 'vuex'

export default {
  components: {
    Loading
  },
  computed: {
    ...mapState(['loading']),
    loadingStyle () {
      return {
        width: document.documentElement.clientWidth + 'px',
        height: document.documentElement.clientHeight + 'px',
        position: 'absolute',
        top: 0,
      }
    },
    key () {
      const buildingId = this.$route.params.buildingId || ''
      const floorId = this.$route.params.floorId || ''
      return `b${buildingId}f${floorId}`
    }
  },
  created () {
    this.$store.commit('setClientHeight', document.documentElement.clientHeight)
    this.$store.commit('setClientWidth', document.documentElement.clientWidth)
    this.$store.dispatch('search/refreshHistoryList')
  },

}
</script>

<style>
@import "assets/css/reset.css";

#app {
  /* font-family: "Lato", Helvetica, Arial, "Microsoft YaHei", "微软雅黑", sans-serif; */
}

/* #app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
#nav {
  padding: 30px;
  a {
    font-weight: bold;
    color: #2c3e50;
    &.router-link-exact-active {
      color: #42b983;
    }
  }
} */
</style>
