<template>
  <div class="search-panel-container">
    <div v-show="posY < posArray[1]" class="shade" :style="shadeStyle" 
      @touchstart.stop="ontouchstartshade"
      @touchmove.stop="ontouchmoveshade"
      @touchend.prevent.stop="ontouchendshade"></div>

    <div class="panel" :style="panelStyle"
      @touchstart="ontouchstart"
      @touchmove="ontouchmove"
      @touchend="ontouchend">
      <div class="panel-bar">
        <div class="panel-bar-scroll"></div>
        <div class="panel-bar-textarea">
          <form class="panel-bar-form" action="javascript:void(0)" :style="formStyle" @submit.prevent="onsubmit">
            <div class="iconfont icon-search panel-bar-form-icon"></div>
            <input v-model.trim="text" class="panel-bar-form-text" type="search" :placeholder="$t('search.search')" ref="input"
              @focus="onfocus"
              @blur="onblur">
          </form>
          <span class="panel-bar-cancel" ref="text" @touchend.stop="ontouchendcancel">{{$t('search.cancel')}}</span>
        </div>
      </div>

      <div class="panel-body-wrapper">
        <div class="panel-body" ref="panelBody" :style="panelBodyStyle" 
          @touchstart="ontouchstartpanelbody"
          @touchmove="ontouchmovepanelbody"
          @touchend="ontouchendpanelbody"
          @scroll="onscrollpanelbody">
          <div class="panel-body-page">
            <search-history v-show="$route.name !== 'Search' && !text" ref="historySearch"></search-history>
            <search-keyword v-show="inputFocused && text" :text="text" update-height ref="keywordSearch" @chooseitem="onChooseKeywordItem"></search-keyword>
            
            <router-view name="search" :key="key" @onscrollpanel="scrollPanelTo"></router-view>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SearchHistory from 'components/SearchHistory'
import SearchKeyword from 'components/SearchKeyword'

import { mapState } from 'vuex'

