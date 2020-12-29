<template>
  <div class="search-page" ref="page" :style="pageStyle">
    <div v-if="totalNumber" class="search-section">
      <div class="search-topbar">{{$tc("search.result", totalNumber)}}</div>

      <div class="search-section-items">
        <place-card v-for="(item, index) in itemList" :key="index"
          class="search-section-item" 
          :style="cardStyle(index)"
          :data-type="item.dataType" 
          @touchstart.native="ontouchstartitem($event, index)"
          @touchmove.native="ontouchmoveitem"
          @touchend.native="ontouchenditem">
          <template #icon v-if="item.dataType === 'building'">{{item.code}}</template>
          <template #icon v-else-if="item.dataType === 'room'">{{item.building_code}}</template>
          <template #icon v-else-if="item.dataType === 'query'">
            <span class="iconfont" :class="`icon-search`"></span>
          </template>
          <template #icon v-else>
            <span class="iconfont" :class="`icon-${item.icon_type || item.dataType}`"></span>
          </template>
          <template #name>{{item.name || item.content}}</template>
          <template #type v-if="item.dataType !== 'building' && item.dataType !== 'query'">{{item.type && item.type.capitalize()}}</template>
          <template #address v-if="item.dataType !== 'query'">{{placeAddress(item)}}</template>
        </place-card>
      </div>

      <div v-if="currentPageNo < totalPages - 1" class="search-more-loading">
        <spinner-line></spinner-line>
      </div>
      <div v-else class="search-end">{{$t('search.noMore')}}</div>
    </div>

    <div v-else class="search-none">{{$t('search.noResult')}}</div>

    <loading-panel
      v-if="initializing"
      :has-error="initializingError"
      class="search-loading-panel"
      :style="{ height: 'calc('+ clientHeight * 0.9 +'px - 20vw)' }"
      @refresh="initialSearch">
    </loading-panel>
  </div>
</template>

<script>
import SpinnerLine from 'components/Spinner/SpinnerLine'
import LoadingPanel from 'components/LoadingPanel'
import PlaceCard from 'components/PlaceCard'

import { mapState } from 'vuex'

export default {
  components: {
    SpinnerLine,
    LoadingPanel,
    PlaceCard
  },
  data() {
    return {
      query: '',
      itemList: [],
      itemSelected: false,
      itemIndex: null,
      moveInItem: false,
      currentPageNo: 0,
      totalPages: 0,
      totalNumber: 0,
      requesting: false,
      initializing: true,
      initializingError: false
    }
  },
  computed: {
    ...mapState({
      loadMore: state => state.search.loadMore
    }),
    pageStyle() {
      return { 
        'min-height': `calc(${this.clientHeight * 0.9}px - 20vw)`, 
        top: `${this.deltaY}px` 
      }
    },
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
    async initialSearch() {
      this.initializing = true
      this.initializingError = false
      
      this.$emit("onscrollpanel", "t")

      try {
        const data = await this.$api.search.searchPage({
          q: this.query,
          n: this.currentPageNo
        })
        console.log(data)

        this.itemList = this.unifySearchItem(this.itemList.concat(data.content || []))
        this.totalPages = data.totalPages
        this.totalNumber = data.totalElements || 0

        if (!this.initializingError) this.initializing = false
      } catch (error) {
        console.log(error)
        this.initializingError = true
      } finally {
        this.$nextTick(() => {
          this.$store.commit('search/setRouterViewHeight', this.$refs.page.offsetHeight)
          this.$store.commit('search/setLoadMore', false)
        })
      }
    },

    async search() {
      if (this.requesting) return
      if (this.currentPageNo >= this.totalPages - 1) return

      this.requesting = true
      console.log('requesting')
      this.$emit("onscrollpanel", "t")

      try {
        const data = await this.$api.search.searchPage({
          q: this.query,
          n: this.currentPageNo + 1
        })
        console.log(data)
        this.itemList = this.unifySearchItem(this.itemList.concat(data.content || []))
        this.currentPageNo++
      } catch (error) {
        console.log(error)
        this.$toast({
          message: 'Fail to load data.\nPlease try again.',
          time: 3000
        })
        const length = this.itemList.length
        this.currentPageNo = Math.ceil(length / 10) - 1
      } finally {
        this.requesting = false
        this.$store.commit('search/setLoadMore', false)
        this.$nextTick(() => {
          this.$store.commit('search/setRouterViewHeight', this.$refs.page.offsetHeight)
        })
      }
    },

    ontouchstartitem(e, index) {
      // console.log('item touchstart')
      this.itemIndex = index
      this.itemSelected = true
      this.moveInItem = false
    },
    ontouchmoveitem(e) {
      // console.log('item touchmove')
      this.moveInItem = true
      this.itemSelected = false
    },
    ontouchenditem(e) {
      // console.log('item touchend')
      this.itemSelected = false
      if (!this.moveInItem) {
        const item = this.itemList[this.itemIndex]
        this.selectItem({ ...item, dataType: item.placeType || "place" })
        this.stopBubble(e)
      }
    }
  },

  async mounted() {
    this.query = this.$route.query.q
    
    this.initialSearch()
  },

  watch: {
    loadMore(val) {
      if (val) this.search()
    },
  }
}
</script>

<style lang="scss">
.search-page {
  width: 100vw;
  height: auto;
  // overflow: scroll;
  position: absolute;
  top: 0;
  z-index: 170;
  background: #F8F8F8;

  .search-loading-panel {
    width: 100%; 
    position: absolute; 
    top: 0; 
    background-color: #F8F8F8;
  }

  .search-topbar {
    width: 100vw;
    height: 8vw;
    position: fixed;
    top: 20vw;
    color: #888888;
    background-color: #F8F8F8;
    border-bottom: 1px #C6C6C6 solid;
    font-size: 4vw;
    line-height: 8vw;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    z-index: 180;
  }

  .search-section-items {
    width: 100vw;
    height: auto;
    padding: 8vw 0 0;

    .search-section-item:first-child > div {
      border-top: none;
    }
  }

  .search-more-loading {
    width: 100%;
    height: auto;
    padding: 2vw 3vw;
    border-top: 1px #C6C6C6 solid;
    font-size: 5vw;
    text-align: center;
  }

  .search-end {
    width: 100%;
    height: auto;
    padding: 2vw 0;
    border-top: 1px #C6C6C6 solid;
    font-size: 5vw;
    color: #888888;
    text-align: center;
    line-height: 1.5;
  }

  .search-none {
    width: 100vw;
    padding-top: 25vw;
    font-size: 5vw;
    color: #888888;
    text-align: center;
  }
}
</style>