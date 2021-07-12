<template>
  <div class="place-panel-container">
    <div v-show="posY < posArray[1]" class="shade" :style="shadeStyle"
      @touchstart.stop="moveInShade = false"
      @touchmove.stop="moveInShade = true"
      @touchend.stop="ontouchendshade"></div>

    <transition name="place-panel" @after-enter="onafterenter" @after-leave="onafterleave">
      <div v-show="!collapse" class="panel" :style="panelStyle" 
        @touchstart="ontouchstart"
        @touchmove="ontouchmove"
        @touchend="ontouchend">

        <div class="panel-scroll"></div>
        <div class="iconfont icon-close panel-close" @touchend="ontouchendclose"></div>
        <div class="panel-header" :style="{background: headerBackground, opacity: displayHeader ? 1 : 0}">
          <div class="panel-header-name">{{headerName}}</div>
        </div>

        <div class="panel-body" :style="panelBodyStyle" ref="panelBody" 
          @touchstart="ontouchstartpanelbody"
          @touchmove="ontouchmovepanelbody"
          @touchend="ontouchendpanelbody"
          @scroll="onscrollpanelbody">

          <router-view name="place" :key="key" :style="bodyScrollToBottomStyle" ref="placeRouter" @scrollpanel="scrollPanelTo" @viewmap="onviewmap"></router-view>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  data() {
    return {
      startClientY: 0,
      posY: 0,
      lastPosY: 0,
      bounce: false,
      move: false,
      bodyLastClientY: 0,
      lastSwipeable: false,
      swipeable: false,
      moveInShade: false,
      scrollable: false,
      scrollTop: 0
    }
  },
  computed: {
    ...mapState({
      posArray: state => state.panelPosArray,
      headerName: state => state.place.headerName,
      collapse: state => state.place.collapse,
      bodyHeight: state => state.place.bodyHeight,
      routerLeave: state => state.place.routerLeave
    }),
    key() {
      const fullPath = this.$route.fullPath || ""
      return decodeURIComponent(fullPath.split(this.urlLocationReg).join("")).replace(/(id=\d+),f\d+/i, (match, p1) => p1)
    },
    shadeStyle() {
      const pos = this.posY - this.posArray[1]
      return {
        opacity: 1 / ((this.posArray[2] - this.posArray[1]) * 3) * (pos <= 0 ? pos : 0)
      }
    },
    panelStyle() {
      return {
        top: `calc(${this.clientHeight}px - 20vw)`,
        transition: this.bounce ? 'transform .5s' : '',
        transform: `translateY(${this.posY}px)`
      }
    },
    panelBodyStyle() {
      return {
        height: `calc(${this.clientHeight * 0.9}px - 2vw - 1vw - 2vw)`, 
        overflow: this.posY === this.posArray[2] ? 'auto' : 'hidden'
        // overflow: 'auto'
      }
    },
    displayHeader() {
      const flag = this.scrollable && this.scrollTop > 0 
      this.$store.commit('place/setDisplayHeader', flag)
      return flag
    },
    bodyOverflow() {
      return this.bodyHeight > this.$refs.panelBody.offsetHeight
    },
    bodyScrollToBottomStyle() {
      if (this.bounce && this.posY === this.posArray[0] && this.scrollTop !== 0) {
        const posY = this.scrollTop
        this.scrollTop = 0
        return {
          transform: `translateY(${posY}px)`,
          transition: 'all .5s'
        }
      } else {
        return null
      }
    },
    headerBackground() {
      let opacity = (this.scrollTop) / (this.clientHeight / 10)
      if (opacity > 1) opacity = 1
      else if (opacity < 0) opacity = 0
      return `rgba(248,247,242,${opacity})`
    }
  },
  methods: {
    ontouchstart(e) {
      // console.log('panel touchstart')
      if (this.bounce && this.posY >= this.posArray[0]) this.$refs.panelBody.scrollTo(0, 0)
      this.bounce = false
      this.lastPosY = this.posY
      this.move = false
      this.startClientY = e.targetTouches[0].clientY
    },
    ontouchmove(e) {
      // console.log('panel touchmove')
      this.bounce = false
      this.move = true

      let posY = e.targetTouches[0].clientY - this.startClientY + this.lastPosY
      if (posY > this.posArray[0]) {
        posY = this.posArray[0]
      } else if (posY < this.posArray[2]) {
        const y = this.posArray[2] - posY
        posY = this.posArray[2] - Math.sqrt(y)
      }
      this.posY = posY
    },
    ontouchend(e) {
      // console.log('panel touchend')
      this.bounce = false
      let posY = this.posY
      if (this.posY > this.posArray[0]) {
        this.bounce = true
        posY = this.posArray[0]
      } else if (this.posY < this.posArray[2]) {
        this.bounce = true
        posY = this.posArray[2]
      }

      if (!this.move) { // tap
        if (posY === this.posArray[0]) {
          this.scrollPanelTo("m")
          return
        } else if (posY === this.posArray[1]) {
          this.scrollPanelTo("t")
          return
        }
      } else { // slide
        const deltaY = posY - this.lastPosY
        if (deltaY !== 0) {
          this.bounce = true
          const fallbackHeight = this.clientHeight * 0.1
          if (deltaY > 0) { // down
            if (posY <= this.posArray[2] + fallbackHeight) {
              posY = this.posArray[2]
            } else if (posY <= this.posArray[1] + fallbackHeight) {
              posY = this.posArray[1]
            } else {
              posY = this.posArray[0]
            }
          } else { // up
            if (posY >= this.posArray[0] - fallbackHeight) {
              posY = this.posArray[0]
            } else if (posY >= this.posArray[1] - fallbackHeight) {
              posY = this.posArray[1]
            } else {
              posY = this.posArray[2]
            }
          }
        }
      }
      this.posY = posY
      this.lastPosY = this.posY
    },

    ontouchstartpanelbody(e) {
      // console.log('panelbody touchstart')
      this.scrollable = this.posY <= this.posArray[2] && this.bodyOverflow
      this.bodyLastClientY = e.targetTouches[0].clientY
    },
    ontouchmovepanelbody(e) {
      // console.log('panelbody touchmove')
      this.move = true
      this.scrollable = this.posY <= this.posArray[2] && this.bodyOverflow
      if (!this.scrollable) return false
      const deltaY = e.targetTouches[0].clientY - this.bodyLastClientY
      this.bodyLastClientY = e.targetTouches[0].clientY
      this.swipeable = !this.bodyOverflow || (deltaY > 0 && this.scrollTop <= 0 && this.posY < this.posArray[0])
      if (!this.swipeable) this.stopBubble(e) 
      else if (this.lastSwipeable === false) this.startClientY = e.targetTouches[0].clientY
      this.lastSwipeable = this.swipeable
    },
    ontouchendpanelbody(e) {
      // console.log('panelbody touchend')
      this.scrollable = this.posY <= this.posArray[2] && this.bodyOverflow
    },
    onscrollpanelbody(e) {
      this.scrollTop = this.$refs.panelBody.scrollTop
    },

    ontouchendshade(e) {
      if (!this.moveInShade) this.scrollPanelTo("m")
    },

    ontouchendclose(e) {
      // console.log('ontouchend')
      if (!this.move) {
        this.$router.push({
          name: "Map",
          params: {
            locationInfo: this.$route.params.locationInfo,
            floorId: this.$route.params.floorId
          }
        })
        this.stopBubble(e)
      }
    },

    onafterenter(el) {
      el.style.transform = `translateY(${this.posArray[1] || -Math.floor(this.clientHeight * 0.4 - this.clientWidth * 0.2)}px)`
    },
    onafterleave() {
      this.$store.commit("place/setRouterLeave", false)
    },

    scrollPanelTo(posY) {
      if (typeof posY === "string") {
        switch (posY) {
          case "t": 
            posY = this.posArray[2]
            break;
          case "m": 
            posY = this.posArray[1]
            break;
          case "b": 
            posY = this.posArray[0]
            break;
          default:
            posY = 0
            break;
        }
      }
      this.bounce = true
      this.posY = posY
      this.lastPosY = this.posY
    },

    onviewmap() {
      if (this.posY <= this.posArray[1]) this.scrollPanelTo("m")
      else this.scrollPanelTo("b")
    }
  },
  created() {
    this.$EventBus.$on("scrollPlacePanel", this.scrollPanelTo)
  },
  watch: {
    posY: {
      immediate: true,
      handler: function (val) {
        this.$store.commit("place/setPosY", val)
      }
    },
    collapse: {
      immediate: true,
      handler: function (val) {
        this.bounce = true
        if (val) this.posY = 0
        else this.scrollPanelTo("m")
      }
    },
    routerLeave(val) {
      if (val) {
        if (this.$refs.placeRouter?.$el) {
          const placeRouterEl = this.$refs.placeRouter?.$el
          const clonedNode = placeRouterEl.cloneNode(true)
          clonedNode.classList.add("animation-cache")
          if (this.$refs.panelBody) {
            this.$refs.panelBody.appendChild(clonedNode)
          }
        }
      } else {
        if (this.$refs.panelBody) {
          document.querySelectorAll(".animation-cache").forEach(node => node.parentNode.removeChild(node))
        }
      }
    }
  }
}
</script>

