<template>
  <div class="panel-container">
    <div v-show="posY < posArray[1]" class="shade" 
      :style="shadeStyle"
      @touchstart.stop="moveInShade = false"
      @touchmove.stop="moveInShade = true"
      @touchend.stop="ontouchendshade"></div>

    <transition 
      :name="transitionName" 
      enter-active-class="panel-enter-active"
      leave-active-class="panel-leave-active"
      v-on="$listeners"
    >
      <div v-show="!collapse" class="panel" 
        :style="panelStyle" 
        @touchstart="ontouchstart"
        @touchmove="ontouchmove"
        @touchend="ontouchend"
      >
        <slot></slot>    
      </div>
    </transition>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  props: {
    transitionName: String,
    collapse: {
      type: Boolean,
      default: false
    },
    startClientY: Number,
    posY: Number,
    bounce: Boolean,
    move: Boolean,
  },
  data() {
    return {
      lastPosY: 0,
      moveInShade: false
    }
  },
  computed: {
    ...mapState({
      posArray: state => state.panelPosArray
    }),
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
    }
  },
  methods: {
    ontouchstart(e) {
      // console.log('panel touchstart')
      if (this.bounce && this.posY >= this.posArray[0]) this.$refs.panelBody.scrollTo(0, 0)
      this.$emit('update:bounce', false)
      this.lastPosY = this.posY
      this.$emit('update:move', false)
      this.$emit('update:startClientY', e.targetTouches[0].clientY)
    },
    ontouchmove(e) {
      // console.log('panel touchmove')
      this.$emit('update:bounce', false)
      this.$emit('update:move', true)

      let posY = e.targetTouches[0].clientY - this.startClientY + this.lastPosY
      if (posY > this.posArray[0]) {
        posY = this.posArray[0]
      } else if (posY < this.posArray[2]) {
        const y = this.posArray[2] - posY
        posY = this.posArray[2] - Math.sqrt(y)
      }
      this.$emit('update:posY', posY)
    },
    ontouchend(e) {
      // console.log('panel touchend')
      this.$emit('update:bounce', false)
      let posY = this.posY
      if (this.posY > this.posArray[0]) {
        this.$emit('update:bounce', true)
        posY = this.posArray[0]
      } else if (this.posY < this.posArray[2]) {
        this.$emit('update:bounce', true)
        posY = this.posArray[2]
      }

      if (!this.move) { // click
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
          this.$emit('update:bounce', true)
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
      this.$emit('update:posY', posY)
      this.lastPosY = this.posY
    },

    ontouchendshade(e) {
      if (!this.moveInShade) this.scrollPanelTo("m")
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
      this.$emit('update:bounce', true)
      this.$emit('update:posY', posY)
      this.lastPosY = this.posY
    }
  },
  watch: {
    collapse: {
      immediate: true,
      handler: function (val) {
        this.$emit('update:bounce', true)
        if (val) this.$emit('update:posY', 0)
        else this.scrollPanelTo("m")
      }
    }
  }
}
</script>

<style lang="scss">
.panel-container {
  height: auto; 
  width: 100vw; 
  position: relative; 

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
  }
}

.panel-enter-active, .panel-leave-active {
  transition: transform .2s linear;
}
</style>