<template>
  <div class="direction-selector-panel-container">
    <div v-show="deltaY < 0" class="shade" :style="shadeStyle"></div>

    <transition name="direction-selector-panel">
      <div v-show="displayPanel" class="modal-container" :style="modalStyle" id="modal"
        @touchstart="ontouchstart"
        @touchmove="ontouchmove"
        @touchend="ontouchend">

        <div class="modal-header-custom">
          <div class="modal-header-title-area">
            <span class="modal-header-cancel text-primary" @touchend="ontouchendcancel">{{$t("direction.selector.cancel")}}</span>
            <span class="modal-header-title">{{$t("direction.selector.changeTitle")}}</span>
            <span class="modal-header-route text-primary" @touchend="ontouchendroute">{{$t("direction.selector.setRoute")}}</span>
          </div>

          <div class="modal-box-container">
            <div class="modal-box">
              <form class="modal-box-form" action="javascript:void(0)" @submit.prevent="onsubmitinput($event, false)">
                <span class="bg-success text-white">起</span>
                <input 
                  type="search"
                  ref="fromInput"
                  v-model.trim="fromText" 
                  :placeholder="$t('direction.fromInput')"
                  @focus="onfocusinput($event, false)">
              </form>
              <form class="modal-box-form" action="javascript:void(0)" @submit.prevent="onsubmitinput($event, true)">
                <span class="bg-danger text-white">终</span>
                <input 
                  type="search"
                  ref="toInput"
                  v-model.trim="toText" 
                  :placeholder="$t('direction.toInput')"
                  @focus="onfocusinput($event, true)">
              </form>
            </div>
            <button 
              class="iconfont icon-reverse reverse-button"
              @touchend="ontouchendreverse"></button>
          </div>

          <button class="btn btn-outline-primary locate-button" type="button" @touchend="ontouchendlocate">{{$t("direction.selector.locate")}}</button>
        </div>

        <div class="modal-display" :style="modalDisplayStyle" ref="modalDisplay" 
          @touchstart="ontouchstartmodalbody"
          @touchmove="ontouchmovemodalbody"
          @touchend="ontouchendmodalbody"
          @scroll="onscrollmodalbody">

          <div>Choose place</div>
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
      scrollTop: 0,
      fromText: "",
      toText: "",
      isCurrentTo: false,
      displayPanel: false
    }
  },
  computed: {
    ...mapState({
      globalFromText: state => state.direction.globalFromText,
      globalToText: state => state.direction.globalToText,
      bodyHeight: state => state.direction.bodyHeight,
      selectorRouter: state => state.direction.selectorRouter,
      routerIsTo: state => state.direction.selectorIsTo
    }),

    clonedSelectorRouter() {
      return JSON.parse(JSON.stringify(this.selectorRouter))
    },

    shadeStyle() {
      return {
        opacity: 1 / (-this.maxHeight * 3) * this.deltaY
      }
    },

    modalStyle() {
      return {
        top: `${this.clientHeight}px`,
        transition: this.bounce ? 'transform .5s' : '',
        transform: `translateY(${this.deltaY}px)`
      }
    },

    modalDisplayStyle() {
      return {
        height: `calc(${this.clientHeight * 0.9}px - 2vw - 1vw - 2vw)`, 
        overflow: this.deltaY === -this.maxHeight ? 'auto' : 'hidden'
      }
    },

    bodyOverflow() {
      return this.bodyHeight > this.$refs.modalDisplay.offsetHeight
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

    scrollModalTo(posY = 0) {
      this.bounce = true
      this.deltaY = posY
      this.lastEndY = this.deltaY
    },

    stopBubble(e) { 
      if ( e?.stopPropagation ) e.stopPropagation()
      else window.event.cancelBubble = true
    },

    ontouchendcancel(e) {
      // console.log('ontouchend')
      if (!this.move) {
        this.$store.commit("direction/clearSelectorRouter")
        if (e) this.stopBubble(e)
      }
    },

    ontouchendroute(e) {
      if (!this.move) {
        this.stopBubble(e)
        if (!this.fromText) {
          this.$toast({
            message: this.$t("direction.selector.inputFrom"),
            time: 3000
          })
          this.$refs.fromInput?.focus()
        } else if (!this.toText) {
          this.$toast({
            message: this.$t("direction.selector.inputTo"),
            time: 3000
          })
          this.$refs.toInput?.focus()
        } else this.refreshPage()
      }
    },

    ontouchendreverse(e) {
      if (!this.move) {
        this.stopBubble(e)
        const tmp = this.fromText
        this.fromText = this.toText
        this.toText = tmp
        
        if (!this.fromText) this.$refs.fromInput?.focus()
        else if (!this.toText) this.$refs.toInput?.focus()
        else this.refreshPage()
      }
    },

    ontouchendlocate(e) {
      if (!this.move) {
        this.$store.commit("direction/setSelectorIsTo", this.isCurrentTo)
        this.$store.commit("direction/toSelectorMap")
        this.stopBubble(e)
      }
    },

    onfocusinput(e, isTo = false) {
      // console.log("focus")
      this.isCurrentTo = isTo
    },

    onsubmitinput(e, isTo = false) {
      // console.log("submit")
      if (!isTo) {
        this.$refs.fromInput?.blur()
        if (!this.toText) this.$refs.toInput?.focus()
        else this.refreshPage()
      } else {
        this.$refs.toInput?.blur()
        if (!this.fromText) this.$refs.fromInput?.focus()
        else this.refreshPage()
      }
    },

    refreshPage() {
      if (this.fromText.toLowerCase() === this.toText.toLowerCase()) {
        this.$toast({
          message: this.$t("direction.selector.same"),
          time: 3000
        })
        return
      }

      if (this.$route.name === "Direction") {
        if (this.$route.params.fromPlace !== this.fromText || this.$route.params.toPlace !== this.toText) {
          this.$router.push({ 
            name: "Direction",
            params: {
              fromPlace: this.fromText || "",
              toPlace: this.toText || "",
              buildingId: this.$route.params.buildingId,
              floorId: this.$route.params.floorId,
              locationInfo: this.$route.params.locationInfo
            }
          })
        } else {
          this.$store.commit("direction/clearSelectorRouter")
        }
      }
    },
  },
  mounted() {
    this.maxHeight = this.clientHeight * 0.9

    this.$EventBus.$on("setDirectionText", ({ isTo, text = "" }) => {
      if (!isTo) this.fromText = text
      else this.toText = text

      setTimeout(() => this.onsubmitinput(null, isTo), 100)
    })
  },
  watch: {
    deltaY: {
      immediate: true,
      handler: function(val, oldVal) {
        if (val === 0 && oldVal <= 0) this.$store.commit("direction/clearSelectorRouter")
      }
    },
    displayPanel(val) {
      this.bounce = true
      this.deltaY = val ? -this.maxHeight : 0
      this.fromText = val ? this.globalFromText : ""
      this.toText = val ? this.globalToText : ""
    },
    clonedSelectorRouter: {
      immediate: true,
      handler: function(val, oldVal) {
        // console.log(JSON.stringify(oldVal), JSON.stringify(val))
        this.displayPanel = (val?.length === 1 && val?.indexOf("selector") === 0) || (val?.length === 2 && val?.indexOf("selector") === 0 && val?.indexOf("map") === 1)
        
        if ((val?.length === 1 && val?.indexOf("selector") === 0)) {
          if (!oldVal?.length) {
            setTimeout(() => {
              if (this.fromText && this.toText) {
                if (this.routerIsTo) this.$refs.toInput?.focus()
                else this.$refs.fromInput?.focus()
              } else {
                if (!this.fromText) this.$refs.fromInput?.focus()
                else this.$refs.toInput?.focus()
              }
            }, 100)
          }
        }    

        // if ((val?.length === 1 && val?.indexOf("selector") === 0) 
        //   && (oldVal?.length === 2 && oldVal?.indexOf("selector") === 0 && oldVal?.indexOf("map") === 1)) {
        //   if (!this.fromText || !this.toText) {
        //     this.$store.commit("direction/setRouterLeave", true)
        //     this.$router.push({
        //       name: "Map",
        //       params: {
        //         buildingId: this.$route.params.buildingId,
        //         floorId: this.$route.params.floorId,
        //         locationInfo: this.$route.params.locationInfo
        //       }
        //     })
        //   }
        // }
      }
    },
    isCurrentTo: {
      immediate: true,
      handler: function(val) {
        console.log("isCurrentTo", val)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.direction-selector-panel-container {
  height: auto; 
  width: 100vw; 
  position: relative; 
  z-index: 3;

  input, button, form {
    position: relative;
  }

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
      width: 100%;
      padding: 0 5vw;
      border-bottom: 1px #C6C6C6 solid;

      .modal-header-title-area {
        width: 100%;
        // height: 20vw;
        padding: 4vw 0 2vw;
        font-size: 4.5vw;
        line-height: 1.5;
        display: flex;
        justify-content: space-between;
        align-items: center;

        .modal-header-title {
          font-weight: bold;
        }
      }

      .modal-box-container {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;

        .modal-box {
          width: 80vw;

          .modal-box-form {
            display: flex;
            align-items: center;
            margin: 3vw 0;

            span {
              display: block;
              width: 8vw;
              height: 8vw;
              border-radius: 4vw;
              font-size: 4vw;
              line-height: 8vw;
              text-align: center;
              margin-right: 2vw;
              flex-shrink: 0;
            }

            input {
              background: transparent;
              border: 2px #ced4da solid;
              border-radius: 1.5vw;
              padding: 0 1.5vw;
              font-size: 4vw;
              line-height: 2.5;
              flex-grow: 1;

              // &::-webkit-input-placeholder { /* Chrome/Opera/Safari */
              //   padding-left: 1vw;
              // }
              // &::-moz-placeholder { /* Firefox 19+ */
              //   padding-left: 1vw;
              // }
              // &:-ms-input-placeholder { /* IE 10+ */
              //   padding-left: 1vw;
              // }
              // &:-moz-placeholder { /* Firefox 18- */
              //   padding-left: 1vw;
              // }
            }
          }
        }

        .reverse-button {
          background: transparent;
          font-size: 6.5vw;
          flex-shrink: 0;
        }
      }

      .locate-button {
        width: 100%;
        height: 10vw;
        font-size: 5vw;
        display: block;
        margin: 1vw auto 3vw;
        padding: 1vw 4vw;
        border-radius: 2vw;
        
        &:before {
          font-family: "iconfont";
          content: "\e69c";
          margin-right: 2vw;
        }
      }
    }
  }
}

.direction-selector-panel-enter-active, .direction-selector-panel-leave-active {
  transition: transform .2s linear;
}
.direction-selector-panel-enter, .direction-selector-panel-leave-to {
  transform: translateY(0) !important;
}
// .direction-selector-panel-enter-to, .direction-selector-panel-leave {
//   transform: translateY(-90vh) !important;
// }
</style>