<style lang="scss">
.place-panel-container {
  height: auto; 
  width: 100vw; 
  position: relative; 
  z-index: 5;

  .shade {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: 100vw;
    height: 100vh;
    background: #000000;
    z-index: -1;
  }
  
  .panel {
    overflow: hidden;
    position: fixed;
    width: 100vw;
    height: 100vh;
    background: #F8F8F8;
    z-index: 1;
    border-top-left-radius: 5vw;
    border-top-right-radius: 5vw;
    display: flex;
    flex-direction: column;
    align-items: center;
    -webkit-box-shadow: 0px 0px 10px 1px rgba(0,0,0,0.52);
    -moz-box-shadow: 0px 0px 10px 1px rgba(0,0,0,0.52);
    box-shadow: 0px 0px 10px 1px rgba(0,0,0,0.52);

    &-scroll {
      margin: 2vw 0;
      background-color: #8E8E93;
      width: 10vw;
      height: 1vw;
      border-radius: 0.5vw;
    }

    &-close {
      position: absolute;
      right: 3vw;
      top: 5vw;
      background: #E6E3DF;
      color: #888888;
      font-size: 3vw;
      height: 5vw;
      width: 5vw;
      line-height: 5vw;
      text-align: center;
      vertical-align: middle;
      border-radius: 2.5vw;
      flex-shrink: 0;
      z-index: 3;
    }

    &-header {
      position: absolute;
      top: 0;
      width: 100vw;
      height: auto;
      border-top-left-radius: 5vw;
      border-top-right-radius: 5vw;
      z-index: 2;
      background-color: transparent;
      padding: 5vw 3vw 4vw;
      margin: 0;
      border: none;

      -webkit-box-shadow: 0px 0px 10px 1px rgba(0,0,0,0.52);
      -moz-box-shadow: 0px 0px 10px 1px rgba(0,0,0,0.52);
      box-shadow: 0px 0px 10px 1px rgba(0,0,0,0.52);

      &-name {
        width: calc(100% - 7vw);
        font-size: 6vw;
        line-height: 7vw;
        font-weight: bold;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

    }

    &-body {
      width: 100%;
      overflow-x: hidden;
      // overflow-y: scroll;
      // -webkit-overflow-scrolling: touch;
    }
  }
}

.place-panel-enter-active, .place-panel-leave-active {
  transition: transform .2s linear;
}
.place-panel-enter, .place-panel-leave-to {
  transform: translateY(21vw) !important;
}
// .place-panel-enter-to, 
.place-panel-leave {
  transform: translateY(0) !important;
}
</style>