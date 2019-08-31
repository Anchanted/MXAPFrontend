<template>
  <!-- <div class="search-page" :style="{ top: -top + 'px' }"> -->
    <div class="search-more">
      <div class="search-more-topbar" ref="topbar" @touchend.stop="ontouchendback">
        <div class="iconfont icon-arrow-down search-more-topbar-back"></div>
        <div class="search-more-topbar-info">{{searchTitle}}</div>
      </div>

      <div class="search-body-window" ref="moreWindow" :style="moreWindowStyle"
        @touchstart="ontouchstart"
        @touchmove="ontouchmove"
        @touchend="ontouchend">
        <div class="search-body-page" ref="morePage">
          <search-more ref="moreSearch" 
            :query="query" 
            :dataType="dataType"
            @selectItem="selectItem" 
            @updateHeight="updateMoreHeight"></search-more>
        </div>
      </div>
    </div>
  <!-- </div> -->
</template>

<script>
import floorDict from 'utils/floor.json'
import buildingDict from 'utils/building.json'
import iconPath from 'utils/facilityIconPath.js'

export default {
  props: {
    deltaY: {
      type: Number,
      default: 0,
      required: true,
    },
    query: {
      type: String,
      required: true,
      default: ''
    },
    dataType: {
      type: String,
      required: true,
      default: ''
    }
  },
  data () {
    return {
      clientHeight: document.documentElement.clientHeight,
      clientWidth: document.documentElement.clientWidth,
      lastClientY: 0,
      lastSwipeable: false,
      swipeable: false,
      overflow: false,
    }
  },
  computed: {
    maxHeight () {
      return this.clientHeight - 100 - this.clientWidth * 0.2
    },
    moreWindowStyle () {
      return {
        height: 'calc('+(this.clientHeight - 100) +'px - 20vw - 10vw)', 
        overflow: this.deltaY === -this.maxHeight ? 'auto' : 'hidden'
        // overflow: 'auto'
      }
    },
    searchTitle () {
      const type = this.dataType
      return type ? `"${this.query}" in ${type.charAt(0).toUpperCase()}${type.slice(1)}` : ''
    },
  },
  methods: {
    ontouchstartmodalbody (e, type) {
      // console.log('modalbody touchstart', type)
      this.lastClientY = e.targetTouches[0].clientY
    },
    ontouchmovemodalbody (e, type) {
      // console.log('modalbody touchmove', type)
      if (!(this.deltaY <= -this.maxHeight && this.overflow)) return false
      const deltaY = e.targetTouches[0].clientY - this.lastClientY
      this.lastClientY = e.targetTouches[0].clientY
      this.swipeable = !this.overflow || (deltaY > 0 && this.$refs.moreWindow.scrollTop <= 0 && this.deltaY < 0)
      if (!this.swipeable) this.stopBubble(e) 
      else if (this.lastSwipeable === false) this.startClientY = e.targetTouches[0].clientY
      this.lastSwipeable = this.swipeable
    },

    stopBubble (e) { 
      if ( e && e.stopPropagation ) e.stopPropagation()
      else window.event.cancelBubble = true
    }, 
  },

  async mounted () {
    this.search()
  }
}
</script>

<style lang="scss">
.search-page {
  width: 100vw;
  height: auto;
  position: relative;
  // position: absolute;
  // top: 0;
  z-index: 200;
  background: #F8F7F2;
  // padding-top: 10vw;
}

.search-container {
  width: 100vw;
  height: auto;
  // overflow: scroll;
  position: relative;
  z-index: 200;
  background: #F8F7F2;

  .search-section-items {
    width: 100vw;
    height: auto;
    padding: 0 3vw;

    .search-section-item {
      width: 100%;
      height: auto;
      padding: 2vw 0;
      border-top: 1px #C6C6C6 solid;
      display: flex;
      justify-content: flex-start;

      &:first-child {
        border-top: none;
      }

      &-icon {
        width: 12vw;
        height: 12vw;
        text-align: center;
        vertical-align: middle;
        font-size: 7vw;
        line-height: 12vw;
        font-weight: bold;
        color: #FFFFFF;
        background: blue;
        border-radius: 6vw;
        flex-shrink: 0;
        display: flex;
        justify-content: center;
        align-items: center;

        img {
          width: 7vw;
          height: 7vw;
        }
      }

      &-info {
        width: calc(100% - 12vw - 4vw);
        height: 18vw;
        margin-left: 4vw;
        display: flex;
        flex-direction: column;
        justify-content: space-between;

        &-name {
          font-size: 5vw;
          line-height: 1.2;
          height: 14vw;
          flex-grow: 1;
        }

        &-type {
          font-size: 3.5vw;
          line-height: 1.5;
          color: #8E8E93;
          flex-shrink: 0;
        }

        &-location {
          font-size: 3.5vw;
          line-height: 1.5;
          color: #8E8E93;
          flex-shrink: 0;
        }
      }
    }
  }

  .search-load {
    width: 100%;
    height: auto;
    padding: 2vw 3vw;
    border-top: 1px #C6C6C6 solid;
    font-size: 5vw;
    text-align: center;
  }
}

.one-line {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.two-line {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
</style>