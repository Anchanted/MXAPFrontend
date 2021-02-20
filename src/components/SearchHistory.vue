<template>
  <div class="history-container" ref="container">
    <place-card v-for="(item, index) in itemList" :key="index"
      simple 
      cancelable
      :item="item"
      :selected="itemIndex === index && itemSelected"
      @touchstart.native="ontouchstart($event, index)"
      @touchmove.native="ontouchmove"
      @touchend.native="ontouchend"/>
  </div>
</template>

<script>
import PlaceCard from 'components/PlaceCard'

import { mapState } from 'vuex'

export default {
  components: {
    PlaceCard
  },
  data() {
    return {
      itemSelected: false,
      itemIndex: -1,
      moveInItem: false,
    }
  },
  computed: {
    ...mapState({
      itemList: state => state.search.historyList
    })
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
        if (e.target.classList?.contains("icon-close")) {
          this.$store.dispatch("search/saveHistoryList", { "item": this.itemIndex, "unifySearchItem": this.unifySearchItem })
        } else {
          this.selectItem(this.itemList[this.itemIndex])
        }
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