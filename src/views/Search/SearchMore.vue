<template>
  <div class="search-container" ref="container" :style="containerStyle">
    <!-- <div class="search-more-topbar" ref="topbar" @touchend.stop="ontouchendback" :style="{ top: bodyScrollTop + 'px' }"> -->
    <!-- <div class="search-more-topbar" ref="topbar" :style="{ top: `calc(${change ? '0px' : '20vw'} + ${bodyScrollTop}px)` }" @touchend.stop="ontouchendback"> -->
    <div class="search-more-topbar" ref="topbar" :style="{ top: change ? `${bodyScrollTop}px` : '20vw' }" @touchend.stop="ontouchendback">
      <div class="iconfont icon-arrow-down search-more-topbar-back"></div>
      <div class="search-more-topbar-info">{{searchTitle}}</div>
    </div>

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

    <div v-if="currentPageNo < totalPages - 1" class="search-load">
      <spinner-line></spinner-line>
    </div>
    <div v-else class="search-end">
      {{$t('search.noMore')}}
    </div>

    <!-- <loading v-if="initializing" style="width: 100%; position: absolute; top: 0; background-color: #F8F8F8;" :style="{ height: 'calc('+ clientHeight * 0.9 +'px - 20vw)' }"></loading> -->
    <loading-panel
      v-if="initializing"
      :has-error="initializingError"
      class="search-more-loading-panel"
      :style="{ height: 'calc('+ clientHeight * 0.9 +'px - 20vw)' }"
      @refresh="initialSearch">
    </loading-panel>
  </div>
</template>

<script>
import LoadingPanel from 'components/LoadingPanel'
import SpinnerLine from 'components/Spinner/SpinnerLine'
import PlaceCard from 'components/PlaceCard'

import { mapState } from 'vuex'

export default {
  props: {
    change: {
      type: Boolean,
      default: true,
      required: true
    },
    deltaY: {
      type: Number,
      default: 0,
      required: true
    }
  },
  components: {
    SpinnerLine,
    LoadingPanel,
    PlaceCard
  },
  data() {
    return {
      dataType: null,
      query: '',
      itemList: [],
      itemSelected: false,
      itemIndex: null,
      moveInItem: false,
      currentPageNo: 0,
      totalPages: 0,
      requesting: false,
      initializing: true,
      initializingError: false
    }
  },
  computed: {
    ...mapState({
      bodyScrollTop: state => state.search.bodyScrollTop,
      loadMore: state => state.search.loadMore
    }),
    containerStyle() {
      return { 
        'min-height': `calc(${this.clientHeight * 0.9}px - 20vw)`, 
        top: `${this.deltaY}px` 
      }
    },
    searchTitle() {
      // return type ? `"${decodeURIComponent(this.query)}" in ${type.charAt(0).toUpperCase()}${type.slice(1)}` : ''
      return this.query && this.dataType ? this.$t('search.moreTopbar',{ query: decodeURIComponent(this.query), type: this.$t(`placeType.${this.dataType}`) }) : ''
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
    async initialSearch () {
      this.initializing = true
      this.initializingError = false
      try {
        const data = await this.$api.search.searchMore(this.dataType, {
          q: this.query,
          n: this.currentPageNo,
          id: this.$route.params.buildingId
        }) || {}
        console.log(data)
        if (!data.totalPages) {
          this.$emit('back')
          return
        }
        this.itemList = this.unifySearchItem(this.itemList.concat(data.content || []))
        this.totalPages = data.totalPages
      } catch (error) {
        console.log(error)
        this.initializingError = true
      } finally {
        if (!this.initializingError) this.initializing = false
        this.$nextTick(() => {
          this.$store.commit('search/setRouterViewHeight', this.$refs.container.offsetHeight)
          this.$store.commit('search/setScrollToFromChild', `u0`)
          this.$store.commit('search/setLoadMore', false)
        })
      }
    },

    async search () {
      if (!this.requesting) {
        if (this.currentPageNo < this.totalPages - 1) {
          this.requesting = true
          console.log('requesting')
          try {
            const data = await this.$api.search.searchMore(this.dataType, {
              q: this.query,
              n: this.currentPageNo + 1,
              id: this.$route.params.buildingId
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
              this.$store.commit('search/setRouterViewHeight', this.$refs.container.offsetHeight)
            })
          }
        } 
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
        this.selectItem({ ...item, dataType: item.placeType })
        this.stopBubble(e)
      }
    },

    ontouchendback(e) {
      if (!this.move) this.$emit('back')
    }
  },

  async mounted () {
    this.query = this.$route.query.q
    this.dataType = this.$route.params.type
    
    this.initialSearch()
  },
  watch: {
    loadMore (val) {
      if (val) this.search()
    },
  }
}
</script>

<style lang="scss">
.search-more-topbar {
  width: 100vw;
  height: auto;
  position: fixed;
  top: 20vw;
  background: #F8F8F8;
  display: flex;
  justify-content: flex-start;
  border-bottom: 1px #C6C6C6 solid;
  z-index: 180;

  &-back {
    width: 10vw;
    height: 10vw;
    font-size: 6vw !important;
    line-height: 10vw;
    text-align: center;
    transform: rotate(90deg);
    // background: red;
    flex-shrink: 0;
  }

  &-info {
    width: auto;
    height: 10vw;
    font-size: 5vw;
    line-height: 2;
    flex-grow: 1;
    margin-right: 10vw;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

}

.search-container {
  width: 100vw;
  height: auto;
  // overflow: scroll;
  position: absolute;
  top: 0;
  z-index: 170;
  background: #F8F8F8;

  .search-more-loading-panel {
    width: 100%; 
    position: absolute; 
    top: 0; 
    background-color: #F8F8F8;
  }

  .search-section-items {
    width: 100vw;
    height: auto;
    // padding: 10vw 3vw 0;
    padding: 10vw 0 0;

    .search-section-item:first-child > div {
      border-top: none;
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

  .search-end {
    width: 100%;
    height: auto;
    padding: 2vw 0;
    border-top: 1px #C6C6C6 solid;
    font-size: 5vw;
    color: #8E8E8E;
    text-align: center;
    line-height: 1.5;
  }
}
</style>