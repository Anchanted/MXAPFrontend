<template>
  <div id="app">
    <router-view :key="key"></router-view>
    <div v-if="loading" class="loading-panel" :style="{ height: `${clientHeight}px` }">
      <loading style="background: #FFFFFF;"></loading>
      <error-panel v-if="errorRefresh" style="width: 94vw; background: #FFFFFF;"
        @refresh="$router.go(0)"></error-panel>
    </div>
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
import { Settings } from 'luxon'

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
    let lang = localStorage.getItem('language')
    if (!lang) {
      lang = navigator.language || ''
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
    } else this.$i18n.locale = lang

    Settings.defaultLocale = this.$i18n.locale

    localStorage.setItem('language', this.$i18n.locale)

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
  z-index: 400;
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

.loading-panel {
  width: 100vw; 
  padding: 0 3vw; 
  position: absolute; 
  top: 0; 
  background-color: #FFFFFF; 
  z-index: 302;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading {
  position: absolute;
  top: 0;
}

.refresh {
  position: absolute;
  top: 0;
  z-index: 302;
  background: #ffffff;
}

</style>
