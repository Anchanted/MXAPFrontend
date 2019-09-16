<template>
  <div class="search-result" ref="container">
    <loading v-if="loading" style="width: 100%; position: absolute; top: 0; background-color: #F8F8F8;" :style="{ height: 'calc('+ ($store.state.clientHeight - 100) +'px - 20vw)' }"></loading>
    <div>
      <div v-if="hasResult" class="search-result-top">
        <div v-if="buildingTotal > 0" class="search-result-section">
          <div class="search-result-section-type">{{$t('itemType.building')}}</div>
          <div class="search-result-section-items">
            <div v-for="building in topBuildingList" :key="building.id" 
              :style="itemStyle(building.id, 'building')"
              class="search-result-section-item"
              @touchstart="ontouchstartitem($event, building, 'building')"
              @touchmove="ontouchmoveitem"
              @touchend="ontouchenditem">
              <div class="search-result-section-item-icon">{{building.code}}</div>
              <div class="search-result-section-item-info">
                <div class="search-result-section-item-info-name two-line">{{building.name}}</div>
                <div class="search-result-section-item-info-location one-line">{{itemLocation(building, 'building')}}</div>
              </div>
            </div>
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
            <div v-for="room in topRoomList" :key="room.id" 
              :style="itemStyle(room.id, 'room')"
              class="search-result-section-item"
              @touchstart="ontouchstartitem($event, room, 'room')"
              @touchmove="ontouchmoveitem"
              @touchend="ontouchenditem">
              <div class="search-result-section-item-icon">{{room.building_code}}</div>
              <div class="search-result-section-item-info">
                <div class="search-result-section-item-info-name one-line">{{room.name}}</div>
                <div class="search-result-section-item-info-type one-line">{{room.type}}</div>
                <div class="search-result-section-item-info-location one-line">{{itemLocation(room, 'room')}}</div>
              </div>
            </div>
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
                <div class="search-result-section-item-info-name one-line">{{facility.name}}</div>
                <div class="search-result-section-item-info-type one-line">{{facility.type}}</div>
                <div class="search-result-section-item-info-location one-line">{{itemLocation(facility, 'facility')}}</div>
              </div>
            </div>
            <div v-if="facilityTotal > 3" class="search-result-section-items-more"
              @touchstart="ontouchstartmore"
              @touchmove="ontouchmovemore"
              @touchend="ontouchendmore($event, 'facility')">
              {{$t('search.viewMore')}}
            </div>
          </div>
        </div>
      </div>

      <div v-else class="search-result-no">
        Your search returned no results
      </div>
    </div>

    <transition name="search-more">
      <!-- <search-more v-if="displayMore" :data-type="moreType" @back="hideMore"></search-more> -->
      <search-more v-if="$route.params.type"></search-more>
    </transition>

  </div>
</template>

<script>
import SpinnerCircle from 'components/Spinner/SpinnerCircle'
import SearchMore from 'views/Search/SearchMore'
import Loading from 'components/Loading'

import floorDict from 'utils/floor.json'
import buildingDict from 'utils/building.json'
import iconPath from 'utils/facilityIconPath.js'

export default {
  components: {
    SpinnerCircle,
    SearchMore,
    Loading
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
      topScrollTop: 0,
    }
  },
  computed: {
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
    async search () {
      this.loading = true
      try {
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
        this.$toast({
          message: 'Fail to search the query.\nPlease try again.',
          time: 3000
        })
        this.hasResult = false
        throw error
      } finally {
        this.$nextTick(() => {
          this.loading = false
          this.$store.commit('search/setRouterViewHeight', this.$refs.container.offsetHeight)
        })
      }
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
  },
  watch: {
    '$route': function (newVal, oldVal) {
      if (oldVal.name === 'Search' && oldVal.params.type && newVal.name === 'Search' && !newVal.params.type) {
        this.$store.commit('search/setScrollToFromChild', `u${this.topScrollTop}`)
        this.$store.commit('search/setRouterViewHeight', this.$refs.container.offsetHeight)
      }
    }
  },
}
</script>

<style lang="scss">
.search-result {
  width: 100vw;
  height: auto;
  // position: absolute;
  // top: 0;
  z-index: 600;
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
      padding: 0 3vw;
      line-height: 1;
      border-bottom: 1px #C6C6C6 solid;
      
      &-type {
        font-size: 6vw;
        font-weight: bold;
        line-height: 2;
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
            background: #0069d9;
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
            }
          }
        }

        &-more {
          width: 100%;
          height: auto;
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