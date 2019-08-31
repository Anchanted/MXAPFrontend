<template>
  <div class="search-container" ref="container">
    <div v-if="initializing" class="search-loading">
      <spinner-circle></spinner-circle>
    </div>

    <div v-if="dataType === 'building'" class="search-section-items">
      <div v-for="building in itemList" :key="building.id" 
        :style="itemStyle(building.id, 'building')"
        class="search-section-item"
        @touchstart="ontouchstartitem($event, building)"
        @touchmove="ontouchmoveitem"
        @touchend="ontouchenditem">
        <div class="search-section-item-icon">{{building.code}}</div>
        <div class="search-section-item-info">
          <div class="search-section-item-info-name two-line">{{building.name}}</div>
          <div class="search-section-item-info-location one-line">{{itemLocation(building, 'building')}}</div>
        </div>
      </div>
    </div>

    <div v-else-if="dataType === 'room'" class="search-section-items">
      <div v-for="room in itemList" :key="room.id" 
        :style="itemStyle(room.id, 'room')"
        class="search-section-item"
        @touchstart="ontouchstartitem($event, room)"
        @touchmove="ontouchmoveitem"
        @touchend="ontouchenditem">
        <div class="search-section-item-icon">{{room.building_code}}</div>
        <div class="search-section-item-info">
          <div class="search-section-item-info-name one-line">{{room.name}}</div>
          <div class="search-section-item-info-type one-line">{{room.type}}</div>
          <div class="search-section-item-info-location one-line">{{itemLocation(room, 'room')}}</div>
        </div>
      </div>
    </div>

    <div v-else-if="dataType === 'facility'" class="search-section-items">
      <div v-for="facility in itemList" :key="facility.id"
        :style="itemStyle(facility.id, 'facility')"
        class="search-section-item"
        @touchstart="ontouchstartitem($event, facility)"
        @touchmove="ontouchmoveitem"
        @touchend="ontouchenditem">
        <div class="search-section-item-icon">
          <img :src="facilityImage(facility.type)" :alt="facility.type">
        </div>
        <div class="search-section-item-info">
          <div class="search-section-item-info-name one-line">{{facility.name}}</div>
          <div class="search-section-item-info-type one-line">{{facility.type}}</div>
          <div class="search-section-item-info-location one-line">{{itemLocation(facility, 'facility')}}</div>
        </div>
      </div>
    </div>

    <!-- <div v-if="currentPageNo < totalPages - 1" class="search-load">
      Load More...
    </div> -->

    <div v-if="currentPageNo < totalPages - 1" class="search-load">
      <spinner-line></spinner-line>
    </div>

    <!-- <div v-if="roomTotal > 3" class="search-section-items-more"
      @touchstart="ontouchstartmore"
      @touchmove="ontouchmovemore"
      @touchend="ontouchendmore($event, 'building')">
      View More Results
    </div> -->
  </div>
</template>

<script>
import SpinnerCircle from 'components/Spinner/SpinnerCircle'
import SpinnerLine from 'components/Spinner/SpinnerLine'

import floorDict from 'utils/floor.json'
import buildingDict from 'utils/building.json'
import iconPath from 'utils/facilityIconPath.js'

export default {
  props: {
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
  components: {
    SpinnerLine,
    SpinnerCircle
  },
  data() {
    return {
      clientHeight: document.documentElement.clientHeight,
      clientWidth: document.documentElement.clientWidth,
      itemList: [],
      itemSelected: false,
      selectedItem: {},
      moveInItem: false,
      currentPageNo: 0,
      totalPages: 0,
      requesting: false,
      initializing: true,
    }
  },
  computed: {
    searchBodyHeight () {
      return this.clientHeight - 100 - this.clientWidth * 0.2
    },
    facilityImage () {
      return type => iconPath[type]
    },
    itemStyle () {
      return (id, type) => {
        return {
          'background-color': (this.selectedItem.id === id && this.itemSelected) ? '#E6E3DF' : 'transparent'
        }
      }
    },
    itemLocation () {
      return (item, type) => {
        if (type === 'building') return `${buildingDict[item.code]}`
        else return `${floorDict[item.floor_name]}, ${item.building_name}, ${buildingDict[item.building_code]}`
      }
    },
    
  },
  methods: {
    async search() {
      if (!this.requesting) {
        if (this.currentPageNo < this.totalPages - 1) {
          this.requesting = true
          console.log('requesting')
          const url = `/search/${this.dataType}?q=${encodeURIComponent(this.query)}&n=${this.currentPageNo + 1}`
          try {
            const data = await this.$api.search.searchMore(this.dataType, {
              q: encodeURIComponent(this.query),
              n: this.currentPageNo + 1
            })
            console.log(data)
            this.itemList = this.itemList.concat(data.content)
            this.currentPageNo++
            this.requesting = false
            this.$nextTick(() => {
              this.$emit('updateHeight', this.$refs.container.offsetHeight)
            })
          } catch (error) {
            this.$toast({
              message: 'Fail to load data.\nPlease try again.',
              time: 3000
            })
            const length = this.itemList.length
            this.currentPageNo = Math.ceil(length / 10) - 1
            this.requesting = false
            throw (error)
          }
        }
      }
    },

    ontouchstartitem (e, item) {
      // console.log('item touchstart')
      this.selectedItem = item
      this.moveInItem = false
      this.itemSelected = true
    },
    ontouchmoveitem (e) {
      // console.log('item touchmove')
      this.moveInItem = true
      this.itemSelected = false
    },
    ontouchenditem (e) {
      // console.log('item touchend')
      this.itemSelected = false
      if (!this.moveInItem) {
        this.$emit('selectItem', { ...this.selectedItem, dataType: this.dataType })
        this.stopBubble(e)
      }
    },

    stopBubble (e) { 
      if ( e && e.stopPropagation ) e.stopPropagation()
      else window.event.cancelBubble = true
    }, 
  },

  async mounted () {
    try {
      this.requesting = true
      const data = await this.$api.search.searchMore(this.dataType, {
        q: encodeURIComponent(this.query),
        n: this.currentPageNo
      })
      console.log(data)
      this.requesting = false
      this.itemList = this.itemList.concat(data.content)
      this.totalPages = data.totalPages
    } catch (error) {
      this.$toast({
        message: 'Fail to load data.\nPlease try again.',
        time: 3000
      })
      throw error
    } finally {
      this.$nextTick(() => {
        this.$emit('updateHeight', this.$refs.container.offsetHeight)
        this.initializing = false
      })
    }
    
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

  .search-loading {
    width: 100%;
    height: 100vh;
    padding-top: 20vw;
    position: absolute;
    background: #F8F7F2;
    z-index: 150;
  }

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