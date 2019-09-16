<template>
  <div style="height: auto; width: 100vw;">
    <div class="search-panel" :style="panelStyle"
      @touchstart="ontouchstart"
      @touchmove="ontouchmove"
      @touchend="ontouchend">
      <div class="search-bar">
        <div class="search-bar-scroll"></div>
        <div class="search-bar-textarea">
          <form class="search-bar-form" action="" :style="formStyle" @submit.prevent="sendQuery">
            <div class="iconfont icon-search search-icon"></div>
            <input v-model="text" class="search-bar-form-text" type="search" placeholder="Find a place" ref="input"
              @focus="onfocus"
              @blur="onblur">
          </form>
          <span class="search-bar-cancel" ref="text" @touchend.stop="ontouchendcancel">Cancel</span>
        </div>
      </div>

      <div class="search-body">

        <div class="search-body-window" ref="indexWindow" :style="windowStyle" 
          @touchstart="ontouchstartmodalbody($event, 'index')"
          @touchmove="ontouchmovemodalbody($event, 'index')">
          <div class="search-body-page" ref="indexPage">
            <search-history v-show="!doSearch" ref="historySearch" 
              @selectItem="selectItem"
              @updateHeight="updateHistoryHeight"></search-history>
            <search-top v-show="doSearch" ref="topSearch"
              @selectItem="selectItem"
              @getMoreResults="searchMore" 
              @updateHeight="updateTopHeight"></search-top>
            <!-- <transition name="search-more">
              <search-more v-show="doSearch && displayMoreResult" :top="topHeight" ref="moreSearch"></search-more>
            </transition> -->
          </div>
        </div>

        <!-- <transition name="search-more">
          <div v-if="doSearch && displayMoreResult" class="search-more">
            <div class="search-more-topbar" ref="topbar" @touchend.stop="ontouchendback">
              <div class="iconfont icon-arrow-down search-more-topbar-back"></div>
              <div class="search-more-topbar-info">{{searchTitle}}</div>
            </div>

            <div class="search-body-window" ref="moreWindow" :style="moreWindowStyle"
              @touchstart="ontouchstartmodalbody($event, 'more')"
              @touchmove="ontouchmovemodalbody($event, 'more')"
              @touchend="ontouchendmodalbody">
              <div class="search-body-page" ref="morePage">
                <search-more ref="moreSearch" 
                  :query="query" 
                  :dataType="moreType"
                  @selectItem="selectItem" 
                  @updateHeight="updateMoreHeight"></search-more>
              </div>
            </div>
          </div>
        </transition> -->

      </div>
    </div>
  </div>
</template>

<script>
import SearchHistory from 'views/Search/SearchHistory'
import SearchTop from 'views/Search/SearchTop'
import SearchMore from 'views/Search/SearchMore'

