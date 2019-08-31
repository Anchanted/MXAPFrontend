<template>
  <div class="history-container" ref="container">
    <div v-for="(item, index) in itemList" :key="index">
      <div v-if="item.dataType === 'building'" class="history-item"
        :style="itemStyle(index)"
        @touchstart="ontouchstart($event, index)"
        @touchmove="ontouchmove"
        @touchend="ontouchend($event, 'building')">
        <div class="history-item-icon">{{item.code}}</div>
        <div class="history-item-info">
          <div class="history-item-info-name one-line">{{item.name}}</div>
          <div class="history-item-info-location one-line">{{itemLocation(index, 'building')}}</div>
        </div>
      </div>

      <div v-else-if="item.dataType  === 'room'" class="history-item"
        :style="itemStyle(index)"
        @touchstart="ontouchstart($event, index)"
        @touchmove="ontouchmove"
        @touchend="ontouchend($event, 'room')">
        <div class="history-item-icon">{{item.building_code}}</div>
        <div class="history-item-info">
          <div class="history-item-info-name one-line">{{item.name}}</div>
          <div class="history-item-info-location one-line">{{itemLocation(index, 'room')}}</div>
        </div>
      </div>

      <div v-else-if="item.dataType  === 'facility'" class="history-item"
        :style="itemStyle(index)"
        @touchstart="ontouchstart($event, index)"
        @touchmove="ontouchmove"
        @touchend="ontouchend($event, 'facility')">
        <div class="history-item-icon">
          <img :src="facilityImage(item.type)" :alt="item.type">
        </div>
        <div class="history-item-info">
          <div class="history-item-info-name one-line">{{item.name}}</div>
          <div class="history-item-info-location one-line">{{itemLocation(index, 'facility')}}</div>
        </div>
      </div>

      <div v-else-if="item.dataType  === 'query'" class="history-item"
        :style="itemStyle(index)"
        @touchstart="ontouchstart($event, index)"
        @touchmove="ontouchmove"
        @touchend="ontouchend($event, 'query')">
        <span class="history-item-query one-line">{{item.content}}</span>
      </div>

    </div>
  </div>
</template>

<script>
import floorDict from 'utils/floor.json'
import buildingDict from 'utils/building.json'
import iconPath from 'utils/facilityIconPath.js'

export default {
  data () {
    return {
      itemList: [],
      itemSelected: false,
      itemIndex: 0,
      moveInItem: false,
    }
  },
  computed: {
    itemStyle () {
      return (index) => {
        return {
          'background-color': (this.itemIndex === index && this.itemSelected) ? '#E6E3DF' : 'transparent'
        }
      }
    },
    itemLocation () {
      return (index, type) => {
        const item = this.itemList[index]
        if (type === 'building') return `${buildingDict[item.code]}`
        else return `${floorDict[item.floor_name]}, ${item.building_name}, ${buildingDict[item.building_code]}`
      }
    },
    facilityImage () {
      return type => iconPath[type]
    },
  },
  methods: {
    ontouchstart (e, index) {
      this.itemIndex = index
      this.itemSelected = true
      this.moveInItem = false
    },
    ontouchmove (e) {
      // console.log('item touchmove')
      this.moveInItem = true
      this.itemSelected = false
    },
    ontouchend (e, dataType) {
      // console.log('item touchend')
      this.itemSelected = false
      
      if (!this.moveInItem) {
        const item = this.itemList[this.itemIndex]
        this.$emit('selectItem', { ...item, dataType })
        this.stopBubble(e)
      }
    },

    stopBubble (e) { 
      if ( e && e.stopPropagation ) e.stopPropagation()
      else window.event.cancelBubble = true
    }, 
  },
  mounted () {
    // localStorage.removeItem('historyList')
    let historyList = JSON.parse(localStorage.getItem('historyList')) || []
    if (!(historyList instanceof Array)) historyList = []
    this.itemList = historyList
    console.log(this.itemList)
    this.$nextTick(() => {
      this.$emit('updateHeight', this.$refs.container.offsetHeight)
    })
  }
}
</script>

<style lang="scss">
.history-container {
  width: 100vw;
  height: auto;
  padding: 2vw 0;

  .history-item {
    width: 100%;
    height: auto;
    padding: 2vw 3vw;
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
      height: 12vw;
      margin-left: 4vw;
      display: flex;
      flex-direction: column;
      justify-content: space-between;

      &-name {
        font-size: 5vw;
        line-height: 1.2;
        height: 7vw;
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

.history-item-query {
  font-size: 5vw;
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