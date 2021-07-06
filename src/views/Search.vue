<template>
  <div class="search-page" ref="page" :style="pageStyle">
    <div class="search-topbar">{{$tc("search.result", totalNumber)}}</div>

    <div class="search-item-list">
      <place-card v-for="(item, index) in itemList" :key="index"
        class="search-item" 
        :item="item"
        :selected="itemIndex === index && itemSelected"
        @touchstart.native="ontouchstartitem($event, index)"
        @touchmove.native="ontouchmoveitem"
        @touchend.native="ontouchenditem"/>
    </div>

    <div v-if="currentPageNo < totalPages - 1" class="search-more-loading">
      <spinner-line></spinner-line>
    </div>
    <div v-else class="search-end">{{$t('search.noMore')}}</div>

    <loading-panel
      v-if="initializing"
      loading-text
      network-image
      empty-image
      ref="loadingPanel"
      class="search-loading-panel"
      :style="{ height: 'calc('+ clientHeight * 0.9 +'px - 20vw)' }"
      @refresh="initialSearch"/>
  </div>
</template>

<script>
import HttpError from "assets/js/HttpError"

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
      locationStr: null,
      requesting: false,
      initializing: true
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
    }
  },
  methods: {
    async initialSearch() {      
      this.$emit("scrollpanel", "t")

      try {
        const query = {
          q: this.query,
          n: this.currentPageNo
        }
        this.locationStr = this.getSearchLocation()
        if (this.locationStr) {
          query["location"] = this.locationStr
        }
        const data = await this.$api.search.searchPage(query)
        console.log(data)

        this.itemList = this.unifySearchItem(this.itemList.concat(data.content || []))
        this.totalPages = data.totalPages
        this.totalNumber = data.totalElements || 0

        if (this.totalNumber) {
          this.initializing = false
        } else {
          this.$refs.loadingPanel?.setEmpty()
        }
      } catch (error) {
        console.log(error)
        if (error instanceof HttpError) {
          this.$refs.loadingPanel?.setNetworkError()
        } else {
          this.$refs.loadingPanel?.setError()
        }
      }
      this.$nextTick(() => {
        this.$store.commit('search/setRouterViewHeight', this.$refs.page.offsetHeight)
        this.$store.commit('search/setLoadMore', false)
      })
    },

    async search() {
      if (this.requesting) return
      if (this.currentPageNo >= this.totalPages - 1) return

      this.requesting = true
      console.log('requesting')
      this.$emit("scrollpanel", "t")

      try {
        const query = {
          q: this.query,
          n: this.currentPageNo + 1
        }
        if (this.locationStr) {
          query["location"] = this.locationStr
        }
        const data = await this.$api.search.searchPage(query)
        console.log(data)
        this.itemList = this.unifySearchItem(this.itemList.concat(data.content || []))
        this.currentPageNo++
      } catch (error) {
        console.log(error)
        let message
        if (error instanceof HttpError) {
          message = error.message
          this.$refs.loadingPanel?.setNetworkError()
        } else {
          message = "Failed to load data.\nPlease try again."
          this.$refs.loadingPanel?.setError()
        }
        this.$toast({
          message,
          time: 3000
        })
        const length = this.itemList.length
        this.currentPageNo = Math.ceil(length / 10) - 1
      }
      this.requesting = false
      this.$store.commit('search/setLoadMore', false)
      this.$nextTick(() => {
        this.$store.commit('search/setRouterViewHeight', this.$refs.page.offsetHeight)
      })
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
    }
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
    // z-index: 180;
  }

  .search-item-list {
    width: 100vw;
    height: auto;
    padding: 8vw 0 0;

    .search-item:first-child > div {
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

  .search-loading-panel {
    width: 100%; 
    position: absolute; 
    top: 0; 
    background-color: #F8F8F8;
  }
}
</style>