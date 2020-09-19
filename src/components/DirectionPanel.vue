<template>
  <div class="direction-panel-container">
    <div v-show="deltaY < 0" class="shade" :style="shadeStyle"
      @touchstart.stop="ontouchstartshade"
      @touchmove.stop="ontouchmoveshade"
      @touchend.prevent.stop="ontouchendshade"></div>

    <transition name="direction-panel" @after-leave="onafterleave">
      <div v-show="!collapse" class="modal-container" :style="modalStyle" 
        @touchstart="ontouchstart"
        @touchmove="ontouchmove"
        @touchend="ontouchend">

        <div class="modal-header-custom">
          <div class="modal-scroll"></div>

          <div class="iconfont icon-close modal-close" @touchend="ontouchendclose"></div>

          <div class="modal-header-text">
            <div class="modal-header-text-from text-container">
              <span class="place-type">{{$t("direction.from")}}:</span>
              <span class="place-text text-primary" @touchend="ontouchendplacetext($event, false)">{{globalFromText}}</span>
            </div>
            <div class="modal-header-text-to text-container">
              <span class="place-type">{{$t("direction.to")}}:</span>
              <span class="place-text text-primary" @touchend="ontouchendplacetext($event, true)">{{globalToText}}</span>
            </div>
          </div>
        </div>

        <div class="modal-transport-wrapper">
          <div v-for="(transport, index) in transportList" :key="index" 
            class="iconfont transport-button" 
            :class="[`icon-${transport.iconName}`, { 'bg-primary text-white': currentTransportIndex === index }]"
            @touchend="ontouchendtransport($event, index)"></div>
        </div>

        <div class="modal-display" :style="modalDisplayStyle" ref="modalDisplay" 
          @touchstart="ontouchstartmodalbody"
          @touchmove="ontouchmovemodalbody"
          @touchend="ontouchendmodalbody"
          @scroll="onscrollmodalbody">

          <router-view name="direction" :style="bodyScrollToBottomStyle" ref="directionRouter" @onscrollmodal="scrollModal"></router-view>
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
      maxHeight: 0,
      startClientY: 0,
      deltaY: 0,
      lastEndY: 0,
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

    // key() {
    //   const fullPath = this.$route.fullPath || ""
    //   return decodeURIComponent(fullPath.split(this.urlLocationReg).join(""))
    // },

    shadeStyle() {
      return {
        opacity: 1 / (-this.maxHeight * 3) * this.deltaY
      }
    },

    modalStyle() {
      return {
        // top: this.clientHeight + this.deltaY - 150 + 'px',
        top: `calc(${this.clientHeight}px - 20vw)`,
        transition: this.bounce ? 'transform .5s' : '',
        transform: `translateY(${this.deltaY}px)`
      }
    },

    modalDisplayStyle() {
      return {
        height: `calc(${this.clientHeight * 0.9}px - 5vw - 15vw - 12vw)`, 
        overflow: this.deltaY === -this.maxHeight ? 'auto' : 'hidden'
        // overflow: 'auto'
      }
    },

    bodyOverflow() {
      return this.bodyHeight > this.$refs.modalDisplay.offsetHeight
    },

    bodyScrollToBottomStyle() {
      if (this.bounce && this.deltaY === 0 && this.scrollTop !== 0) {
        const deltaY = this.scrollTop
        this.scrollTop = 0
        return {
          transform: `translateY(${deltaY}px)`,
          transition: 'all .5s'
        }
      } else return null
    }
  },
  methods: {
    ontouchstart(e) {
      // console.log('modal touchstart')
      if (this.bounce && this.deltaY >= 0) this.$refs.modalDisplay.scrollTo(0, 0)
      this.bounce = false
      this.lastEndY = this.deltaY
      this.move = false
      this.startClientY = e.targetTouches[0].clientY
    },
    ontouchmove(e) {
      // console.log('modal touchmove')
      this.bounce = false
      this.move = true
      const deltaY = e.targetTouches[0].clientY - this.startClientY + this.lastEndY

      if (deltaY > 0) this.deltaY = 0
      else if (deltaY < -this.maxHeight) {
        const y = -this.maxHeight - deltaY
        this.deltaY = -this.maxHeight - Math.sqrt(y)
      } else this.deltaY = deltaY
    },
    ontouchend(e) {
      // console.log('modal touchend')
      this.bounce = false
      if (!this.move) { // tap
        if (this.deltaY === 0) {
          this.scrollModalTo(-this.maxHeight)
          return
        }
      } else { // slide
        const deltaY = this.deltaY - this.lastEndY
        // console.log(deltaY)
        if (deltaY < 0) { // up
          this.bounce = true
          this.deltaY = (deltaY > -this.clientHeight * 0.1 && this.deltaY >= -this.clientHeight / 20) ? 0 : -this.maxHeight
        } else if (deltaY === 0) {  
          this.deltaY = this.lastEndY
        } else if (deltaY < this.maxHeight){ // down
          this.bounce = true
          this.deltaY = deltaY < this.clientHeight * 0.1 ? -this.maxHeight : 0
        } else {
          console.log("here")
          this.bounce = true
          this.deltaY = 0
        }
      }
      this.lastEndY = this.deltaY
    },

    ontouchstartmodalbody(e) {
      // console.log('modalbody touchstart')
      this.bodyLastClientY = e.targetTouches[0].clientY
    },
    ontouchmovemodalbody(e) {
      // console.log('modalbody touchmove')
      this.move = true
      if (!(this.deltaY <= -this.maxHeight && this.bodyOverflow)) return false
      const deltaY = e.targetTouches[0].clientY - this.bodyLastClientY
      this.bodyLastClientY = e.targetTouches[0].clientY
      this.swipeable = !this.bodyOverflow || (deltaY > 0 && this.scrollTop <= 0 && this.deltaY < 0)
      if (!this.swipeable) this.stopBubble(e) 
      else if (this.lastSwipeable === false) this.startClientY = e.targetTouches[0].clientY
      this.lastSwipeable = this.swipeable
    },
    ontouchendmodalbody(e) {
      // console.log('modalbody touchend')
    },
    onscrollmodalbody(e) {
      this.scrollTop = this.$refs.modalDisplay.scrollTop
    },

    ontouchstartshade(e) {
      this.moveInShade = false
    },
    ontouchmoveshade(e) {
      this.moveInShade = true
    },
    ontouchendshade(e) {
      if (!this.moveInShade) this.scrollModalTo()
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
        if (this.currentTransportIndex !== index) {
          this.$store.commit("direction/setTransportIndex", index)
          this.$router.replace({ 
            name: "Direction",
            params: this.$route.params,
            query: {
              ...this.$route.query,
              mode: this.transportList[this.currentTransportIndex].iconName || this.transportList[0].iconName
            }
          })
        }
        this.stopBubble(e)
      }
    },

    onafterleave() {
      this.$store.commit("direction/setRouterLeave", false)
    },

    scrollModalTo(posY = 0) {
      this.bounce = true
      this.deltaY = posY
      this.lastEndY = this.deltaY
    },

    scrollModal(type) {
      let posY
      switch(type) {
        case "t": 
          posY = -this.maxHeight
          break;
        default:
          posY = 0
          break;
      }
      this.scrollModalTo(posY)
    },

    ontouchendplacetext(e, isTo = false) {
      if (!this.move) {
        this.$store.commit("direction/setIsSelectorTo", isTo)
        this.$store.commit("direction/toSelector", true)
        this.stopBubble(e)
      }
    }
  },
  mounted() {
    this.maxHeight = this.clientHeight * 0.9 - this.clientWidth * 0.2
  },
  watch: {
    collapse(val) {
      this.bounce = true
      if (val) this.deltaY = 0
    },
    clonedSelectorRouter: {
      immediate: true,
      handler: function(val, oldVal) {
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
          if (this.$refs.modalDisplay) {
            this.$refs.modalDisplay.appendChild(clonedNode)
          }
        }
      } else {
        if (this.$refs.modalDisplay) {
          document.querySelectorAll(".animation-cache").forEach(node => node.parentNode.removeChild(node))
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
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

  .modal-container {
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

    .modal-header-custom {
      width: 100vw;
      height: 20vw;
      display: flex;
      flex-direction: column;
      align-items: center;
      border-bottom: 1px #C6C6C6 solid;

      .modal-scroll {
        margin: 2vw 0;
        background: #8E8E93;
        width: 10vw;
        height: 1vw;
        border-radius: 0.5vw;
        flex-shrink: 0;
      }

      .modal-close {
        position: absolute;
        right: 3vw;
        top: 5vw;
        background: #E6E3DF;
        color: #8E8E93;
        font-size: 3vw;
        height: 5vw;
        width: 5vw;
        line-height: 5vw;
        text-align: center;
        vertical-align: middle;
        border-radius: 2.5vw;
      }

      .modal-header-text {
        width: 100%;
        height: 15vw;
        padding: 0 8vw 1vw 3vw;
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

    .modal-transport-wrapper {
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

    .modal-display {
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
.direction-panel-enter-to, .direction-panel-leave {
  transform: translateY(0) !important;
}
</style>