import vm from 'utils/eventBus'

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
    SearchTop,
    SearchMore
  },
  data() {
    return {
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
      bodyOverflow: false,
      text: '',
      displayCancel: false,
      cancelWidth: 0,
      query: '',
      doSearch: false,
      displayMoreResult: false,
      moreType: '',
      moreHeight: 0,
    }
  },
  computed: {
    ...mapState({
      clientHeight: state => state.clientHeight,
      clientWidth: state => state.clientWidth,
      bodyHeight: state => state.search.bodyHeight,
      maxHeight: state => state.search.maxHeight
    }),
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
    windowStyle () {
      return {
        height: 'calc('+(this.clientHeight - 100) +'px - 20vw)', 
        overflow: this.deltaY === -this.maxHeight ? 'auto' : 'hidden'
        // overflow: 'auto'
      }
    },
    // moreWindowStyle () {
    //   return {
    //     height: 'calc('+(this.clientHeight - 100) +'px - 20vw - 10vw)', 
    //     overflow: this.deltaY === -this.maxHeight ? 'auto' : 'hidden'
    //     // overflow: 'auto'
    //   }
    // },
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
      this.displayMoreResult = false
      const value = this.text
      this.$refs.input.blur()
      this.query = value
      this.text = value
      this.saveHistory({ content: value, dataType: 'query' })
      this.$refs.topSearch.search(this.query)
      this.$refs.indexWindow.scrollTo(0,0)
    },

    saveHistory (item) {
      let historyList = JSON.parse(localStorage.getItem('historyList')) || []
      // console.log(historyList)
      if (!(historyList instanceof Array)) historyList = []
      // if (historyList.length >= 20) historyList.pop()
      let duplicatedIndex = -1

      historyList.some((element, index) => {
        if (element.dataType === item.dataType) {
          if (item.dataType === 'query') {
            if (element.content === item.content) {
              duplicatedIndex = index
              return true
            }
          } else if (element.id === item.id) {
            duplicatedIndex = index
            return true
          }
        }
      })
      
      if (duplicatedIndex > -1) historyList.splice(duplicatedIndex, 1)
      historyList = [item].concat(historyList)
      if (historyList.length > 20) historyList.splice(20, historyList.length - 20)
      
      console.log(historyList)
      localStorage.setItem('historyList', JSON.stringify(historyList))
    },

    selectItem (item) {
      console.log(item)
      let redirect = true
      switch (item.dataType) {
        case 'building':
          this.saveHistory(item)
          if (this.$route.path === '/') {
            this.getItemInfoToMap(item.dataType, item.id)
          } else {
            this.$router.push({
              path: '/',
              query: {
                buildingId: item.id
              }
            })
          }
          break;

        case 'room':
          this.saveHistory(item)
          if (this.$route.path === '/building') {
            if (item.building_id === parseInt(this.$route.query.buildingId)) {
              const floorId = this.$route.query.floorId || this.currentFloorId
              if (floorId && item.floor_id === parseInt(floorId)) redirect = false
            }
          }
          if (!redirect) {
            this.getItemInfoToMap(item.dataType, item.id)
          } else {
            this.$router.push({
              path: '/building',
              query: {
                buildingId: item.building_id,
                floorId: item.floor_id,
                roomId: item.id
              }
            })
          }
          break;

        case 'facility': 
          this.saveHistory(item)
          if (this.$route.path === '/building') {
            if (item.building_id === parseInt(this.$route.query.buildingId)) {
              const floorId = this.$route.query.floorId || this.currentFloorId
              if (floorId && item.floor_id === parseInt(floorId)) redirect = false
            }
          }
          if (!redirect) {
            this.getItemInfoToMap(item.dataType, item.id)
          } else {
            this.$router.push({
              path: '/building',
              query: {
                buildingId: item.building_id,
                floorId: item.floor_id,
                facilityId: item.id
              }
            })
          }
          break;

        case 'query':
          this.text = item.content
          this.sendQuery()
          break;
      }
    },

    getItemInfoToMap (type, id) {
      this.bounce = true
      this.deltaY = 0
      this.lastEndY = this.deltaY
      // this.doSearch = false
      // this.displayMoreResult = false
      this.$emit('getItemInfo', type, id)
    },

    searchMore (type) {
      this.moreType = type
      this.displayMoreResult = true

      this.$nextTick(() => {
        this.$refs.moreWindow.scrollTo(0,0)
      })

    },

    updateHistoryHeight (height) {
      console.log(height, this.$refs.indexWindow.offsetHeight)
      if (!this.doSearch) this.bodyOverflow = height > this.$refs.indexWindow.offsetHeight
    },

    updateTopHeight (height) {
      console.log(height, this.$refs.indexWindow.offsetHeight)
      if (this.doSearch && !this.displayMoreResult) this.bodyOverflow = height > this.$refs.indexWindow.offsetHeight
    },

    updateMoreHeight (height) {
      console.log(height, this.$refs.moreWindow.offsetHeight)
      this.moreHeight = height
      if (this.doSearch && this.displayMoreResult) this.bodyOverflow = height > this.$refs.moreWindow.offsetHeight
    },

    hideMorePage () {
      this.bodyOverflow = this.$refs.indexPage.offsetHeight > this.$refs.indexWindow.offsetHeight
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

    touchShade () {
      this.$refs.input.blur()
      this.bounce = true
      this.deltaY = 0
      this.lastEndY = this.deltaY
    },

    ontouchstartmodalbody (e, type) {
      // console.log('modalbody touchstart', type)
      this.bodyLastClientY = e.targetTouches[0].clientY
    },
    ontouchmovemodalbody (e, type) {
      // console.log('modalbody touchmove', type)
      this.move = true
      // console.log(`${this.deltaY <= -this.maxHeight} && ${this.bodyOverflow}`)
      if (!(this.deltaY <= -this.maxHeight && this.bodyOverflow)) return false
      const deltaY = e.targetTouches[0].clientY - this.bodyLastClientY
      this.bodyLastClientY = e.targetTouches[0].clientY
      if (!this.displayMoreResult) this.swipeable = !this.bodyOverflow || (deltaY > 0 && this.$refs.indexWindow.scrollTop <= 0 && this.deltaY < 0)
      else this.swipeable = !this.bodyOverflow || (deltaY > 0 && this.$refs.moreWindow.scrollTop <= 0 && this.deltaY < 0)
      if (!this.swipeable) this.stopBubble(e) 
      else if (this.lastSwipeable === false) this.startClientY = e.targetTouches[0].clientY
      this.lastSwipeable = this.swipeable

      if (this.doSearch && this.displayMoreResult && deltaY < 0) {
        if (this.$refs.moreWindow.scrollTop + this.$refs.moreWindow.offsetHeight >= this.moreHeight) {
          console.log('reach bottom')
          this.$refs.moreSearch.search()
        }
      }
    },
    ontouchendmodalbody (e) {
      const deltaY = e.changedTouches[0].clientY - this.bodyLastClientY
      if (this.doSearch && this.displayMoreResult && deltaY < 0) {
        if (this.$refs.moreWindow.scrollTop + this.$refs.moreWindow.offsetHeight >= this.moreHeight) {
          console.log('reach bottom')
          this.$refs.moreSearch.search()
        }
      }
    },
    onscroll (e, type) {
      // console.log('scroll', type)
      // console.log(this.$refs.indexWindow.scrollTop, this.$refs.moreWindow.scrollTop)
      console.log(this.$refs.moreWindow.scrollTop)
    },

    onfocus (e) {
      // console.log('focus')
      this.displayCancel = true
    },
    onblur (e) {
      console.log('blur')
      // this.displayCancel = false
      // this.$refs.input.blur()
      // this.text = ''
    },
    ontouchendcancel (e) {
      if (!this.move) {
        this.displayCancel = false
        this.doSearch = false
        this.displayMoreResult = false
        this.$refs.input.blur()
        this.text = ''
        this.bounce = true
        this.deltaY = 0
        this.lastEndY = this.deltaY
      }
    },
    ontouchendback (e) {
      if (!this.move) {
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
  watch: {
    text (val) {
      if (val === '') {
        // this.$refs.input.blur()
        this.doSearch = false
        this.displayMoreResult = false
      }
    }
  }
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
          line-height: 1.2;
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
}

.search-more {
  width: 100vw;
  height: auto;
  position: absolute;
  top: 0;
  // padding-top: 10vw;
}

.search-more-topbar {
  width: 100vw;
  height: auto;
  // position: absolute;
  // top: 0;
  background: #F8F7F2;
  display: flex;
  justify-content: flex-start;
  border-bottom: 1px #C6C6C6 solid;
  z-index: 300;

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

.search-more-enter-active {
  transition: transform .2s linear;
}
.search-more-leave-active {
  transition: transform .2s linear;
}
.search-more-enter, .search-more-leave-to {
  transform: translateX(100vw);
}
.search-more-enter-to, .search-more-leave {
  transform: translateX(0px);
}
</style>