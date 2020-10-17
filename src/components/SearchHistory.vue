<template>
  <div class="history-container" ref="container">
    <place-card v-for="(item, index) in itemList" :key="index"
      simple 
      :data-type="item.dataType" 
      :style="cardStyle(index)"
      @touchstart.native="ontouchstart($event, index)"
      @touchmove.native="ontouchmove"
      @touchend.native="ontouchend">
      <template #icon v-if="item.dataType === 'building'">{{item.code}}</template>
      <template #icon v-else-if="item.dataType === 'room'">{{item.building_code}}</template>
      <template #icon v-else-if="item.dataType === 'query'">
        <span class="iconfont icon-search"></span>
      </template>
      <template #icon v-else>
        <span class="iconfont" :class="`icon-${item.icon_type || item.dataType}`"></span>
      </template>
      <template #name>{{item.content || item.name}}</template>
      <template #address v-if="item.dataType !== 'query'">{{placeAddress(item)}}</template>
    </place-card>
  </div>
</template>

<script>
import PlaceCard from 'components/PlaceCard'

import { mapState } from 'vuex'

export default {
  components: {
    PlaceCard
  },
  data () {
    return {
      itemSelected: false,
      itemIndex: null,
      moveInItem: false,
    }
  },
  computed: {
    ...mapState({
      itemList: state => state.search.historyList
    }),
    cardStyle() {
      return index => {
        return {
          'background-color': (this.itemIndex === index && this.itemSelected) ? '#E6E3DF' : 'transparent'
        }
      }
    },
    placeAddress() {
      return place => {
        let addressArr = []
        const floor = place.floor_name
        const building = place.building_name
        const zone = place.zone || place.building_zone
        if (floor) addressArr.push(this.$t("place.floor." + floor))
        if (building) addressArr.push(building)
        addressArr.push(zone || this.$t("place.zone.b"))
        if (this.$t("place.address.reverse") === "true") addressArr = addressArr.reverse()
        return addressArr.join(this.$t("place.address.conj"))
      }
    }
  },
  methods: {
    ontouchstart(e, index) {
      this.itemIndex = index
      this.itemSelected = true
      this.moveInItem = false
    },
    ontouchmove(e) {
      // console.log('item touchmove')
      this.itemSelected = false
      this.moveInItem = true
    },
    ontouchend(e) {
      // console.log('item touchend')
      this.itemSelected = false
      
      if (!this.moveInItem) {
        this.selectItem(this.itemList[this.itemIndex])
        this.stopBubble(e)
      }
    }
  },
  mounted() {
    // localStorage.removeItem('historyList')
    this.$nextTick(() => {
      this.$store.commit('search/setHistoryComponentHeight', this.$refs.container.offsetHeight)
    })
  },
  watch: {
    itemList() {
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

  // .history-item {
  //   width: 100%;
  //   height: auto;
  //   padding: 2vw 3vw;
  //   border-bottom: 1px #C6C6C6 solid;
  //   display: flex;
  //   justify-content: flex-start;

  //   .history-item-query {
  //     font-size: 5vw;
  //   }
  // }
}
</style>