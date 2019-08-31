<template>
  <div class="search-body-window" ref="indexWindow" :style="indexWindowStyle" 
    @touchstart="ontouchstartmodalbody($event, 'index')"
    @touchmove="ontouchmovemodalbody($event, 'index')">
    <div class="search-body-page" ref="indexPage">
      <search-history v-if="!doSearch" ref="historySearch" 
        @selectItem="selectItem"
        @updateHeight="updateHistoryHeight"></search-history>
      <search-top v-show="doSearch" ref="topSearch"
        @selectItem="selectItem"
        @getMoreResults="searchMore" 
        @updateHeight="updateTopHeight"></search-top>
      <!-- <search-more v-show="doSearch && displayMoreResult" :top="topHeight" ref="moreSearch"></search-more> -->
    </div>
  </div>
</template>

<script>
import SearchHistory from 'views/Search/SearchHistory'
import SearchTop from 'views/Search/SearchTop'

export default {
  components: {
    SearchHistory,
    SearchTop,
  },
  data () {
    return {
      lastClientY: 0,
      lastSwipeable: false,
      swipeable: false,
      overflow: false,
    }
  },
  computed: {

  }
}
</script>

<style>

</style>