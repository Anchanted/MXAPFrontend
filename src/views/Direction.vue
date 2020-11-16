<template>
  <div class="direction-page" ref="page">
    <loading-panel
      v-if="loading"
      :has-error="loadingError"
      class="direction-loading-panel"
      @refresh="searchDirection">
    </loading-panel>

    <div v-else-if="errorInfo" class="path-error">
      {{errorInfo}}
      Please try again.
    </div>

    <div v-else>
      <div v-for="(path, index) in globalPathList" :key="index" 
        class="path-card" 
        :class="{ 'path-card-selected': index === globalPathListIndex }"
        @touchstart="moveInCard = false"
        @touchmove="moveInCard = true"
        @touchend="ontouchendcard($event, index)">
        <div class="path-card-text">
          <span class="path-card-text-name">{{$t("direction.route", { number: index + 1 })}}</span>
          <span v-if="index === 0" class="path-card-text-notice">{{$t("direction.shortest")}}</span>
        </div>
        <div class="path-card-share">
          <button type="button" class="iconfont icon-share bg-primary text-white path-card-share-button"
            @touchstart="moveInShare = false"
            @touchmove="moveInShare = true" 
            @click="ontouchendshare($event, index)"></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import LoadingPanel from "components/LoadingPanel"

import { mapState } from 'vuex'

