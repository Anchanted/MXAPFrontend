<template>
  <div style="height: auto; width: 100vw;">
    <div v-show="deltaY < 0" class="shade" :style="shadeStyle" 
      @touchstart.stop="ontouchstartshade"
      @touchmove.stop="ontouchmoveshade"
      @touchend.stop="ontouchendshade"></div>
    <div class="search-panel" :style="panelStyle"
      @touchstart="ontouchstart"
      @touchmove="ontouchmove"
      @touchend="ontouchend">
      <div class="search-bar">
        <div class="search-bar-scroll"></div>
        <div class="search-bar-textarea">
          <form class="search-bar-form" action="" :style="formStyle" @submit.prevent="sendQuery">
            <div class="iconfont icon-search search-icon"></div>
            <input v-model="text" class="search-bar-form-text" type="search" placeholder="Find a place"
              @focus="onfocus"
              @blur="onblur">
          </form>
          <span class="search-bar-cancel" ref="text" @touchend.stop="ontouchendcancel">Cancel</span>
        </div>
      </div>

      <div style="position: relative">

        <div class="search-body" ref="body" :style="bodyStyle" 
          @touchstart="ontouchstartmodalbody($event, 'index')"
          @touchmove="ontouchmovemodalbody($event, 'index')">
          <div class="search-body-info" ref="bodyInfo">
            <search-history v-show="!doSearch"></search-history>
            <search-top v-show="doSearch" @getItemInfo="getItemInfoToMap" @getMoreResults="searchMore" @updateHeight="updateIndexHeight" ref="topSearch"></search-top>
            <!-- <search-more v-show="doSearch && displayMoreResult" :top="topHeight" ref="moreSearch"></search-more> -->
          </div>
        </div>

        <div v-show="doSearch && displayMoreResult" class="search-page">
          <div class="search-page-topbar" ref="topbar">
            <div class="iconfont icon-arrow-down search-page-topbar-back"></div>
            <div class="search-page-topbar-info">{{searchTitle}}</div>
          </div>

          <div class="search-body" ref="morebody" :style="morebodyStyle" 
            @touchstart="ontouchstartmodalbody($event, 'more')"
            @touchmove="ontouchmovemodalbody($event, 'more')">
            <div class="search-body-info" ref="morebodyInfo">
              <search-more :top="topHeight" @updateHeight="updateMoreHeight" ref="moreSearch"></search-more>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  </div>
</template>

<script>
import SearchHistory from 'views/Search/SearchHistory'
import SearchTop from 'views/Search/SearchTop'
import SearchMore from 'views/Search/SearchMore'

import vm from 'utils/eventBus'

