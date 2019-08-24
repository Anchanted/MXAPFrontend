<template>
  <div>
    <div v-show="deltaY < 0" class="shade" :style="shadeStyle"
      @touchstart.stop="ontouchstartshade"
      @touchmove.stop="ontouchmoveshade"
      @touchend.stop="ontouchendshade"></div>
    <div class="modal-container" :style="modalStyle" 
      @touchstart="ontouchstart"
      @touchmove="ontouchmove"
      @touchend="ontouchend">
      <div class="modal-scroll"></div>

      <div class="modal-header">
        <div class="modal-header-view" :style="{background: headerBackground, opacity: displayHeader ? 1 : 0}">
          <div class="modal-header-name">
            {{item.name}}
          </div>
          <div class="iconfont icon-close modal-close" @touchend="ontouchendclose"></div>
        </div>
      </div>
      
      <!-- <div v-show="!scrollable" class="modal-body-cover"></div> -->

      <div class="modal-display" :style="modalDisplayStyle" ref="modalDisplay" 
        @touchstart="ontouchstartmodalbody"
        @touchmove="ontouchmovemodalbody"
        @touchend="ontouchendmodalbody"
        @scroll="onscrollmodalbody">
        <div class="modal-body" :style="bodyScrollToBottomStyle" ref="modalBody">
          <div class="modal-info">
            <!-- <div class="modal-basic"> -->
            <div class="modal-info-basic">
              <div class="modal-info-basic-name" :style="{color: displayHeader ? 'red' : 'black'}">
                {{item.name}}
              </div>
              <div class="modal-info-basic-type">{{itemType}}</div>
              <div class="modal-info-basic-location">{{itemLocation}}</div>
            </div>
            <div class="iconfont icon-close modal-close" :style="{opacity: displayHeader ? 0 : 1}" @touchend="ontouchendclose"></div>
          </div>

          <router-link v-if="item.dataType === 'building'" class="modal-indoor" tag="button" :to="{ path: '/building', query: { buildingId: item.id || 1} }">
            VIEW MAPS IN THIS BUILDING
          </router-link>

          <div class="modal-image" v-if="item.imgUrl" :style="{'background-image': 'url('+baseUrl+item.imgUrl+')'}">
            <!-- <img src="" alt=""> -->
          </div>

          <div v-show="item.dataType === 'room'" class="modal-timetable">
            <timetable ref="timetable" :lessons="lessonList" :modalMove="move"></timetable>
          </div>
        </div>
      </div>
      <!-- <div v-show="!scrollable" class="modal-body-cover" @touchstart.stop="ontouchstartcover" @touchmove.stop @touchstop.stop></div> -->
      
    </div>
  </div>
</template>

<script>
import buildingDict from 'utils/building.json'
import floorDict from 'utils/floor.json'
import vm from 'utils/eventBus'

import Timetable from 'components/Timetable'

