<template>
  <div id="app">
    <router-view></router-view>
    <div v-show="isLandscape" class="landscape">
      <span class="landscape-img iconfont icon-portrait"></span>
      <span class="landscape-text">{{$t('orientation.landscape')}}</span>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { Settings } from 'luxon'
import { ImagePreview } from 'vant'

export default {
  data() {
    return {
      isLandscape: false,
      resizedToPortrait: false,
      move: false,
      imagePreviewInstance: null,
      lastWindowWidth: null,
      lastWindowHeight: null
    }
  },
  computed: {
    ...mapState(['clientWidth', 'clientHeight', 'imageUrlListEvent'])
  },
  methods: {
    resize(firstTime) {
      if (this.lastWindowWidth === document.documentElement.clientWidth && this.lastWindowHeight !== document.documentElement.clientHeight) return
      this.isLandscape = document.documentElement.clientWidth > document.documentElement.clientHeight
      this.lastWindowWidth = document.documentElement.clientWidth
      this.lastWindowHeight = document.documentElement.clientHeight
      if (!this.isLandscape) {
        if (firstTime) this.resizedToPortrait = true 
        else if (!this.resizedToPortrait) this.$router.go(0)
      }
    },

    viewImage(imgUrlArr) {
      if (!imgUrlArr?.length) return
      const _this = this
      this.imagePreviewInstance = ImagePreview({
        images: imgUrlArr,
        showIndex: false,
        onClose: function () {
          _this.imagePreviewInstance = null
        }
      })
    }
  },
  beforeCreate() {
    const link = document.createElement("link")
    link.type = "text/css"
    link.rel = "stylesheet"
    link.href = process.env.VUE_APP_ICONFONT_URL
    document.head.appendChild(link)
  },
  created() {
    this.$store.commit('setClientHeight', document.documentElement.clientHeight)
    this.$store.commit('setClientWidth', document.documentElement.clientWidth)
    this.$store.commit("setPanelPosArray", [0, -Math.floor(this.clientHeight * 0.4 - this.clientWidth * 0.2), -Math.floor(this.clientHeight * 0.9 - this.clientWidth * 0.2)])

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

    this.$store.dispatch('search/refreshHistoryList', this.unifySearchItem)

    this.resize(true)

    if (!this.isLandscape) this.resizedToPortrait = true

    window.onresize = () => this.resize(false)
  },
  watch: {
    "$i18n.locale": {
      immediate: true,
      handler: function (val) {
        document.title = this.$t("title", val)
      }
    },
    "imageUrlListEvent.flag"() {
      this.viewImage(this.imageUrlListEvent.data)
    },
    isLandscape: {
      immediate: true,
      handler: function (val) {
        if (this.imagePreviewInstance == null) return
        if (val) {
          this.imagePreviewInstance.close()
        }
      }
    }
  }
}
</script>

<style lang="scss">
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
</style>