export default {
  props: {
    currentFloorId: {
      type: Number
    }
  },
  components: {
    SearchHistory,
    SearchTop,
    SearchMore
  },
  data() {
    return {
      clientHeight: document.documentElement.clientHeight,
      clientWidth: document.documentElement.clientWidth,
      startClientY: 0,
      deltaY: 0,
      lastEndY: 0,
      move: false,
      bounce: false,
      // scrollable: false,
      bodyLastClientY: 0,
      lastSwipeable: false,
      swipeable: false,
      // scrollTop: 0,
      moveInShade: false,
      moveFormScrollToSwipe: false,
      bodyOverflow: false,
      text: '',
      displayCancel: false,
      cancelWidth: 0,
      query: '',
      doSearch: false,
      displayMoreResult: false,
      topHeight: 0,
      moreType: null,
    }
  },
  computed: {
    maxHeight () {
      return this.clientHeight - 100 - this.clientWidth * 0.2
    },
    shadeStyle () {
      return {
        opacity: 1 / (-this.maxHeight * 3) * this.deltaY
      }
    },
    panelStyle () {
      return {
        top: `calc(${this.clientHeight}px - 20vw)`,
        transition: this.bounce ? 'transform .5s' : '',
        transform: `translateY(${this.deltaY}px)`
      }
    },
    formStyle () {
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
    // textStyle () {
    //   return {
    //     width: '100%'
    //   }
    // },
    bodyStyle () {
      return {
        height: 'calc('+(this.clientHeight - 100) +'px - 20vw)', 
        overflow: this.deltaY === -this.maxHeight ? 'auto' : 'hidden'
        // overflow: 'auto'
      }
    },
    morebodyStyle () {
      return {
        height: 'calc('+(this.clientHeight - 100) +'px - 20vw - 10vw)', 
        overflow: this.deltaY === -this.maxHeight ? 'auto' : 'hidden'
        // overflow: 'auto'
      }
    },
    searchTitle () {
      const type = this.moreType
      return type ? `"${this.query}" in ${type.charAt(0).toUpperCase()}${type.slice(1)}` : ''
    },
  },
  methods: {
    sendQuery () {
      console.log(this.text)
      console.log(encodeURIComponent(this.text))
      this.doSearch = true
      this.query = this.text
      console.log(this.$refs.topSearch)
      this.$refs.topSearch.search(this.query)
      
      this.$nextTick(() => {
        if (!this.displayMoreResult) this.bodyOverflow = this.$refs.bodyInfo.offsetHeight > this.$refs.body.offsetHeight
        // this.$refs.topSearch.$el.updateHeight()
        // this.topHeight = this.$refs.topSearch.$el.offsetHeight
        // console.log(this.topHeight)
        else this.bodyOverflow = this.$refs.morebodyInfo.offsetHeight > this.$refs.morebody.offsetHeight
        console.log(this.$refs.bodyInfo.offsetHeight, this.$refs.body.offsetHeight)
      })
    },

    getItemInfoToMap (type, id) {
      this.bounce = true
      this.deltaY = 0
      this.lastEndY = this.deltaY
      this.$emit('getItemInfo', type, id)
    },

    searchMore (type) {
      this.moreType = type
      console.log(this.moreType)
      this.displayMoreResult = true
      this.$refs.moreSearch.search(this.query, type)

      this.$nextTick(() => {
        if (!this.displayMoreResult) this.bodyOverflow = this.$refs.bodyInfo.offsetHeight > this.$refs.body.offsetHeight
        // this.topHeight = this.$refs.topSearch.$el.offsetHeight
        else this.bodyOverflow = this.$refs.morebodyInfo.offsetHeight > this.$refs.morebody.offsetHeight
      })
    },

    updateIndexHeight (height) {
      this.topHeight = height
      console.log(this.topHeight)
      this.bodyOverflow = height > this.$refs.body.offsetHeight
    },

    updateMoreHeight (height) {
      console.log(height, this.$refs.morebody.offsetHeight)
      this.bodyOverflow = height > this.$refs.morebody.offsetHeight
    },

    ontouchstart (e) {
      // console.log('modal touchstart')
      this.bounce = false
      this.lastEndY = this.deltaY
      this.shade = true
      this.move = false
      this.startClientY = e.targetTouches[0].clientY
    },
    ontouchmove (e) {
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
    ontouchend (e) {
      // console.log('modal touchend')
      this.bounce = false
      if (!this.move) { // click
        if (this.deltaY === 0) {
          this.bounce = true
          this.deltaY = -this.maxHeight
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
    },

    ontouchstartshade (e) {
      this.moveInShade = false
    },
    ontouchmoveshade (e) {
      this.moveInShade = true
    },
    ontouchendshade (e) {
      if (!this.moveInShade) {
        this.bounce = true
        this.deltaY = 0
        this.lastEndY = this.deltaY
      }
    },

    ontouchstartmodalbody (e, type) {
      console.log('modalbody touchstart', type)
      this.bodyLastClientY = e.targetTouches[0].clientY
    },
    ontouchmovemodalbody (e, type) {
      console.log('modalbody touchmove', type)
      this.move = true
      console.log(`${this.deltaY <= -this.maxHeight} && ${this.bodyOverflow}`)
      if (!(this.deltaY <= -this.maxHeight && this.bodyOverflow)) return false
      const deltaY = e.targetTouches[0].clientY - this.bodyLastClientY
      this.bodyLastClientY = e.targetTouches[0].clientY
      this.swipeable = !this.bodyOverflow || (deltaY > 0 && this.$refs.body.scrollTop <= 0 && this.deltaY < 0)
      if (!this.swipeable) this.stopBubble(e) 
      else if (this.lastSwipeable === false) this.startClientY = e.targetTouches[0].clientY
      this.lastSwipeable = this.swipeable
    },

    onfocus (e) {
      // console.log('focus')
      this.displayCancel = true
    },
    onblur (e) {
      // console.log('blur')
      // this.displayCancel = false
      this.text = ''
    },
    ontouchendcancel (e) {
      if (!this.move) {
        this.displayCancel = false
        this.doSearch = false
        this.displayMoreResult = false
      }
    },
    stopBubble (e) { 
      if ( e && e.stopPropagation ) e.stopPropagation()
      else window.event.cancelBubble = true
    }, 
  },
  mounted () {
    // console.log(this.$refs.text.offsetWidth)
    this.cancelWidth = this.$refs.text.offsetWidth
  },
}
</script>

<style lang="scss" scoped>
.shade
{
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #000000;
}

.search-panel {
  overflow: hidden;
  // position: fixed;
  width: 100vw;
  height: 100vh;
  background: #F8F7F2;
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
    background: #F8F7F2;
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
          color: #8E8E93;
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
          line-height: 7vw;
          /* margin: 7vw; */
        }
      }

      .search-bar-cancel {
        padding: 0 4vw;
        font-size: 5vw;
        display: block;
        color: blue;
      }
    }
  }

  .search-body {
    width: 100vw;
    overflow-x: hidden;

    &-info {
      // padding: 2vw 3vw;
      position: relative;
      // padding: 2vw 0;
      width: 100vw;
      height: auto;
      
      .search-body-history {
        width: 100vw;
        height: auto;
      }
      
    }
  }
}

.search-page {
  width: 100vw;
  height: auto;
  position: absolute;
  top: 0;
  // padding-top: 10vw;
}

.search-page-topbar {
  width: 100vw;
  height: auto;
  // position: absolute;
  // top: 0;
  background: #F8F7F2;
  display: flex;
  justify-content: flex-start;
  border-bottom: 1px #C6C6C6 solid;
  z-index: 350;

  &-back {
    width: 10vw;
    height: 10vw;
    font-size: 6vw !important;
    line-height: 10vw;
    text-align: center;
    transform: rotate(90deg);
    // background: red;
    flex-shrink: 0;
  }

  &-info {
    width: auto;
    height: 10vw;
    font-size: 5vw;
    line-height: 2;
    flex-grow: 1;
    margin-right: 10vw;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

}

</style>