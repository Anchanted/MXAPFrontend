<template>
  <div class="keyword-container" ref="container">
    <place-card v-for="(item, index) in itemList" :key="index"
      simple 
      :style="cardStyle(index)"
      :data-type="item.dataType" 
      @touchstart.native="ontouchstart($event, index)"
      @touchmove.native="ontouchmove"
      @touchend.native="ontouchend">
      <template #icon v-if="item.dataType === 'building'">{{item.code}}</template>
      <template #icon v-else-if="item.dataType === 'room'">{{item.building_code}}</template>
      <template #icon v-else-if="item.dataType === 'query'">
        <span class="iconfont" :class="`icon-search`"></span>
      </template>
      <template #icon v-else>
        <span class="iconfont" :class="`icon-${item.icon_type || item.dataType}`"></span>
      </template>
      <template #name><font class="one-line" v-html="item.dataType === 'query' ? item.content : (item.nameHighlight || item.name)"></font></template>
      <template #address v-if="item.dataType !== 'query'">{{placeAddress(item)}}</template>
    </place-card>
  </div>
</template>

<script>
import axios from 'axios'
import PlaceCard from 'components/PlaceCard'

export default {
  components: {
    PlaceCard
  },
  props: {
    text: String,
    updateHeight: Boolean,
    outdoor: Boolean
  },
  data () {
    return {
      itemList: [],
      itemSelected: false,
      itemIndex: null,
      moveInItem: false,
      textTimeoutId: null,
      source: null
    }
  },
  computed: {
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
        const locale = place.languageCode || this.$i18n.fallbackLocale
        if (floor) addressArr.push(this.$t("place.floor." + floor, locale))
        if (building) addressArr.push(building)
        addressArr.push(zone || this.$t("place.zone.b"))
        if (this.$t("place.address.reverse", locale) === "true") addressArr = addressArr.reverse()
        return addressArr.join(this.$t("place.address.conj", locale))
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
        const item = this.itemList[this.itemIndex]
        this.$emit("chooseitem", { ...item, dataType: item.placeType })
        this.stopBubble(e)
      }
    }
  },
  mounted() {
    if (this.updateHeight) 
      this.$nextTick(() => {
        this.$store.commit('search/setKeywordComponentHeight', this.$refs.container.offsetHeight)
      })
  },
  watch: {
    text(val) {
      clearTimeout(this.textTimeoutId)
      if (!val) {
        if (this.itemList.length) this.itemList = []
      } else {
        this.textTimeoutId = setTimeout(() => {
          console.log("search", val)
          if (this.source) this.source.cancel("request canceled by " + val)
          this.source = axios.CancelToken.source()
          const query = {
            q: val
          }
          if (this.outdoor) {
            query["outdoor"] = true
          }
          this.$api.search.searchKeyword(query, { cancelToken: this.source.token }).then(data => {
            console.log(data)
            if (data.query === this.text) {
              this.itemList = this.unifySearchItem(data.placeList || [])
              // console.log(this.itemList)
            }
          }).catch(err => {
            console.log(err)
            // if (axios.isCancel(err)) {
            //   console.log(err.message)
            // }
          })
        }, 300)
      }
    },
    itemList() {
      if (this.updateHeight) 
        this.$nextTick(() => {
          this.$store.commit('search/setKeywordComponentHeight', this.$refs.container.offsetHeight)
        })
    }
  }
}
</script>

<style lang="scss">
.keyword-container {
  width: 100vw;
  height: auto;
  padding: 0 0 2vw;
}
</style>