<template>
  <div class="direction-panel-container">
    <div v-show="posY < posArray[1]" class="shade" :style="shadeStyle"
      @touchstart.stop="moveInShade = false"
      @touchmove.stop="moveInShade = true"
      @touchend.stop="ontouchendshade"></div>

    <transition name="direction-panel" @after-enter="onafterenter" @after-leave="onafterleave">
      <div v-show="!collapse" class="panel" :style="panelStyle" 
        @touchstart="ontouchstart"
        @touchmove="ontouchmove"
        @touchend="ontouchend">

        <div class="panel-header">
          <div class="panel-scroll"></div>

          <div class="iconfont icon-close panel-close" @touchend="ontouchendclose"></div>

          <div class="panel-header-text">
            <div class="panel-header-text-from text-container">
              <span class="place-type">{{$t("direction.from")}}:</span>
              <span class="place-text text-primary" @touchend="ontouchendplacetext($event, false)">{{globalFromText}}</span>
            </div>
            <div class="panel-header-text-to text-container">
              <span class="place-type">{{$t("direction.to")}}:</span>
              <span class="place-text text-primary" @touchend="ontouchendplacetext($event, true)">{{globalToText}}</span>
            </div>
          </div>
        </div>

        <div class="panel-transport-wrapper">
          <div v-for="(transport, index) in transportList" :key="index" 
            class="iconfont transport-button" 
            :class="[`icon-${transport.iconName}`, { 'bg-primary text-white': currentTransportIndex === index }]"
            @touchend="ontouchendtransport($event, index)"></div>
        </div>

        <div class="panel-body" :style="panelBodyStyle" ref="panelBody" 
          @touchstart="ontouchstartpanelbody"
          @touchmove="ontouchmovepanelbody"
          @touchend="ontouchendpanelbody"
          @scroll="onscrollpanelbody">

          <router-view name="direction" :style="bodyScrollToBottomStyle" ref="directionRouter" @onscrollpanel="scrollPanelTo"></router-view>
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
      scrollTop: 0
    }
  },
  computed: {
    ...mapState({
      posArray: state => state.panelPosArray,
      collapse: state => state.direction.collapse,
      bodyHeight: state => state.direction.bodyHeight,
      globalFromText: state => state.direction.globalFromText,
      globalToText: state => state.direction.globalToText,
      selectorRouter: state => state.direction.selectorRouter,
      routerLeave: state => state.direction.routerLeave,
      cachedPlaceInfo: state => state.direction.cachedPlaceInfo,
      currentTransportIndex: state => state.direction.transportIndex,
    }),
    clonedSelectorRouter() {
      return JSON.parse(JSON.stringify(this.selectorRouter))
    },
    key() {
      const fullPath = this.$route.fullPath || ""
      return decodeURIComponent(fullPath.split(this.urlLocationReg).join(""))
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
        height: `calc(${this.clientHeight * 0.9}px - 5vw - 15vw - 12vw)`, 
        overflow: this.posY === this.posArray[2] ? 'auto' : 'hidden'
        // overflow: 'auto'
      }
    },
    bodyOverflow() {
      return this.bodyHeight > this.$refs.panelBody.offsetHeight
    },
    bodyScrollToBottomStyle() {
      if (this.bounce && this.posY === this.posArray[1] && this.scrollTop !== 0) {
        const posY = this.scrollTop
        this.scrollTop = 0
        return {
          transform: `translateY(${posY}px)`,
          transition: 'all .5s'
        }
      } else {
        return null
      }
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
      this.bodyLastClientY = e.targetTouches[0].clientY
    },
    ontouchmovepanelbody(e) {
      // console.log('panelbody touchmove')
      this.move = true
      if (!(this.posY <= this.posArray[2] && this.bodyOverflow)) return false
      const deltaY = e.targetTouches[0].clientY - this.bodyLastClientY
      this.bodyLastClientY = e.targetTouches[0].clientY
      this.swipeable = !this.bodyOverflow || (deltaY > 0 && this.scrollTop <= 0 && this.posY < this.posArray[0])
      if (!this.swipeable) this.stopBubble(e) 
      else if (this.lastSwipeable === false) this.startClientY = e.targetTouches[0].clientY
      this.lastSwipeable = this.swipeable
    },
    ontouchendpanelbody(e) {
      // console.log('panelbody touchend')
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
            buildingId: this.$route.params.buildingId,
            floorId: this.$route.params.floorId,
            locationInfo: this.$route.params.locationInfo
          }
        })
        this.stopBubble(e)
      }
    },

    ontouchendtransport(e, index) {
      if (!this.move) {
        this.stopBubble(e)
        if (this.currentTransportIndex === index) return
        this.$store.commit("direction/setTransportIndex", index)
      }
    },

    onafterenter(el) {
      el.style.transform = `translateY(${this.posArray[1] || -Math.floor(this.clientHeight * 0.4 - this.clientWidth * 0.2)}px)`
    },
    onafterleave() {
      this.$store.commit("direction/setRouterLeave", false)
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

    ontouchendplacetext(e, isTo = false) {
      if (!this.move) {
        this.$store.commit("direction/setIsSelectorTo", isTo)
        this.$store.commit("direction/toSelector", true)
        this.stopBubble(e)
      }
    }
  },
  created() {
    this.$EventBus.$on("scrollDirectionPanel", this.scrollPanelTo)
  },
  watch: {
    collapse: {
      immediate: true,
      handler: function (val) {
        this.bounce = true
        if (val) this.posY = 0
        else this.scrollPanelTo("m")
      }
    },
    clonedSelectorRouter: {
      immediate: true,
      handler: function (val, oldVal) {
        if (val?.length === 0 && oldVal?.length > 0) {
          if (!this.globalFromText || !this.globalToText) {
            if (!this.$isEmptyObject(this.cachedPlaceInfo)) {
              this.$router.push({
                name: "Place",
                ...this.cachedPlaceInfo
              })
              this.$store.commit("direction/setCachedPlaceInfo", {})
            } else {
              this.$router.push({
                name: "Map",
                params: {
                  buildingId: this.$route.params.buildingId,
                  floorId: this.$route.params.floorId,
                  locationInfo: this.$route.params.locationInfo
                }
              })
            }
          }
        }
      }
    },
    routerLeave(val) {
      if (val) {
        if (this.$refs.directionRouter?.$el) {
          const directionRouterEl = this.$refs.directionRouter?.$el
          const clonedNode = directionRouterEl.cloneNode(true)
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
.direction-panel-container {
  height: auto; 
  width: 100vw; 
  position: relative; 
  z-index: 2;

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
    border-top-left-radius: 5vw;
    border-top-right-radius: 5vw;
    -webkit-box-shadow: 0px 0px 10px 1px rgba(0,0,0,0.52);
    -moz-box-shadow: 0px 0px 10px 1px rgba(0,0,0,0.52);
    box-shadow: 0px 0px 10px 1px rgba(0,0,0,0.52);
    display: flex;
    flex-direction: column;
    align-items: center;

    .panel-header {
      width: 100vw;
      height: 20vw;
      display: flex;
      flex-direction: column;
      align-items: center;
      border-bottom: 1px #C6C6C6 solid;

      .panel-scroll {
        margin: 2vw 0;
        background-color: #8E8E93;
        width: 10vw;
        height: 1vw;
        border-radius: 0.5vw;
        flex-shrink: 0;
      }

      .panel-close {
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
      }

      &-text {
        width: 100%;
        height: 15vw;
        padding: 0 10vw 1vw 3vw;
        font-size: 5vw;
        line-height: 6.5vw;
        font-weight: bold;

        .text-container {
          width: 100%;
          height: 7vw;
          display: flex;
          justify-content: flex-start;

          .place-type {
            margin-right: 2vw;
          }

          .place-text {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }
    }

    .panel-transport-wrapper {
      width: 100%;
      height: 12vw;
      border-bottom: 1px #C6C6C6 solid;
      display: flex;
      justify-content: space-evenly;
      align-items: center;
      
      .transport-button {
        width: 20vw;
        height: 8vw;
        border-radius: 4vw;
        font-size: 5vw;
        line-height: 8vw;
        color: #888888;
        text-align: center;
        transition: background-color 0.2s;
      }
    }

    .panel-body {
      width: 100%;
      overflow-x: hidden;
    }
  }
}

.direction-panel-enter-active, .direction-panel-leave-active {
  transition: transform .2s linear;
}
.direction-panel-enter, .direction-panel-leave-to {
  transform: translateY(21vw) !important;
}
// .direction-panel-enter-to, 
.direction-panel-leave {
  transform: translateY(0) !important;
}
</style>