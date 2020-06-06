<template>
  <div class="search-container" ref="container" :style="containerStyle">
    <!-- <div class="search-more-topbar" ref="topbar" @touchend.stop="ontouchendback" :style="{ top: bodyScrollTop + 'px' }"> -->
    <!-- <div class="search-more-topbar" ref="topbar" :style="{ top: `calc(${change ? '0px' : '20vw'} + ${bodyScrollTop}px)` }" @touchend.stop="ontouchendback"> -->
    <div class="search-more-topbar" ref="topbar" :style="{ top: change ? `${bodyScrollTop}px` : '20vw' }" @touchend.stop="ontouchendback">
      <div class="iconfont icon-arrow-down search-more-topbar-back"></div>
      <div class="search-more-topbar-info">{{searchTitle}}</div>
    </div>
    
    <div v-if="dataType === 'building'" class="search-section-items">
      <place-card class="search-section-item"
        v-for="building in itemList" :key="building.id"
        :simple="false" :data-type="'building'" :style="itemStyle(building.id, 'building')"
        @touchstart.native="ontouchstartitem($event, building)"
        @touchmove.native="ontouchmoveitem"
        @touchend.native="ontouchenditem">
        <template #icon>{{building.code}}</template>
        <template #name>{{building.name}}</template>
        <template #location>{{itemLocation(building, 'building')}}</template>
      </place-card>
    </div>

    <div v-else-if="dataType === 'room'" class="search-section-items">
      <place-card class="search-section-item"
        v-for="room in itemList" :key="room.id"
        :simple="false" :data-type="'room'" :style="itemStyle(room.id, 'room')"
        @touchstart.native="ontouchstartitem($event, room)"
        @touchmove.native="ontouchmoveitem"
        @touchend.native="ontouchenditem">
        <template #icon>{{room.building_code}}</template>
        <template #name>{{room.name}}</template>
        <template #type>{{room.type && room.type.capitalize()}}</template>
        <template #location>{{itemLocation(room, 'room')}}</template>
      </place-card>
    </div>

    <div v-else-if="dataType === 'facility'" class="search-section-items">
      <place-card class="search-section-item"
        v-for="facility in itemList" :key="facility.id"
        :simple="false" :data-type="'facility'" :style="itemStyle(facility.id, 'facility')"
        @touchstart.native="ontouchstartitem($event, facility)"
        @touchmove.native="ontouchmoveitem"
        @touchend.native="ontouchenditem">
        <template #icon>
          <span class="iconfont facility-icon" :class="`icon-${facility.icon_type || dataType}`"></span>
        </template>
        <template #name>{{facility.name}}</template>
        <template #type>{{facility.type && facility.type.capitalize()}}</template>
        <template #location>{{itemLocation(facility, 'facility')}}</template>
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

import { unifySearchItem } from 'utils/utilFunctions.js'
import iconPath from 'assets/js/facilityIconPath.js'

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
      selectedItem: {},
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
      clientHeight: state => state.clientHeight,
      panelMove: state => state.search.panelMove,
      bodyScrollTop: state => state.search.bodyScrollTop,
      loadMore: state => state.search.loadMore
    }),
    facilityImage () {
      return type => iconPath[type]
    },
    containerStyle () {
      return { 
        'min-height': `calc(${this.clientHeight * 0.9}px - 20vw)`, 
        top: `${this.deltaY}px` 
      }
    },
    itemStyle () {
      return (id, type) => {
        return {
          'background-color': (this.selectedItem.id === id && this.itemSelected) ? '#E6E3DF' : 'transparent'
        }
      }
    },
    searchTitle () {
      // return type ? `"${decodeURIComponent(this.query)}" in ${type.charAt(0).toUpperCase()}${type.slice(1)}` : ''
      return this.query && this.dataType ? this.$i18n.t('search.moreTopbar',{ query: decodeURIComponent(this.query), type: this.$i18n.t(`placeType.${this.dataType}`) }) : ''
    },
    itemLocation () {
      return (item, type) => {
        if (type === 'building' || !(item.floor_name && item.building_name)) return item.zone
        else return `${this.$t("place.floor." + item.floor_name)}, ${item.building_name}, ${item.zone}`
      }
    },
    
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
        this.itemList = unifySearchItem(this.itemList.concat(data.content || []))
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
            this.itemList = unifySearchItem(this.itemList.concat(data.content || []))
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
        this.selectItem({ ...this.selectedItem, dataType: this.dataType })
        this.stopBubble(e)
      }
    },

    ontouchendback (e) {
      if (!this.move) this.$emit('back')
    },

    stopBubble (e) { 
      if ( e?.stopPropagation ) e.stopPropagation()
      else window.event.cancelBubble = true
    }, 
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