export default {
  props: {
    currentFloorId: {
      type: Number,
      default: 0
    }
  },
  components: {
    SearchHistory,
    SearchKeyword
  },
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
      scrollTop: 0,
      text: '',
      displayCancel: false,
      cancelWidth: 0,
      query: '',
      inputFocused: false
    }
  },
  computed: {
    ...mapState({
      posArray: state => state.panelPosArray,
      historyComponentHeight: state => state.search.historyComponentHeight,
      keywordComponentHeight: state => state.search.keywordComponentHeight,
      routerViewHeight: state => state.search.routerViewHeight,
      scrollToFromChild: state => state.search.scrollToFromChild,
      loadMore: state => state.search.searchMore,
      placePanelCollapse: state => state.place.collapse
    }),
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
        transform: `translateY(${this.placePanelCollapse ? this.posY : 0}px)`
      }
    },
    formStyle() {
      return {
        width: `calc(100vw - 4vw - ${this.displayCancel ? this.cancelWidth + 'px ' : '4vw'})`
      }
    },
    panelBodyStyle() {
      return {
        height: `calc(${this.clientHeight * 0.9}px - 2vw - 1vw - 2vw)`, 
        overflow: this.posY === this.posArray[2] ? 'auto' : 'hidden'
        // overflow: 'auto'
      }
    },
    bodyOverflow() {
      return (this.$route.name === 'Search' ? this.routerViewHeight : (this.text ? this.keywordComponentHeight : this.historyComponentHeight)) > this.$refs.panelBody.offsetHeight
    }
  },
  methods: {
    onsubmit() {
      // console.log(this.text)
      // console.log(encodeURIComponent(this.text))
      const value = this.text
      this.$refs.input.blur()
      this.query = value
      this.text = value
      this.selectItem({ content: value, dataType: 'query' })
      this.$refs.panelBody.scrollTo(0,0)
    },

    ontouchstart(e) {
      // console.log('panel touchstart')
      if (!this.placePanelCollapse) return
      if (this.bounce && this.posY >= this.posArray[0]) this.$refs.panelBody.scrollTo(0, 0)
      this.bounce = false
      this.lastPosY = this.posY
      this.move = false
      this.startClientY = e.targetTouches[0].clientY
    },
    ontouchmove(e) {
      this.$refs.input.blur()
      // console.log('panel touchmove')
      if (!this.placePanelCollapse) return
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
      if (!this.placePanelCollapse) return
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
        if (e?.target.nodeName.toLowerCase() === "input") return
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
      this.$refs.input.blur()
      this.move = true
      if (!(this.posY <= this.posArray[2] && this.bodyOverflow)) return false
      const deltaY = e.targetTouches[0].clientY - this.bodyLastClientY
      this.bodyLastClientY = e.targetTouches[0].clientY
      this.swipeable = !this.bodyOverflow || (deltaY > 0 && this.scrollTop <= 0 && this.posY < this.posArray[0])
      if (!this.swipeable) this.stopBubble(e) 
      else if (this.lastSwipeable === false) this.startClientY = e.targetTouches[0].clientY
      this.lastSwipeable = this.swipeable

      if (this.$route.name === 'Search' && !this.loadMore && deltaY < 0) {
        if (Math.ceil(this.scrollTop + this.$refs.panelBody.offsetHeight) >= this.routerViewHeight) {
          console.log('reach bottom')
          this.$store.commit('search/setLoadMore', true)
        }
      }
    },
    ontouchendpanelbody(e) {
      const deltaY = e.changedTouches[0].clientY - this.bodyLastClientY
      if (this.$route.name === 'Search' && !this.loadMore && deltaY < 0) {
        if (Math.ceil(this.scrollTop + this.$refs.panelBody.offsetHeight) >= this.routerViewHeight) {
          console.log('reach bottom')
          this.$store.commit('search/setLoadMore', true)
        }
      }
    },
    onscrollpanelbody(e) {
      // console.log('scroll')
      this.scrollTop = this.$refs.panelBody.scrollTop
    },

    ontouchstartshade(e) {
      this.moveInShade = false
    },
    ontouchmoveshade(e) {
      this.moveInShade = true
    },
    ontouchendshade(e) {
      if (!this.moveInShade) this.scrollPanelTo("m")
    },

    onfocus(e) {
      // console.log('focus')
      this.scrollPanelTo("t")
      this.inputFocused = true
      if (this.$route.name === "Search") {
        this.$router.replace({
          name: "Map",
          params: this.$route.params
        })
      }
      this.displayCancel = true
      this.$nextTick(() => {
        if (this.text) this.$store.commit('search/setKeywordComponentHeight', this.$refs.keywordSearch.$el.offsetHeight)
        else this.$store.commit('search/setHistoryComponentHeight', this.$refs.historySearch.$el.offsetHeight)
      })
    },
    onblur(e) {
      // console.log('blur')
      this.inputFocused = false
    },

    ontouchendcancel(e) {
      if (this.move) return
      if (this.$route.name === 'Search') 
        this.$router.push({ 
          name: "Map",
          params: {
            buildingId: this.$route.params.buildingId,
            floorId: this.$route.params.floorId,
          }
        })
      this.displayCancel = false
      this.$refs.input.blur()
      this.text = ''
      if (this.posY <= this.posArray[1]) this.scrollPanelTo("m")
      else this.scrollPanelTo("b")
      this.$nextTick(() => {
        this.$store.commit('search/setHistoryComponentHeight', this.$refs.historySearch.$el.offsetHeight)
      })
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

    onChooseKeywordItem(item) {
      this.selectItem(item)
    }
  },
  mounted() {
    // console.log('searchPanel mounted')
    // console.log(this.$refs.text.offsetWidth)
    this.scrollPanelTo("b")
    this.cancelWidth = this.$refs.text.offsetWidth
  },
  watch: {
    text (val) {
      if (val == null || val) return
      // this.$refs.input.blur()
      if (this.$route.name === 'Search') {
        this.$router.push({
          name: "Map",
          params: {
            buildingId: this.$route.params.buildingId,
            floorId: this.$route.params.floorId,
          }
        })
      }
      this.$nextTick(() => {
        this.$store.commit('search/setHistoryComponentHeight', this.$refs.historySearch.$el.offsetHeight)
      })
    },
    scrollTop: {
      immediate: true,
      handler: function (val) {
        this.$store.commit('search/setBodyScrollTop', val)
      }
    },
    scrollToFromChild (val) {
      if (typeof val === 'string' && val.indexOf('u') === 0) {
        // console.log(val, parseInt(val.substring(1, val.length)))
        this.$refs.panelBody.scrollTo(0, parseInt(val.substring(1, val.length)))
      }
    },
    $route: {
      immediate: true,
      handler: function (to, from) {
        if (to.name === "Place" || to.name === "Direction") {
          this.scrollPanelTo(0)
        }
        if (to.name === "Search" && this.text === "" && to.query.q) {
          this.text = decodeURIComponent(to.query.q)
          this.displayCancel = true
        }
      }
    }
  },
}
</script>

