<template>
  <div>
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

      <div class="search-body" ref="body" :style="bodyStyle" 
        @touchstart="ontouchstartmodalbody"
        @touchmove="ontouchmovemodalbody">
        <div class="search-body-info" ref="bodyInfo">
          <div v-if="buildingTotal > 0" class="search-result-section">
            <div class="search-result-section-type">Building</div>
            <div class="search-result-section-items">
              <div v-for="building in topBuildingList" :key="building.id" 
                :style="itemStyle(building.id, 'building')"
                class="search-result-section-item"
                @touchstart="ontouchstartitem($event, building, 'building')"
                @touchmove="ontouchmoveitem"
                @touchend="ontouchenditem">
                <div class="search-result-section-item-icon">{{building.code}}</div>
                <div class="search-result-section-item-info">
                  <div class="search-result-section-item-info-name">{{building.name}}</div>
                  <div class="search-result-section-item-info-location">{{itemLocation(building, 'building')}}</div>
                </div>
              </div>
              <div v-if="buildingTotal > 3" class="search-result-section-items-more">
                View More Results
              </div>
            </div>
          </div>
          <div v-if="roomTotal > 0" class="search-result-section">
            <div class="search-result-section-type">Room</div>
            <div class="search-result-section-items">
              <div v-for="room in topRoomList" :key="room.id" 
                :style="itemStyle(room.id, 'room')"
                class="search-result-section-item"
                @touchstart="ontouchstartitem($event, room, 'room')"
                @touchmove="ontouchmoveitem"
                @touchend="ontouchenditem">
                <div class="search-result-section-item-icon">{{room.building_code}}</div>
                <div class="search-result-section-item-info">
                  <div class="search-result-section-item-info-name">{{room.name}}</div>
                  <div class="search-result-section-item-info-type">{{room.type}}</div>
                  <div class="search-result-section-item-info-location">{{itemLocation(room, 'room')}}</div>
                </div>
              </div>
              <div v-if="roomTotal > 3" class="search-result-section-items-more">
                View More Results
              </div>
            </div>
          </div>
          <div v-if="facilityTotal > 0" class="search-result-section">
            <div class="search-result-section-type">Facility</div>
            <div class="search-result-section-items">
              <div v-for="facility in topFacilityList" :key="facility.id"
                :style="itemStyle(facility.id, 'facility')"
                class="search-result-section-item"
                @touchstart="ontouchstartitem($event, facility, 'facility')"
                @touchmove="ontouchmoveitem"
                @touchend="ontouchenditem">
                <div class="search-result-section-item-icon">
                  <img :src="facilityImage(facility.type)" :alt="facility.type">
                </div>
                <div class="search-result-section-item-info">
                  <div class="search-result-section-item-info-name">{{facility.name}}</div>
                  <div class="search-result-section-item-info-type">{{facility.type}}</div>
                  <div class="search-result-section-item-info-location">{{itemLocation(facility, 'facility')}}</div>
                </div>
              </div>
              <div v-if="facilityTotal > 3" class="search-result-section-items-more">
                View More Results
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import iconPath from 'utils/facilityIconPath.js'
import floorDict from 'utils/floor.json'
import buildingDict from 'utils/building.json'
import vm from 'utils/eventBus'
import baseFloor from 'utils/baseFloor.json'

export default {
  props: {
    currentFloorId: {
      type: Number
    }
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
      moveInItem: false,
      bodyOverflow: false,
      text: '',
      displayCancel: false,
      cancelWidth: 0,
      topBuildingList: [],
      topRoomList: [],
      topFacilityList: [],
      buildingTotal: 0,
      roomTotal: 0,
      facilityTotal: 0,
      itemSelected: false,
      selectedItem: {},
      selectedItemType: '',
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
    itemStyle () {
      return (id, type) => {
        return {
          'background-color': (this.selectedItem.id === id && this.selectedItemType === type && this.itemSelected) ? '#E6E3DF' : 'transparent'
        }
        
      }
    },
    facilityImage () {
      return type => iconPath[type]
    },
    itemLocation () {
      return (item, type) => {
        if (type === 'building') return `${buildingDict[item.code]}`
        else return `${floorDict[item.floor_name]}, ${item.building_name}, ${buildingDict[item.building_code]}`
      }
    }
  },
  methods: {
    async sendQuery () {
      console.log(this.text)
      console.log(encodeURIComponent(this.text))
      const url = `/search/?q=${encodeURIComponent(this.text)}`
      const data = await this.$api.get(url)
      console.log(data)
      this.topBuildingList = data.building.data
      this.buildingTotal = data.building.total
      this.topRoomList = data.room.data
      this.roomTotal = data.room.total
      this.topFacilityList = data.facility.data
      this.facilityTotal = data.facility.total

      this.bounce = true
      this.$nextTick(() => this.bodyOverflow = this.$refs.bodyInfo.offsetHeight > this.$refs.body.offsetHeight)
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

    ontouchstartmodalbody (e) {
      // console.log('modalbody touchstart')
      this.bodyLastClientY = e.targetTouches[0].clientY
    },
    ontouchmovemodalbody (e) {
      // console.log('modalbody touchmove')
      this.move = true
      // console.log(`${this.deltaY <= -this.maxHeight} && ${this.bodyOverflow}`)
      if (!(this.deltaY <= -this.maxHeight && this.bodyOverflow)) return false
      const deltaY = e.targetTouches[0].clientY - this.bodyLastClientY
      this.bodyLastClientY = e.targetTouches[0].clientY
      this.swipeable = !this.bodyOverflow || (deltaY > 0 && this.$refs.body.scrollTop <= 0 && this.deltaY < 0)
      if (!this.swipeable) this.stopBubble(e) 
      else if (this.lastSwipeable === false) this.startClientY = e.targetTouches[0].clientY
      this.lastSwipeable = this.swipeable
    },

    ontouchstartitem (e, item, type) {
      // console.log('item touchstart')
      this.selectedItem = item
      this.selectedItemType = type
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
        switch (this.selectedItemType) {
          case 'building':
            if (this.$route.path === '/') {
              this.bounce = true
              this.deltaY = 0
              this.lastEndY = this.deltaY
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
              this.bounce = true
              this.deltaY = 0
              this.lastEndY = this.deltaY
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
              this.bounce = true
              this.deltaY = 0
              this.lastEndY = this.deltaY
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
      if (!this.move) this.displayCancel = false
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
  position: fixed;
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
      padding: 2vw 0;
      width: 100vw;
      height: auto;
      display: flex;
      flex-direction: column;

      .search-result-section {
        width: 100%;
        height: auto;
        padding: 0 3vw;
        line-height: 1;
        border-bottom: 1px #C6C6C6 solid;
        
        &-type {
          font-size: 6vw;
          font-weight: bold;
          line-height: 1.5;
          vertical-align: middle;
        }

        &-items {
          width: 100%;
          height: auto;

          .search-result-section-item {
            width: 100%;
            height: auto;
            padding: 2vw 0;
            border-top: 1px #C6C6C6 solid;
            display: flex;
            justify-content: flex-start;

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
    }
  }
}

</style>