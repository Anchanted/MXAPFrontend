<template>
  <div class="search-result" ref="container" :style="{ 'min-height': `calc(${$store.state.clientHeight * 0.9}px - 20vw)` }">
    <div v-if="loading" style="width: 100%; height: 100%; padding: 0 3vw; position: absolute; top: 0; background-color: #F8F8F8;">
      <loading style="width: 100%; height: 100%; background: #F8F8F8; position: absolute;"></loading>
      <error-panel v-if="loadingError" style="width: 100%; height: 100%; background: #F8F8F8; position: absolute;"
        @refresh="search"></error-panel>
    </div>
    <!-- <loading v-if="loading" style="width: 100%; position: absolute; top: 0; background-color: #F8F8F8;" :style="{ height: 'calc('+ clientHeight * 0.9 +'px - 20vw)' }"></loading> -->
    <div v-show="displayTop">
      <div v-if="hasResult" class="search-result-top">
        <div v-if="buildingTotal > 0" class="search-result-section">
          <div class="search-result-section-type">{{$t('itemType.building')}}</div>
          <div class="search-result-section-items">
            <place-card v-for="building in topBuildingList" :key="building.id"
              :simple="false" :type="'building'" :style="itemStyle(building.id, 'building')"
              @touchstart.native="ontouchstartitem($event, building, 'building')"
              @touchmove.native="ontouchmoveitem"
              @touchend.native="ontouchenditem">
              <template #icon>{{building.code}}</template>
              <template #name>{{building.name}}</template>
              <template #location>{{itemLocation(building, 'building')}}</template>
            </place-card>
            <div v-if="buildingTotal > 3" class="search-result-section-items-more"
              @touchstart="ontouchstartmore"
              @touchmove="ontouchmovemore"
              @touchend="ontouchendmore($event, 'building')">
              {{$t('search.viewMore')}}
            </div>
          </div>
        </div>
        <div v-if="roomTotal > 0" class="search-result-section">
          <div class="search-result-section-type">{{$t('itemType.room')}}</div>
          <div class="search-result-section-items">
            <place-card v-for="room in topRoomList" :key="room.id"
              :simple="false" :type="'room'" :style="itemStyle(room.id, 'room')"
              @touchstart.native="ontouchstartitem($event, room, 'room')"
              @touchmove.native="ontouchmoveitem"
              @touchend.native="ontouchenditem">
              <template #icon>{{room.building_code}}</template>
              <template #name>{{room.name}}</template>
              <template #type>{{room.type}}</template>
              <template #location>{{itemLocation(room, 'room')}}</template>
            </place-card>

            <div v-if="roomTotal > 3" class="search-result-section-items-more"
              @touchstart="ontouchstartmore"
              @touchmove="ontouchmovemore"
              @touchend="ontouchendmore($event, 'room')">
              {{$t('search.viewMore')}}
            </div>
          </div>
        </div>
        <div v-if="facilityTotal > 0" class="search-result-section">
          <div class="search-result-section-type">{{$t('itemType.facility')}}</div>
          <div class="search-result-section-items">
            <place-card v-for="facility in topFacilityList" :key="facility.id"
              :simple="false" :type="'facility'" :style="itemStyle(facility.id, 'facility')"
              @touchstart.native="ontouchstartitem($event, facility, 'facility')"
              @touchmove.native="ontouchmoveitem"
              @touchend.native="ontouchenditem">
              <template #icon>
                <img :src="facilityImage(facility.type)" :alt="facility.type">
              </template>
              <template #name>{{facility.name}}</template>
              <template #type>{{facility.type}}</template>
              <template #location>{{itemLocation(facility, 'facility')}}</template>
            </place-card>

            <div v-if="facilityTotal > 3" class="search-result-section-items-more"
              @touchstart="ontouchstartmore"
              @touchmove="ontouchmovemore"
              @touchend="ontouchendmore($event, 'facility')">
              {{$t('search.viewMore')}}
            </div>
          </div>
        </div>
      </div>

      <div v-else class="search-result-no">{{$t('search.noResult')}}</div>
    </div>

    <transition name="search-more" @before-enter="beforeEnter" @after-enter="afterEnter" @before-leave="beforeLeave" @after-leave="afterLeave">
      <!-- <search-more v-if="displayMore" :data-type="moreType" @back="hideMore"></search-more> -->
      <!-- <search-more v-if="$route.params.type" :style="moreContainerStyle" :change="transformMore" @back="hideMore"></search-more> -->
      <search-more v-if="$route.params.type" :change="transformMore" :delta-y="transformMoreDistance" @back="hideMore"></search-more>
    </transition>

  </div>