export default {
  name: "Direction",
  components: {
    LoadingPanel
  },
  data() {
    return {
      errorInfo: "",
      loading: false,
      loadingError: false,
      moveInCard: false,
      moveInShare: false
    }
  },
  computed: {
    ...mapState({
      globalFromText: state => state.direction.globalFromText,
      globalToText: state => state.direction.globalToText,
      globalFromObj: state => state.direction.globalFromObj,
      globalToObj: state => state.direction.globalToObj,
      globalPathList: state => state.direction.globalPathList,
      globalPathListIndex: state => state.direction.globalPathListIndex,
      currentTransportIndex: state => state.direction.transportIndex
    }),
  },
  methods: {
    async searchDirection(checkQuery = false) {
      if (checkQuery && !this.$isEmptyObject(this.$route.query)) {
        const fromObj = {}
        const toObj = {}
        for (let key in this.$route.query) {
          if (key.match(/^(from|to)Location$/)) {
            const obj = RegExp.$1 === "to" ? toObj : fromObj
            if (this.$route.query[key].match(/^(\d+),(\d+)(,([+-]?\d{1,2})?)?$/)) {
              obj["location"] = {
                x: parseInt(RegExp.$1) || 0,
                y: parseInt(RegExp.$2) || 0
              }
              obj["level"] = parseInt(RegExp.$4) || 0
              obj["id"] = 0
              obj["placeType"] = "place"
              obj["name"] = this.$t("place.marker.place")
            }
          } else if (key.match(/^(from|to)Indoor$/)) {
            const obj = RegExp.$1 === "to" ? toObj : fromObj
            if (this.$route.query[key].match(/^(\d+),(\d+)$/)) {
              obj["buildingId"] = parseInt(RegExp.$1) || 0
              obj["floorId"] = parseInt(RegExp.$2) || 0
            }
          }
        }
        if (this.$isEmptyObject(this.globalFromObj)) this.$store.commit("direction/setGlobalFromObj", fromObj.location ? fromObj : {})
        if (this.$isEmptyObject(this.globalToObj)) this.$store.commit("direction/setGlobalToObj", toObj.location ? toObj : {})

        // url place text must be the same as the name in globalobj
        const params = {}
        if (this.globalFromObj.name && this.globalFromText !== this.globalFromObj.name && this.$route.params.fromText !== this.globalFromObj.name) {
          params["fromText"] = this.globalFromObj.name
        }
        if (this.globalToObj.name && this.globalToText !== this.globalToObj.namee && this.$route.params.toText !== this.globalToObj.name) {
          params["toText"] = this.globalToObj.name
        }
        if (!this.$isEmptyObject(params)) {
          this.$router.push({
            name: "Direction",
            params: {
              ...this.$route.params,
              ...params
            },
            query: this.$route.query
          })
          return
        }
      }

      if (!this.globalFromText || !this.globalToText) {
        if (this.$route.params.geolocation && this.$store.state.button.locationActivated) {
          this.$store.commit("direction/setIsSelectorTo", false)
          this.$store.commit("direction/toSelectorMap")
          this.$nextTick(() => this.$EventBus.$emit("selfFromLocation"))
          this.$toast({
            message: "Please confirm your current position.",
            time: 3000
          })
        }
        return
      }

      this.errorInfo = ""
      this.loading = true
      this.loadingError = false

      this.$emit("onscrollpanel", "m")

      try {
        const params = {}
        params["fromName"] = this.globalFromText
        if (this.globalFromObj.id === 0) {
          if (this.globalFromObj.location?.x != null && this.globalFromObj.location?.y != null) params["fromLocation"] = `${this.globalFromObj.location.x},${this.globalFromObj.location.y}` + (this.globalFromObj.level != null ? `,${this.globalFromObj.level}` : "")
          if (this.globalFromObj.buildingId && this.globalFromObj.floorId) params["fromIndoor"] = `${this.globalFromObj.buildingId},${this.globalFromObj.floorId}`
        }
        params["toName"] = this.globalToText
        if (this.globalToObj.id === 0) {
          if (this.globalToObj.location?.x != null && this.globalToObj.location?.y != null) params["toLocation"] = `${this.globalToObj.location.x},${this.globalToObj.location.y}` + (this.globalToObj.level != null ? `,${this.globalToObj.level}` : "")
          if (this.globalToObj.buildingId && this.globalToObj.floorId) params["toIndoor"] = `${this.globalToObj.buildingId},${this.globalToObj.floorId}`
        }
        params["mode"] = this.transportList.find(e => e.travelMode === this.$route.query.mode)?.travelMode || this.transportList[0].travelMode

        this.$store.commit("direction/setGlobalPathList", [])
        
        const data = await this.$api.direction.getPath(params)
        console.log(data)
        const start = data.start
        const end = data.end
        const pathList = data.pathList

        if (typeof(start) === "string") this.errorInfo = start || ""
        else if (typeof(end) === "string") this.errorInfo = end || ""
        else if (typeof(pathList) === "string") this.errorInfo = pathList || ""

        const startObj = {}
        const endObj = {}
        if (start instanceof Object) this.globalObjKeyArr.forEach(key => startObj[key] = start[key])
        if (end instanceof Object) this.globalObjKeyArr.forEach(key => endObj[key] = end[key])
        this.$store.commit("direction/setGlobalFromObj", startObj)
        this.$store.commit("direction/setGlobalToObj", endObj)
        this.$store.commit("direction/setGlobalPathList", pathList instanceof Array ? pathList : [])

        const routerPathIndex = this.$route.query.route != null ? (parseInt(this.$route.query.route) || 0) - 1 : null 
        let validPathIndex = null
        if (pathList instanceof Array && pathList.length) {
          validPathIndex = 0
          if (routerPathIndex != null && routerPathIndex > 0 && routerPathIndex < pathList.length) validPathIndex = routerPathIndex
        }

        if ((start?.name && start.name !== this.globalFromText) 
            || (end?.name && end.name !== this.globalToText) 
            || data.travelMode !== this.$route.query.mode
            || validPathIndex !== routerPathIndex) {
          const query = {
            ...this.$route.query,
            mode: data.travelMode,
            route: validPathIndex + 1
          }
          if (validPathIndex == null) delete query.route
          this.$router.push({ 
            name: "Direction",
            params: {
              fromText: start?.name || this.globalFromText,
              toText: end?.name || this.globalToText,
              buildingId: this.$route.params.buildingId,
              floorId: this.$route.params.floorId,
              locationInfo: this.$route.params.locationInfo,
              noRequest: true
            },
            query
          })
        }

        if (!this.loadingError) this.loading = false
      } catch (error) {
        console.log(error)
        this.loadingError = true
        this.$toast({
          message: 'Failed to get path.\nPlease try again.',
          time: 3000
        })
      }

      if (this.errorInfo) {
        this.$emit("onscrollpanel", "t")
      }
    },
    
    ontouchendcard(e, index) {
      if (!this.moveInCard) {
        if (index !== this.globalPathListIndex) this.$store.commit("direction/setGlobalPathListIndex", index)
        this.$EventBus.$emit("displayPath")
        this.$EventBus.$emit("scrollDirectionPanel", "m")
        this.stopBubble(e)
      }
    },

    ontouchendshare(e, index) {
      if (!this.moveInShare) {
        setTimeout(() => this.copyText(window.location.href), 500)
      }
    }
  },
  watch: {
    currentTransportIndex(val) {
      if (val == null) return
      const mode = this.transportList[val]?.travelMode || this.transportList[0].travelMode
      if (this.$route.query.mode === mode) return
      this.$router.replace({ 
        name: "Direction",
        params: this.$route.params,
        query: {
          ...this.$route.query,
          mode
        }
      })
    },
    globalPathListIndex(val) {
      if (val === (parseInt(this.$route.query.route) || 0) - 1) return
      this.$router.replace({ 
        name: "Direction",
        params: {
          ...this.$route.params,
          noRequest: true
        },
        query: {
          ...this.$route.query,
          route: val + 1
        }
      })
    }
  },
  beforeRouteEnter(to, from, next) {
    const fromText = to.params.fromText?.trim() || ""
    const toText = to.params.toText?.trim() || ""
    next(vm => {
      vm.$store.commit("direction/setGlobalFromText", fromText)
      vm.$store.commit("direction/setGlobalToText", toText)
      vm.$store.commit("direction/clearSelectorRouter")
      if (!fromText || !toText) vm.$store.commit("direction/toSelector", true)
      const modeIndex = vm.transportList.findIndex(e => e.travelMode === to.query.mode)
      vm.$store.commit("direction/setTransportIndex", modeIndex === -1 ? 0 : modeIndex)
      vm.searchDirection(true)
    })
  },
  beforeRouteUpdate(to, from, next) {
    const fromText = to.params.fromText?.trim() || ""
    const toText = to.params.toText?.trim() || ""
    
    this.$store.commit("direction/setGlobalFromText", fromText)
    this.$store.commit("direction/setGlobalToText", toText)
    const modeIndex = this.transportList.findIndex(e => e.travelMode === to.query.mode)
    this.$store.commit("direction/setTransportIndex", modeIndex === -1 ? 0 : modeIndex)
    const routeIndex = (parseInt(to.query.route) || 0) - 1
    this.$store.commit("direction/setGlobalPathListIndex", routeIndex)

    const noRequest = to.params.noRequest
    delete to.params.noRequest
    next()
    if (this.checkRouterChange(to.fullPath, from.fullPath)) {
      this.$store.commit("direction/clearSelectorRouter")
      if (!fromText || !toText) this.$store.commit("direction/toSelector", true)
      if (!noRequest) this.searchDirection()
    }
  },
  beforeRouteLeave(to, from, next) {
    this.$store.commit("direction/setGlobalFromObj", {})
    this.$store.commit("direction/setGlobalToObj", {})
    this.$store.commit("direction/setGlobalPathList", [])
    this.$store.commit("direction/setGlobalPathListIndex", -1)
    setTimeout(() => {
      this.$store.commit("direction/setGlobalFromText", "")
      this.$store.commit("direction/setGlobalToText", "")
    }, 500)
    next()
  }
}
</script>