export default {
  components: {
    Timetable
  },
  // props: {
  //   selectedItem: {
  //     type: Object,
  //     default: () => {}
  //   }
  // },
  data () {
    return {
      baseUrl: process.env.VUE_APP_BASE_API + '/static',
      clientHeight: document.documentElement.clientHeight,
      clientWidth: document.documentElement.clientWidth,
      startClientY: 0,
      deltaY: 0,
      lastEndY: 0,
      bounce: false,
      move: false,
      lessonList: [],
      item: {},
      room: null,
      facility: null,
      building: null,
      collapse: true,
      scrollable: false,
      bodyLastClientY: 0,
      lastSwipeable: false,
      swipeable: false,
      scrollTop: 0,
      moveInShade: false,
      moveFormScrollToSwipe: false,
      bodyOverflow: false,
    }
  },
  computed: {
    maxHeight () {
      return this.clientHeight - 100 - this.clientWidth * 0.2
    },
    modalStyle () {
      return {
        // top: this.clientHeight + this.deltaY - 150 + 'px',
        top: `calc(${this.clientHeight}px - 20vw)`,
        transition: this.bounce ? 'transform .5s' : '',
        transform: `translateY(${this.collapse ? '21vw' : this.deltaY + 'px'})`
      }
    },
    shadeStyle () {
      return {
        // transition: this.bounce ? 'opacity .5s' : '',
        opacity: 1 / (-this.maxHeight * 3) * this.deltaY
      }
    },

    modalDisplayStyle () {
      return {
        height: 'calc('+(this.clientHeight - 100) +'px - 2vw - 1vw - 2vw)', 
        overflow: this.deltaY === -this.maxHeight ? 'auto' : 'hidden'
        // overflow: 'auto'
      }
    },

    displayHeader () {
      return this.scrollable && this.scrollTop > 0 
    },

    bodyScrollToBottomStyle () {
      if (this.bounce && this.deltaY === 0 && this.scrollTop !== 0) {
        const deltaY = this.scrollTop
        this.scrollTop = 0
        return {
          transform: `translateY(${deltaY}px)`,
          transition: 'all .5s'
        }
      } else return null
    },
    
    headerBackground () {
      let opacity = (this.scrollTop) / (this.clientHeight / 10)
      if (opacity > 1) opacity = 1
      else if (opacity < 0) opacity = 0
      return `rgba(248,247,242,${opacity})`
    },

    itemLocation () {
      let str
      let building
      let floor
      switch (this.item.dataType) {
        case 'room':
          building = this.item.building || {}
          floor = this.item.floor || {}
          str = `${floorDict[floor.name]}, ${building.name}, ${buildingDict[building.code]}`
          break
        case 'facility':
          building = this.item.building || {}
          floor = this.item.floor || {}
          str = `${floorDict[floor.name]}, ${building.name}, ${buildingDict[building.code]}`
          break
        case 'building':
          str = `${buildingDict[this.item.code || 'FB']}`
      }
      return str
    },

    itemType () {
      const type = this.item.dataType
      return type ? type.charAt(0).toUpperCase() + type.slice(1) : ''
    }
  },
  methods: {
    async getItemInfo (type, id) {
      let data
      switch (type) {
        case 'room':
          data = await this.$api.get(`/room/${id}`);
          console.log(data)
          // this.room = data.room
          this.item = { ...data.room }
          this.lessonList = data.timetable
          break
        case 'facility':
          data = await this.$api.get(`/facility/${id}`);
          console.log(data)
          this.item = { ...data.facility }
          // this.facility = data.facility
          break
        case 'building':
          data = await this.$api.get(`/building/${id}`);
          // console.log(data)
          // this.building = data.building
          this.item = { ...data.building }
          break
      }
      this.item = {
        ...this.item,
        dataType: type
      }
      this.showModal()
    },

    showModal () {
      this.collapse = false
      this.bounce = true
      this.$nextTick(() => this.bodyOverflow = this.$refs.modalBody.offsetHeight > this.$refs.modalDisplay.offsetHeight)
    },

    collapseModal () {
      this.collapse = true
      this.bounce = true
      this.deltaY = 0
    },

    ontouchstart (e) {
      // console.log('modal touchstart')
      // if (this.bounce) return
      if (this.bounce && this.deltaY >= 0) this.$refs.modalDisplay.scrollTo(0, 0)
      this.bounce = false
      this.lastEndY = this.deltaY
      this.move = false
      this.startClientY = e.targetTouches[0].clientY
    },

    ontouchmove (e) {
      // console.log('modal touchmove')
      // if (this.bounce) return
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
      // if (this.bounce) return
      if (!this.move) { // click
        if (this.deltaY === 0) {
          this.bounce = true
          this.deltaY = -this.maxHeight
        }
      } else { // slide
        const deltaY = this.deltaY - this.lastEndY
        console.log(deltaY)
        if (deltaY < 0) { // up
          this.bounce = true
          this.deltaY = (deltaY > -this.clientHeight * 0.1 && this.deltaY >= -this.clientHeight / 20) ? 0 : -this.maxHeight
        } else if (deltaY === 0) {  
          this.deltaY = this.lastEndY
        } else if (deltaY < this.maxHeight){ // down
          this.bounce = true
          this.deltaY = deltaY < this.clientHeight * 0.1 ? -this.maxHeight : 0
        } else {
          this.bounce = true
          this.deltaY = 0
        }
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

    onscrollmodalbody (e) {
      // this.scrollable = this.deltaY <= -this.maxHeight && this.bodyOverflow
      this.scrollTop = this.$refs.modalDisplay.scrollTop
      // if (this.swapeable) e.preventDefault()
      // else this.scrollable = false
    },

    ontouchstartmodalbody (e) {
      // console.log('modalbody touchstart')
      // if (this.bounce || this.move) return false
      this.scrollable = this.deltaY <= -this.maxHeight && this.bodyOverflow
      this.bodyLastClientY = e.targetTouches[0].clientY
      // this.swipeable = this.scrollTop <= 0 
      // if (!this.swipeable) this.stopBubble(e)
      // else e.preventDefault()
    },

    ontouchmovemodalbody (e) {
      // console.log('modalbody touchmove')
      this.move = true
      this.scrollable = this.deltaY <= -this.maxHeight && this.bodyOverflow
      if (!this.scrollable) return false
      // if (this.bounce || this.move) return false
      const deltaY = e.targetTouches[0].clientY - this.bodyLastClientY
      this.bodyLastClientY = e.targetTouches[0].clientY
      this.swipeable = !this.bodyOverflow || (deltaY > 0 && this.scrollTop <= 0 && this.deltaY < 0)
      if (!this.swipeable) this.stopBubble(e) 
      else if (this.lastSwipeable === false) this.startClientY = e.targetTouches[0].clientY
      this.lastSwipeable = this.swipeable
    },

    ontouchendmodalbody (e) {
      // console.log('modalbody touchend')
      // if (this.bounce || this.move) return false
      this.scrollable = this.deltaY <= -this.maxHeight && this.bodyOverflow
      // if (!this.swipeable) this.stopBubble(e)
    },

    ontouchendclose (e) {
      if (!this.move) {
        this.collapseModal()
        this.stopBubble(e)
      }
    },

    stopBubble (e) { 
      if ( e && e.stopPropagation ) e.stopPropagation()
      else window.event.cancelBubble = true
    }, 

    stopDefault(e) { 
      if ( e && e.preventDefault ) e.preventDefault()
      else window.event.returnValue = false
      return false
    },
  },
  mounted () {
    vm.$on('getItemInfo', (type, id) => {
      this.getItemInfo(type, id)
    })
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

.modal-container
{
  overflow: hidden;
  position: fixed;
  width: 100vw;
  height: 100vh;
  background: #F8F7F2;
  z-index: 1000;
  border-top-left-radius: 5vw;
  border-top-right-radius: 5vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  -webkit-box-shadow: 0px 0px 10px 1px rgba(0,0,0,0.52);
  -moz-box-shadow: 0px 0px 10px 1px rgba(0,0,0,0.52);
  box-shadow: 0px 0px 10px 1px rgba(0,0,0,0.52);
}

.modal-scroll
{
  margin: 2vw 0;
  background: #8E8E93;
  width: 10vw;
  height: 1vw;
  border-radius: 0.5vw;
}

.modal-close {
  background: #E6E3DF;
  color: #8E8E93;
  font-size: 3vw;
  height: 5vw;
  width: 5vw;
  line-height: 5vw;
  text-align: center;
  vertical-align: middle;
  border-radius: 2.5vw;
  flex-shrink: 0;
}

.modal-header {
  position: absolute;
  top: 0;
  width: 100vw;
  height: auto;
  border-top-left-radius: 5vw;
  border-top-right-radius: 5vw;
  z-index: 1500;
  background-color: transparent;
  padding: 0;
  margin: 0;
  border: none;

  .modal-header-view {
    position: relative;
    padding: 5vw 3vw 4vw;
    // width: 94vw;
    width: 100%;
    height: auto;
    border-top-left-radius: 5vw;
    border-top-right-radius: 5vw;
    display: flex;
    justify-content: space-between;
    -webkit-box-shadow: 0px 0px 10px 1px rgba(0,0,0,0.52);
    -moz-box-shadow: 0px 0px 10px 1px rgba(0,0,0,0.52);
    box-shadow: 0px 0px 10px 1px rgba(0,0,0,0.52);

    .modal-header-name {
      flex-grow: 1;
      font-size: 4vw;
      line-height: 7vw;
      font-size: 6vw;
      font-weight: bold;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

  }
}

.modal-body-cover {
  position: absolute;
  top: 5vw;
  width: 100vw;
  height: 100vh;
  background: green;
  opacity: 0;
  // z-index: 2000;
}

.modal-display {
  width: 100%;
  overflow-x: hidden;
  // overflow-y: scroll;
  // -webkit-overflow-scrolling: touch;
  // position: relative;

  .modal-body {
    padding: 0 3vw 2vw;
    // width: 94vw;
    width: 100vw;
    height: auto;
    display: flex;
    flex-direction: column;
    // min-height: 101%;
    // align-items: center;
    
    .modal-info {
      width: 100%;
      height: auto;
      background: red;
      display: flex;
      justify-content: space-between;
      flex-shrink: 0;

      .modal-info-basic {
        flex-grow: 1;
        font-size: 4vw;

        .modal-info-basic-name {
          line-height: 7vw;
          font-size: 6vw;
          font-weight: bold;
        }

        .modal-info-basic-type {
          margin-top: 2vw;
        }

        .modal-info-basic-location {
          margin-top: 2vw;
        }
      }

      // .modal-close {
      //   background: #E6E3DF;
      //   color: #8E8E93;
      //   font-size: 5vw;
      //   height: 5vw;
      //   width: 5vw;
      //   line-height: 5vw;
      //   text-align: center;
      //   border-radius: 2.5vw;
      //   flex-shrink: 0;
      // }
    }

    .modal-indoor {
      margin: 0;
      // padding: 0;
      background-color: transparent;
      border: 2px solid #D1D1D1;
      outline: none;

      align-self: flex-start;
      padding: 0 4vw;
      // width: auto;
      height: 10vw;
      font-size: 4vw;
      position: relative;
      border-radius: 5vw;
    }

    .modal-indoor::before {
      font-family: "iconfont";
      content: "\e652";
      font-weight: bold;
      color: blue;
      margin-right: 1vw;
    }

    .modal-image {
      width: 100%;
      height: 50vw;
      background-repeat: no-repeat;
      background-size: cover;
      background-position: center;
      flex-shrink: 0;
    }

    .moeal-timetable {
      width: 100%;
      height: auto;
      background: green;
      flex-shrink: 0;
    }
    
  }
}

</style>