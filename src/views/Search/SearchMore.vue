<template>
  <!-- <div class="search-page" :style="{ top: -top + 'px' }"> -->
    
    <div class="search-page-body" :style="bodyStyle" ref="container">
      <div ref="scrollBody">
        <div v-if="type === 'building'" class="search-section-items">
          <div v-for="building in itemList" :key="building.id" 
            :style="itemStyle(building.id, 'building')"
            class="search-section-item"
            @touchstart="ontouchstartitem($event, building, 'building')"
            @touchmove="ontouchmoveitem"
            @touchend="ontouchenditem">
            <div class="search-section-item-icon">{{building.code}}</div>
            <div class="search-section-item-info">
              <div class="search-section-item-info-name">{{building.name}}</div>
              <div class="search-section-item-info-location">{{itemLocation(building, 'building')}}</div>
            </div>
          </div>
        </div>

        <div v-else-if="type === 'room'" class="search-section-items">
          <div v-for="room in itemList" :key="room.id" 
            :style="itemStyle(room.id, 'room')"
            class="search-section-item"
            @touchstart="ontouchstartitem($event, room, 'room')"
            @touchmove="ontouchmoveitem"
            @touchend="ontouchenditem">
            <div class="search-section-item-icon">{{room.building_code}}</div>
            <div class="search-section-item-info">
              <div class="search-section-item-info-name">{{room.name}}</div>
              <div class="search-section-item-info-type">{{room.type}}</div>
              <div class="search-section-item-info-location">{{itemLocation(room, 'room')}}</div>
            </div>
          </div>
        </div>

        <div v-else-if="type === 'facility'" class="search-section-items">
          <div v-for="facility in itemList" :key="facility.id"
            :style="itemStyle(facility.id, 'facility')"
            class="search-section-item"
            @touchstart="ontouchstartitem($event, facility, 'facility')"
            @touchmove="ontouchmoveitem"
            @touchend="ontouchenditem">
            <div class="search-section-item-icon">
              <img :src="facilityImage(facility.type)" :alt="facility.type">
            </div>
            <div class="search-section-item-info">
              <div class="search-section-item-info-name">{{facility.name}}</div>
              <div class="search-section-item-info-type">{{facility.type}}</div>
              <div class="search-section-item-info-location">{{itemLocation(facility, 'facility')}}</div>
            </div>
          </div>
        </div>

        <!-- <div v-if="roomTotal > 3" class="search-section-items-more"
          @touchstart="ontouchstartmore"
          @touchmove="ontouchmovemore"
          @touchend="ontouchendmore($event, 'building')">
          View More Results
        </div> -->
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
    top: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      clientHeight: document.documentElement.clientHeight,
      clientWidth: document.documentElement.clientWidth,
      query: null,
      type: null,
      itemList: [],
      itemSelected: false,
      selectedItem: {},
      moveInItem: false,
    }
  },
  computed: {
    searchBodyHeight () {
      return this.clientHeight - 100 - this.clientWidth * 0.2
    },
    bodyStyle () {
      return {
        // height: 'calc('+(this.clientHeight - 100) +'px - 20vw)', 
        // top: this.top,
        // overflow: this.deltaY === -this.maxHeight ? 'auto' : 'hidden'
        // overflow: 'auto'
      }
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
    async search(query, type) {
      console.log(this.top)
      this.query = query
      this.type = type
      if (query && query.trim() !== '') {
        const url = `/search/${this.type}?q=${encodeURIComponent(this.query)}&n=0`
        const data = await this.$api.get(url)
        console.log(data)
        this.itemList = data.content
        this.type = data.type
        // console.log(this.top)
        // this.$nextTick(() => {
        //   console.log(this.top)
        // })
      }
      this.$nextTick(() => {
        this.$emit('updateHeight', this.$refs.container.offsetHeight)
      })
    },

    ontouchstartitem (e, item, type) {
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
      let redirect = true
      if (!this.moveInItem) {
        switch (this.type) {
          case 'building':
            if (this.$route.path === '/') {
              this.stopBubble(e)
              this.$emit('getItemInfo', 'building', this.selectedItem.id)
            } else {
              this.$router.push({
                path: '/',
                query: {
                  buildingId: this.selectedItem.id
                }
              })
            }
            break;

          case 'room':
            if (this.$route.path === '/building') {
              if (this.selectedItem.building_id === parseInt(this.$route.query.buildingId)) {
                const floorId = this.$route.query.floorId || this.currentFloorId
                if (floorId && this.selectedItem.floor_id === parseInt(floorId)) redirect = false
              }
            }
            if (!redirect) {
              this.stopBubble(e)
              this.$emit('getItemInfo', 'room', this.selectedItem.id)
            } else {
              this.$router.push({
                path: '/building',
                query: {
                  buildingId: this.selectedItem.building_id,
                  floorId: this.selectedItem.floor_id,
                  roomId: this.selectedItem.id
                }
              })
            }
            break;

          case 'facility': 
            if (this.$route.path === '/building') {
              if (this.selectedItem.building_id === parseInt(this.$route.query.buildingId)) {
                const floorId = this.$route.query.floorId || this.currentFloorId
                if (floorId && this.selectedItem.floor_id === parseInt(floorId)) redirect = false
              }
            }
            if (!redirect) {
              this.stopBubble(e)
              this.$emit('getItemInfo', 'room', this.selectedItem.id)
            } else {
              this.$router.push({
                path: '/building',
                query: {
                  buildingId: this.selectedItem.building_id,
                  floorId: this.selectedItem.floor_id,
                  facilityId: this.selectedItem.id
                }
              })
            }
            break;
        }
      }
    },

    stopBubble (e) { 
      if ( e && e.stopPropagation ) e.stopPropagation()
      else window.event.cancelBubble = true
    }, 
  },
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

.search-page-body {
  width: 100vw;
  // overflow: scroll;
  position: relative;

  .search-section-items {
    width: 100vw;
    height: auto;
    padding: 0 3vw 2vw;

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
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
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
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }

    &-more {
      width: 100%;
      height: auto;
      padding: 2vw 0;
      border-top: 1px #C6C6C6 solid;
      font-size: 5vw;
      color: blue;
      text-align: center;
      line-height: 1.5;
    }
  }
}
</style>