<style lang="scss">
.direction-page {
  width: 100%;
  height: auto;
  min-height: 100%;
  background: #F8F8F8;
  position: relative;

  .direction-loading-panel {
    width: 100%; 
    height: 100%; 
    position: absolute; 
    top: 0; 
  }

  .path-error {
    padding: 20vw 5vw;
    font-size: 4vw;
    text-align: center;
    color: #888888;
  }

  .path-card {
    width: 100%;
    height: 30vw;
    padding: 6vw 8vw;
    border-bottom: 1px #C6C6C6 solid;
    display: flex;
    justify-content: space-between;
    align-items: center;

    &-text {
      height: 100%;

      span {
        display: block;
      }

      &-name {
        font-size: 4.5vw;
        font-weight: bold;
        color: #565656;
        margin-bottom: 1vw;
      }

      &-notice {
        font-size: 3.5vw;
        color: #888888;
      }
    }

    &-share {
      display: flex;
      flex-direction: column;
      align-items: center;

      &-button {
        width: 8vw;
        height: 8vw;
        border-radius: 4vw;
        padding: 0;
        margin: 0;
        font-size: 4vw;
        line-height: 1;
      }

      &-text {
        display: block;
        text-align: center;
        font-size: 0.8rem;
      }
    }
  }

  .path-card-selected {
    background-color: #f4f9fd;
  }
}
</style>