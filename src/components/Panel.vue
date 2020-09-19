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
            <div class="modal-header-text-from"></div>
            <div class="modal-header-text-to"></div>
          </div>
        </div>

        <div class="modal-display" :style="modalDisplayStyle" ref="modalDisplay" 
          @touchstart="ontouchstartmodalbody"
          @touchmove="ontouchmovemodalbody"
          @touchend="ontouchendmodalbody"
          @scroll="onscrollmodalbody">

          <router-view name="direction" :key="key" :style="bodyScrollToBottomStyle" ref="directionRouter"></router-view>
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
      bodyHeight: state => state.direction.bodyHeight,
      routerLeave: state => state.direction.routerLeave
    }),

    key() {
      const fullPath = this.$route.fullPath || ""
      return decodeURIComponent(fullPath.split(this.urlLocationReg).join(""))
    },

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
        height: `calc(${this.clientHeight * 0.9}px - 2vw - 1vw - 2vw)`, 
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
      if (!this.moveInShade) this.scrollModalTo(0)
    },

    ontouchendclose(e) {
      // console.log('ontouchend')
      if (!this.move) {
        this.$store.commit("place/setRouterLeave", true)
        this.$router.push({
          name: "Map",
          params: {
            buildingId: this.$route.params.buildingId,
            floorId: this.$route.params.floorId
          }
        })
        this.stopBubble(e)
      }
    },

    onafterleave() {
      if (this.$refs.modalDisplay) {
        document.querySelectorAll(".animation-cache").forEach(node => node.parentNode.removeChild(node))
      }
      this.$store.commit("direction/setRouterLeave", false)
    },

    scrollModalTo(posY = 0) {
      this.bounce = true
      this.deltaY = posY
      this.lastEndY = this.deltaY
    }
  },
  mounted() {
    this.maxHeight = this.clientHeight * 0.9 - this.clientWidth * 0.2
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