</template>

<script>
import SpinnerCircle from 'components/Spinner/SpinnerCircle'
import SearchMore from 'views/Search/SearchMore'
import Loading from 'components/Loading'
import PlaceCard from 'components/PlaceCard'
import ErrorPanel from 'components/ErrorPanel'

import iconPath from 'utils/facilityIconPath.js'

import { mapState } from 'vuex'

export default {
  components: {
    SpinnerCircle,
    SearchMore,
    Loading,
    PlaceCard,
    ErrorPanel
  },
  data() {
    return {
      moveInItem: false,
      moveInMore: false,
      topBuildingList: [],
      topRoomList: [],
      topFacilityList: [],
      buildingTotal: 0,
      roomTotal: 0,
      facilityTotal: 0,
      itemSelected: false,
      selectedItem: {},
      selectedItemType: '',
      hasResult: false,
      query: null,
      itemTimeout: 0,
      loading: true,
      loadingError: false,
      topScrollTop: 0,
      displayTop: true,
      transformMore: false,
      transformMoreDistance: 0,
    }
  },
  computed: {
    ...mapState(['clientHeight']),
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
        if (type === 'building') return `${this.$t("place.zone." + item.zone || "b")}`
        else return `${this.$t("place.floor." + item.floor_name)}, ${item.building_name}, ${this.$t("place.zone." + item.zone || "b")}`
      }
    },
  },
  methods: {
    async search () {
      this.loadingError = false
      this.loading = true
      try {
        // if (!this.$route.query.q) throw new Error('Invalid request. Please try again.')
        if (this.$route.query.q !== '') {
          const data = await this.$api.search.searchTop({ q: this.$route.query.q, id: this.$route.params.buildingId && this.$route.params.buildingId })
          console.log(data)
          this.topBuildingList = data.building.content
          this.buildingTotal = data.building.totalElements
          this.topRoomList = data.room.content
          this.roomTotal = data.room.totalElements
          this.topFacilityList = data.facility.content
          this.facilityTotal = data.facility.totalElements

          this.hasResult = this.buildingTotal > 0 || this.roomTotal > 0 || this.facilityTotal > 0
        } else this.hasResult = false

      } catch (error) {
        this.hasResult = false
        this.loadingError = true
        throw error
      } finally {
        this.$nextTick(() => {
          if (!this.loadingError) this.loading = false
          this.$store.commit('search/setRouterViewHeight', this.$refs.container.offsetHeight)
        })
      }
    },

    hideMore () {
      this.displayTop = true
      this.transformMoreDistance = this.topScrollTop - this.$store.state.search.bodyScrollTop
      this.transformMore = true
      this.$nextTick(() => {
        this.$store.commit('search/setScrollToFromChild', `u${this.topScrollTop}`)
        this.$store.commit('search/setRouterViewHeight', this.$refs.container.offsetHeight)
        this.$router.push({
          name: 'Search',
          params: {
            buildingId: this.$route.params.buildingId,
            floorId: this.$route.params.floorId
          },
          query: {
            q: this.$route.query.q
          }
        })
      })
    },

    ontouchstartitem (e, item, type) {
      this.selectedItem = item
      this.selectedItemType = type
      this.itemSelected = true
      this.moveInItem = false
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
        this.selectItem({ ...this.selectedItem, dataType: this.selectedItemType })
        this.stopBubble(e)
      }
    },

    ontouchstartmore (e) {
      this.moveInMore = false
    },
    ontouchmovemore (e) {
      this.moveInMore = true
    },
    ontouchendmore (e, type) {
      if (!this.moveInMore) {
        this.topScrollTop = this.$store.state.search.bodyScrollTop
        this.$router.push({
          name: 'Search',
          params: {
            type,
            buildingId: this.$route.params.buildingId,
            floorId: this.$route.params.floorId
          },
          query: {
            q: this.$route.query.q
          }
        })
      }
    },

    stopBubble (e) { 
      if ( e && e.stopPropagation ) e.stopPropagation()
      else window.event.cancelBubble = true
    }, 

    beforeEnter () {
      // console.log('before enter')
      this.transformMoreDistance = 0
      this.transformMore = true
    },

    afterEnter () {
      // console.log('after enter')
      this.displayTop = false
      this.transformMore = false
    },

    beforeLeave () {
    //   console.log('before leave')
    },

    afterLeave () {
      this.transformMore = false
    }


  },
  mounted () {
    this.loading = true
    console.log('top mounted')
    // this.search()
    // const query = this.query
    // const validQuery = query && query.trim() !== ''
    // if (validQuery) {
    //   const url = `/search/?q=${encodeURIComponent(this.text)}`
    //   const data = await this.$api.get(url)
    //   console.log(data)
    //   this.topBuildingList = data.building.content
    //   this.buildingTotal = data.building.totalElements
    //   this.topRoomList = data.room.content
    //   this.roomTotal = data.room.totalElements
    //   this.topFacilityList = data.facility.content
    //   this.facilityTotal = data.facility.totalElements

    //   this.hasResult = this.buildingTotal > 0 || this.roomTotal > 0 || this.facilityTotal > 0
    //   console.log(this.hasResult)
    //   // this.bounce = true
    // } else this.hasResult = false
    this.$store.commit('search/setScrollToFromChild', 0)
    this.search()
    if (this.$route.params.type) this.displayTop = false
  },
  watch: {
    // '$route': function (newVal, oldVal) {
      // if (oldVal.name === 'Search' && oldVal.params.type && newVal.name === 'Search' && !newVal.params.type) {
      //   this.displayTop = true
      //   this.transformMoreDistance = this.topScrollTop - this.$store.state.search.bodyScrollTop
      //   console.log(this.topScrollTop, this.$store.state.search.bodyScrollTop)
      //   this.transformMore = true
      //   this.$nextTick(() => {
      //     this.$store.commit('search/setScrollToFromChild', `u${this.topScrollTop}`)
      //     this.$store.commit('search/setRouterViewHeight', this.$refs.container.offsetHeight)
      //   })
      // }
    // },
  },
  beforeRouteEnter (to, from, next) {
    if (!to.query.q) next({ name: 'PageNotFound' })
    else next()
  },
  beforeRouteUpdate (to, from, next) {
    if (!to.query.q) next({ name: 'PageNotFound' })
    else next()
  }
}
</script>

