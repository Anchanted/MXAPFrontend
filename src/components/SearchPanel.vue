<template>
  <div class="search-panel-container">
    <div v-show="deltaY < 0" class="shade" :style="shadeStyle" 
      @touchstart.stop="ontouchstartshade"
      @touchmove.stop="ontouchmoveshade"
      @touchend.prevent.stop="ontouchendshade"></div>

    <div class="search-panel" :style="panelStyle"
      @touchstart="ontouchstart"
      @touchmove="ontouchmove"
      @touchend="ontouchend">
      <div class="search-bar">
        <div class="search-bar-scroll"></div>
        <div class="search-bar-textarea">
          <form class="search-bar-form" action="javascript:void(0)" :style="formStyle" @submit.prevent="onsubmit">
            <div class="iconfont icon-search search-icon"></div>
            <input v-model.trim="text" class="search-bar-form-text" type="search" :placeholder="$t('search.search')" ref="input"
              @focus="onfocus"
              @blur="onblur">
          </form>
          <span class="search-bar-cancel" ref="text" @touchend.stop="ontouchendcancel">{{$t('search.cancel')}}</span>
        </div>
      </div>

      <div class="search-body">
        <div class="search-body-window" ref="window" :style="windowStyle" 
          @touchstart="ontouchstartmodalbody"
          @touchmove="ontouchmovemodalbody"
          @touchend="ontouchendmodalbody"
          @scroll="onscrollmodalbody">
          <div class="search-body-page">
            <search-history v-show="$route.name !== 'Search' && !text" ref="historySearch"></search-history>
            <search-keyword v-show="inputFocused && text" :text="text" update-height ref="keywordSearch" @chooseitem="onChooseKeywordItem"></search-keyword>
            
            <router-view name="search" :key="key"></router-view>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SearchHistory from 'views/Search/SearchHistory'
