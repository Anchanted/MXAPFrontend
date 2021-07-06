<template>
  <div class="keyword-container" ref="container">
    <place-card v-for="(item, index) in itemList" :key="index"
      simple 
      :item="item"
      :selected="itemIndex === index && itemSelected"
      @touchstart.native="ontouchstart($event, index)"
      @touchmove.native="ontouchmove"
      @touchend.native="ontouchend"/>
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
    if (this.updateHeight) {
      this.$nextTick(() => {
        this.$store.commit('search/setKeywordComponentHeight', this.$refs.container.offsetHeight)
      })
    }
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
          const locationStr = this.getSearchLocation()
          if (locationStr) {
            query["location"] = locationStr
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
      if (this.updateHeight) {
        this.$nextTick(() => {
          this.$store.commit('search/setKeywordComponentHeight', this.$refs.container.offsetHeight)
        })
      }
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