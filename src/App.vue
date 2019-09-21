<template>
  <div id="app">
    <router-view :key="key"></router-view>
    <div v-if="loading" style="width: 100vw; padding: 0 3vw; position: absolute; top: 0; background-color: #FFFFFF; z-index=3002" :style="{ height: `${clientHeight}px` }">
      <loading style="width: 100%; height: 100%; background: #FFFFFF;"></loading>
      <error-panel v-if="errorRefresh" style="width: 100%; height: 100%; background: #FFFFFF;"
        @refresh="$router.go(0)"></error-panel>
    </div>
    <!-- <loading v-if="loading" class="loading" :style="loadingStyle"></loading>
    <div v-if="errorRefresh" class="refresh" :style="refreshStyle">
      <span>{{$t('error.refresh.text')}}</span>
      <button @touchend.stop="ontouchend">{{$t('error.refresh.button')}}</button>
    </div> -->
    <div v-show="isLandscape" class="landscape">
      <span class="landscape-img iconfont icon-portrait"></span>
      <span class="landscape-text">{{$t('orientation.landscape')}}</span>
    </div>
  </div>
</template>

<script>
import Loading from 'components/Loading'
import ErrorPanel from 'components/ErrorPanel'
import { mapState } from 'vuex'

export default {
  components: {
    Loading,
    ErrorPanel
  },
  data () {
    return {
      isLandscape: false,
      resizedToPortrait: false,
      move: false
    }
  },
  computed: {
    ...mapState(['loading', 'errorRefresh', 'clientWidth', 'clientHeight']),
    loadingStyle () {
      return {
        width: this.clientWidth + 'px',
        height: this.clientHeight + 'px',
      }
    },
    refreshStyle () {
      return {
        width: this.clientWidth + 'px',
        height: this.clientHeight + 'px',
      }
    },
    key () {
      const buildingId = this.$route.params.buildingId || ''
      const floorId = this.$route.params.floorId || ''
      return `b${buildingId}f${floorId}`
    },
  },
  methods: {
    resize (firstTime) {
      this.isLandscape = document.documentElement.clientWidth > document.documentElement.clientHeight

      if (!this.isLandscape) {
        if (firstTime) this.resizedToPortrait = true 
        else if (!this.resizedToPortrait) this.$router.go(0)
      }
    }
  },
  created () {
    const lang = navigator.language || ''
    if (lang.length >= 2) {
      switch (lang.substring(0, 2)) {
        case 'es':
          this.$i18n.locale = 'es'
          break;
        case 'zh':
          this.$i18n.locale = 'zh'
          break;
        default:
          this.$i18n.locale = 'en'
          break;
      }
    }

    this.$store.commit('setClientHeight', document.documentElement.clientHeight)
    this.$store.commit('setClientWidth', document.documentElement.clientWidth) 
    this.$store.dispatch('search/refreshHistoryList')

    this.resize(true)

    if (!this.isLandscape) this.resizedToPortrait = true

    window.onresize = () => this.resize(false)
  },

}
</script>

<style lang="scss" scoped>
@import "assets/css/reset.css";

.landscape {
  position: fixed;
  top: 0;
  width: 100vw;
  height: 100vh;
  z-index: 4000;
  color: rgb(252, 213, 213);
  background: black;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  span {
    display: block;
  }

  &-img {
    font-size: 10vw;
  }

  &-text {
    font-size: 2vw;
    padding-bottom: 5vw;
  }
}

.loading {
  position: absolute;
  top: 0;
}

.refresh {
  position: absolute;
  top: 0;
  z-index: 3002;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 5vw;

  span {
    display: block;
  }

  button {
    position: relative;
    margin: 2vw 0 0;
    padding: 1vw;
    border: none;
    border-radius: 2vw;
    outline: none; 
  }
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
