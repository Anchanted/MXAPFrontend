<template>
  <div class="history-container" ref="container">
    <div v-for="(item, index) in itemList" :key="index">
      <place-card v-if="new RegExp(/^(building|facility|room)$/).test(item.dataType)"
        :simple="true" :data-type="item.dataType" :style="itemStyle(index)"
        @touchstart.native="ontouchstart($event, index)"
        @touchmove.native="ontouchmove"
        @touchend.native="ontouchend($event, item.dataType)">
        <template #icon v-if="item.dataType === 'building'">{{item.code}}</template>
        <template #icon v-else-if="item.dataType === 'room'">{{item.building_code}}</template>
        <template #icon v-else-if="item.dataType === 'facility'">
          <span class="iconfont facility-icon" :class="`icon-${item.icon_type || item.dataType}`"></span>
        </template>
        <template #name>{{item.name}}</template>
        <template #location>{{itemLocation(index, item.dataType)}}</template>
      </place-card>

      <div v-else-if="item.dataType === 'query'" class="history-item"
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
import PlaceCard from 'components/PlaceCard'

import iconPath from 'assets/js/facilityIconPath.js'

import { mapState } from 'vuex'

export default {
  components: {
    PlaceCard
  },
  data () {
    return {
      itemSelected: false,
      itemIndex: 0,
      moveInItem: false,
    }
  },
  computed: {
    ...mapState({
      itemList: state => state.search.historyList
    }),
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
        if (type === 'building' || !(item.floor_name && item.building_name)) return item.zone
        else return `${this.$t("place.floor." + item.floor_name)}, ${item.building_name}, ${item.zone}`
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
        this.selectItem({ ...item, dataType })
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
    this.$nextTick(() => {
      this.$store.commit('search/setHistoryComponentHeight', this.$refs.container.offsetHeight)
    })
  },
  watch: {
    itemList () {
      this.$nextTick(() => {
        this.$store.commit('search/setHistoryComponentHeight', this.$refs.container.offsetHeight)
      })
    }
  }
}
</script>

<style lang="scss">
.history-container {
  width: 100vw;
  height: auto;
  padding: 0 0 2vw;

  .history-item {
    width: 100%;
    height: auto;
    padding: 2vw 3vw;
    border-bottom: 1px #C6C6C6 solid;
    display: flex;
    justify-content: flex-start;
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