<style lang="scss">
.search-panel-container {
  height: auto; 
  width: 100vw; 
  position: relative; 
  z-index: 1;

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
    // position: absolute;
    width: 100vw;
    height: 100vh;
    background: #F8F8F8;
    border-top-left-radius: 5vw;
    border-top-right-radius: 5vw;
    -webkit-box-shadow: 0px 0px 10px 1px rgba(0,0,0,0.52);
    -moz-box-shadow: 0px 0px 10px 1px rgba(0,0,0,0.52);
    box-shadow: 0px 0px 10px 1px rgba(0,0,0,0.52);

    &-bar {
      // position: absolute;
      // top: 0;
      width: 100vw;
      height: 20vw;
      background: #F8F8F8;
      border-top-left-radius: 5vw;
      border-top-right-radius: 5vw;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      border-bottom: 1px #C6C6C6 solid;

      &-scroll {
        margin: 2vw 0 3vw;
        background-color: #8E8E93;
        width: 10vw;
        height: 1vw;
        border-radius: 0.5vw;
      }

      &-textarea {
        width: 150vw;
        height: 9vw;
        align-self: flex-start;
        display: flex;
        justify-content: flex-start;
        align-items: center;
        // vertical-align: bottom;

        .panel-bar-form {
          margin-left: 4vw;
          /* margin-top: 5vw; */
          padding: 0 2vw;
          background: #E6E3DF;
          // width: 90vw;
          height: 9vw;
          border-radius: 3vw;
          display: flex;
          justify-content: flex-start;
          align-items: center;
          position: relative;
          transition: width .5s ease-in-out;

          &-icon {
            font-size: 6vw !important;
            /* vertical-align: middle; */
            line-height: 7vw;
            text-align: center;
            height: 7vw;
            width: 7vw;
            display: inline-block;
            color: #888888;
            flex-shrink: 0;
          }

          &-text {
            background: none;  
            outline: none;  
            border: none;
            font-size: 5vw;
            display: inline-block;
            width: 85%;
            // height: 5vw;
            position: relative;
            margin-left: 2vw;
            flex-grow: 1;
            line-height: 1.2;
            /* margin: 7vw; */
          }
        }

        .panel-bar-cancel {
          padding: 0 4vw;
          font-size: 5vw;
          display: block;
          color: #0069d9;
        }
      }
    }

    .panel-body-wrapper {
      width: 100vw;
      height: auto;
      padding: 0;
      margin: 0;
      border: none;
      overflow: hidden;
      position: relative;

      .panel-body {
        width: 100vw;
        position: relative;

        &-page {
          position: relative;
          width: 100vw;
          height: auto;
        }
      }
    }
  }
}
</style>