import SearchKeyword from 'views/Search/SearchKeyword'

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
      historyComponentHeight: state => state.search.historyComponentHeight,
      keywordComponentHeight: state => state.search.keywordComponentHeight,
      routerViewHeight: state => state.search.routerViewHeight,
      scrollToFromChild: state => state.search.scrollToFromChild,
      loadMore: state => state.search.searchMore,
      placePanelCollapse: state => state.place.collapse
    }),
    key() {
      if (this.$route.name === 'Search') {
        const query = this.$route.fullPath.substring(this.$route.path.length)
        // console.log(this.$route.name + query)
        return this.$route.name + query
      } else {
        const fullPath = this.$route.fullPath || ""
        return decodeURIComponent(fullPath.split(this.urlLocationReg).join(""))
      }
    },
    shadeStyle() {
      return {
        opacity: 1 / (-this.maxHeight * 3) * this.deltaY
      }
    },
    panelStyle() {
      return {
        top: `calc(${this.clientHeight}px - 20vw)`,
        transition: this.bounce ? 'transform .5s' : '',
        transform: `translateY(${this.placePanelCollapse ? this.deltaY : 0}px)`
      }
    },
    formStyle() {
      return {
        width: `calc(100vw - 4vw - ${this.displayCancel ? this.cancelWidth + 'px ' : '4vw'})`
      }
      // let width
      // if (this.displayCancel) width = this.clientWidth - this.clientWidth * 0.04 - this.cancelWidth
      // else width = this.clientWidth - this.clientWidth * 0.04 - this.clientWidth * 0.04
      // return {
      //   width: width + 'px'
      // }
    },
    windowStyle() {
      return {
        height: `calc(${this.clientHeight * 0.9}px - 20vw)`, 
        overflow: this.deltaY === -this.maxHeight ? 'auto' : 'hidden'
        // overflow: 'auto'
      }
    },
    bodyOverflow() {
      return (this.$route.name === 'Search' ? this.routerViewHeight : (this.text ? this.keywordComponentHeight : this.historyComponentHeight)) > this.$refs.window.offsetHeight
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
      this.$refs.window.scrollTo(0,0)
    },

    ontouchstart(e) {
      // console.log('modal touchstart')
      if (this.placePanelCollapse) {
        this.bounce = false
        this.lastEndY = this.deltaY
        this.move = false
        this.startClientY = e.targetTouches[0].clientY
      }
    },
    ontouchmove(e) {
      this.$refs.input.blur()
      // console.log('modal touchmove')
      if (this.placePanelCollapse) {
        this.bounce = false
        this.move = true
        const deltaY = e.targetTouches[0].clientY - this.startClientY + this.lastEndY

        if (deltaY > 0) this.deltaY = 0
        else if (deltaY < -this.maxHeight) {
          const y = -this.maxHeight - deltaY
          this.deltaY = -this.maxHeight - Math.sqrt(y)
        } else this.deltaY = deltaY
      }
    },
    ontouchend(e) {
      // console.log('modal touchend')
      if (this.placePanelCollapse) {
        this.bounce = false
        if (!this.move) { // tap
          if (this.deltaY === 0) {
            this.scrollModalTo(-this.maxHeight)
            return
          }
        } else { // slide
          const deltaY = this.deltaY - this.lastEndY
          if (deltaY < 0) { // up
            this.bounce = true
            this.deltaY = (deltaY > -this.clientHeight * 0.1 && this.deltaY >= -this.clientHeight / 20) ? 0 : -this.maxHeight
          } else if (deltaY === 0) {  
            this.deltaY = this.lastEndY
          } else if (deltaY < this.maxHeight){ // down
            this.bounce = true
            this.deltaY = deltaY < this.clientHeight * 0.1 ? -this.maxHeight : 0
          } else this.deltaY = 0
        }
        this.lastEndY = this.deltaY
      }
    },

    ontouchstartmodalbody(e) {
      // console.log('modalbody touchstart', type)
      this.bodyLastClientY = e.targetTouches[0].clientY
    },
    ontouchmovemodalbody(e) {
      this.$refs.input.blur()
      // console.log('modalbody touchmove', type)
      this.move = true
      if (!(this.deltaY <= -this.maxHeight && this.bodyOverflow)) return false
      const deltaY = e.targetTouches[0].clientY - this.bodyLastClientY
      this.bodyLastClientY = e.targetTouches[0].clientY
      this.swipeable = !this.bodyOverflow || (deltaY > 0 && this.scrollTop <= 0 && this.deltaY < 0)
      if (!this.swipeable) this.stopBubble(e) 
      else if (this.lastSwipeable === false) this.startClientY = e.targetTouches[0].clientY
      this.lastSwipeable = this.swipeable

      if (this.$route.name === 'Search' && this.$route.params.type && !this.loadMore && deltaY < 0) {
        if (Math.ceil(this.scrollTop + this.$refs.window.offsetHeight) >= this.routerViewHeight) {
          console.log('reach bottom')
          this.$store.commit('search/setLoadMore', true)
        }
      }
    },
    ontouchendmodalbody(e) {
      const deltaY = e.changedTouches[0].clientY - this.bodyLastClientY
      if (this.$route.name === 'Search' && this.$route.params.type && !this.loadMore && deltaY < 0) {
        if (Math.ceil(this.scrollTop + this.$refs.window.offsetHeight) >= this.routerViewHeight) {
          console.log('reach bottom')
          this.$store.commit('search/setLoadMore', true)
        }
      }
    },
    onscrollmodalbody(e) {
      // console.log('scroll')
      this.scrollTop = this.$refs.window.scrollTop
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

    onfocus(e) {
      // console.log('focus')
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
      if (!this.move) {
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
        this.bounce = true
        this.deltaY = 0
        this.lastEndY = this.deltaY
        this.$nextTick(() => {
          this.$store.commit('search/setHistoryComponentHeight', this.$refs.historySearch.$el.offsetHeight)
        })
      }
    },

    scrollModalTo(posY = 0) {
      this.bounce = true
      this.deltaY = posY
      this.lastEndY = this.deltaY
    },

    onChooseKeywordItem(item) {
      this.selectItem(item)
    }
  },
  mounted() {
    // console.log('searchPanel mounted')
    // console.log(this.$refs.text.offsetWidth)
    this.maxHeight = this.clientHeight * 0.9 - this.clientWidth * 0.2
    this.cancelWidth = this.$refs.text.offsetWidth

    if (this.$route.name === 'Search') {
      this.ontouchend()
    }
  },
  watch: {
    text (val) {
      if (val == null) return
      if (!val) {
        // this.$refs.input.blur()
        if (this.$route.name === 'Search')
          this.$router.push({
            name: "Map",
            params: {
              buildingId: this.$route.params.buildingId,
              floorId: this.$route.params.floorId,
            }
          })
        this.$nextTick(() => {
          this.$store.commit('search/setHistoryComponentHeight', this.$refs.historySearch.$el.offsetHeight)
        })
      }
    },
    scrollTop: {
      immediate: true,
      handler: function(val) {
        this.$store.commit('search/setBodyScrollTop', val)
      }
    },
    scrollToFromChild (val) {
      if (typeof val === 'string' && val.indexOf('u') === 0) {
        // console.log(val, parseInt(val.substring(1, val.length)))
        this.$refs.window.scrollTo(0, parseInt(val.substring(1, val.length)))
      }
    },
    $route: {
      immediate: true,
      handler: function(to, from) {
        if (to.name === "Place" || to.name === "Direction") {
          this.scrollModalTo()
        }
        if (to.name === 'Search' && this.text === '' && to.query.q) {
          this.text = decodeURIComponent(to.query.q)
          this.displayCancel = true
        }
      }
    }
  },
}
</script>

<style lang="scss" scoped>
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

  .search-panel {
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

    .search-bar {
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

      .search-bar-scroll {
        margin: 2vw 0 3vw;
        background: #8E8E93;
        width: 10vw;
        height: 1vw;
        border-radius: 0.5vw;
      }

      .search-bar-textarea {
        width: 150vw;
        height: 9vw;
        align-self: flex-start;
        display: flex;
        justify-content: flex-start;
        align-items: center;
        // vertical-align: bottom;

        .search-bar-form {
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

          .search-icon {
            font-size: 6vw !important;
            /* vertical-align: middle; */
            line-height: 7vw;
            text-align: center;
            height: 7vw;
            width: 7vw;
            display: inline-block;
            color: #8E8E8E;
            flex-shrink: 0;
          }

          .search-bar-form-text {
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

        .search-bar-cancel {
          padding: 0 4vw;
          font-size: 5vw;
          display: block;
          color: #0069d9;
        }
      }
    }

    .search-body {
      width: 100vw;
      height: auto;
      padding: 0;
      margin: 0;
      border: none;
      overflow: hidden;
      position: relative;

      &-window {
        width: 100vw;
        position: relative;

        .search-body-page {
          position: relative;
          width: 100vw;
          height: auto;
          
          .search-body-history {
            width: 100vw;
            height: auto;
          }
          
        }
      }
    }
  }
}

.search-more {
  width: 100vw;
  height: auto;
  position: absolute;
  top: 0;
  // padding-top: 10vw;
}
</style>