<style lang="scss">
.search-result {
  width: 100vw;
  height: auto;
  // position: absolute;
  // top: 0;
  z-index: 160;
  background: #F8F8F8;

  &-top {
    width: 100vw;
    height: auto;
    // padding: 2vw 3vw;
    padding-bottom: 2vw;
    display: flex;
    flex-direction: column;
    
    .search-result-section {
      width: 100%;
      height: auto;
      // padding: 0 3vw;
      line-height: 1;
      border-bottom: 1px #C6C6C6 solid;
      
      &-type {
        font-size: 6vw;
        font-weight: bold;
        line-height: 2;
        vertical-align: middle;
        padding: 0 3vw;
      }

      &-items {
        width: 100%;
        height: auto;

        &-more {
          width: auto;
          height: auto;
          margin: 0 3vw;
          padding: 2vw 0;
          border-top: 1px #C6C6C6 solid;
          font-size: 5vw;
          color: #0069d9;
          text-align: center;
          line-height: 1.5;
        }
      }
    }
  }

  &-no {
    width: 100vw;
    padding-top: 10vw;
    font-size: 5vw;
    text-align: center;
  }
}

.search-more-enter-active, .search-more-leave-active {
  transition: transform .2s linear;
}
.search-more-enter, .search-more-leave-to {
  transform: translateX(100vw);
}
.search-more-enter-to, .search-more-leave {
  transform: translateX(0px);
}
</style>