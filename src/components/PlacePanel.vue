<template>
  <div class="place-panel-container">
    <div v-show="deltaY < 0" class="shade" :style="shadeStyle"
      @touchstart.stop="ontouchstartshade"
      @touchmove.stop="ontouchmoveshade"
      @touchend.prevent.stop="ontouchendshade"></div>

    <transition name="place-panel" @after-leave="onafterleave">
      <div v-show="!collapse" class="modal-container" :style="modalStyle" 
        @touchstart="ontouchstart"
        @touchmove="ontouchmove"
        @touchend="ontouchend">

        <div class="modal-scroll"></div>

        <div class="iconfont icon-close modal-close" @touchend="ontouchendclose"></div>

        <div class="modal-header" :style="{background: headerBackground, opacity: displayHeader ? 1 : 0}">
          <div class="modal-header-name">{{headerName}}</div>
        </div>

        <div class="modal-display" :style="modalDisplayStyle" ref="modalDisplay" 
          @touchstart="ontouchstartmodalbody"
          @touchmove="ontouchmovemodalbody"
          @touchend="ontouchendmodalbody"
          @scroll="onscrollmodalbody">

          <router-view name="place" :key="key" :style="bodyScrollToBottomStyle" ref="placeRouter"></router-view>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  data () {
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
      scrollable: false,
      scrollTop: 0,
    }
  },
  computed: {
    ...mapState({
      headerName: state => state.place.headerName,
      collapse: state => state.place.collapse,
      bodyHeight: state => state.place.bodyHeight,
      routerLeave: state => state.place.routerLeave
    }),

    key() {
      const fullPath = this.$route.fullPath || ""
      return decodeURIComponent(fullPath.split(this.urlLocationReg).join(""))
    },

    shadeStyle () {
      return {
        opacity: 1 / (-this.maxHeight * 3) * this.deltaY
      }
    },

    modalStyle () {
      return {
        // top: this.clientHeight + this.deltaY - 150 + 'px',
        top: `calc(${this.clientHeight}px - 20vw)`,
        transition: this.bounce ? 'transform .5s' : '',
        transform: `translateY(${this.deltaY}px)`
      }
    },

    modalDisplayStyle () {
      return {
        height: `calc(${this.clientHeight * 0.9}px - 2vw - 1vw - 2vw)`, 
        overflow: this.deltaY === -this.maxHeight ? 'auto' : 'hidden'
        // overflow: 'auto'
      }
    },

    displayHeader () {
      const flag = this.scrollable && this.scrollTop > 0 
      this.$store.commit('place/setDisplayHeader', flag)
      return flag
    },

    bodyOverflow () {
      return this.bodyHeight > this.$refs.modalDisplay.offsetHeight
    },

    bodyScrollToBottomStyle () {
      if (this.bounce && this.deltaY === 0 && this.scrollTop !== 0) {
        const deltaY = this.scrollTop
        this.scrollTop = 0
        return {
          transform: `translateY(${deltaY}px)`,
          transition: 'all .5s'
        }
      } else return null
    },
    
    headerBackground () {
      let opacity = (this.scrollTop) / (this.clientHeight / 10)
      if (opacity > 1) opacity = 1
      else if (opacity < 0) opacity = 0
      return `rgba(248,247,242,${opacity})`
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
      if (!this.move) { // click
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
      this.scrollable = this.deltaY <= -this.maxHeight && this.bodyOverflow
      this.bodyLastClientY = e.targetTouches[0].clientY
    },
    ontouchmovemodalbody(e) {
      // console.log('modalbody touchmove')
      this.move = true
      this.scrollable = this.deltaY <= -this.maxHeight && this.bodyOverflow
      if (!this.scrollable) return false
      const deltaY = e.targetTouches[0].clientY - this.bodyLastClientY
      this.bodyLastClientY = e.targetTouches[0].clientY
      this.swipeable = !this.bodyOverflow || (deltaY > 0 && this.scrollTop <= 0 && this.deltaY < 0)
      if (!this.swipeable) this.stopBubble(e) 
      else if (this.lastSwipeable === false) this.startClientY = e.targetTouches[0].clientY
      this.lastSwipeable = this.swipeable
    },
    ontouchendmodalbody(e) {
      // console.log('modalbody touchend')
      this.scrollable = this.deltaY <= -this.maxHeight && this.bodyOverflow
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

    onafterleave() {
      this.$store.commit("place/setRouterLeave", false)
    },

    scrollModalTo(posY = 0) {
      this.bounce = true
      this.deltaY = posY
      this.lastEndY = this.deltaY
    }
  },
  mounted () {
    this.maxHeight = this.clientHeight * 0.9 - this.clientWidth * 0.2
  },
  watch: {
    collapse (val) {
      this.bounce = true
      if (val) this.deltaY = 0
    },
    routerLeave(val) {
      if (val) {
        if (this.$refs.placeRouter?.$el) {
          const placeRouterEl = this.$refs.placeRouter?.$el
          const clonedNode = placeRouterEl.cloneNode(true)
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
}

.place-panel-enter-active, .place-panel-leave-active {
  transition: transform .2s linear;
}
.place-panel-enter, .place-panel-leave-to {
  transform: translateY(21vw) !important;
}
.place-panel-enter-to, .place-panel-leave {
  transform: translateY(0) !important;
}

.modal-container {
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
}

.modal-scroll {
  margin: 2vw 0;
  background: #8E8E93;
  width: 10vw;
  height: 1vw;
  border-radius: 0.5vw;
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
  flex-shrink: 0;
  z-index: 3;
}

.modal-header {
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
    width: calc(100% - 5vw);
    font-size: 6vw;
    line-height: 7vw;
    font-weight: bold;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

}

.modal-display {
  width: 100%;
  overflow-x: hidden;
  // overflow-y: scroll;
  // -webkit-overflow-scrolling: touch;
  // position: relative;
}

</style>