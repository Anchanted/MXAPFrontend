<template>
  <div class="direction-page" ref="page">
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

    <loading-panel
      v-show="showLoading"
      loading-text
      network-image
      :empty-text="errorInfo"
      ref="loadingPanel"
      class="direction-loading-panel"
      @refresh="searchDirection"/>
  </div>
</template>

<script>
import HttpError from "assets/js/HttpError"

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
      showLoading: false,
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
            if (this.$route.query[key].match(/^(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)(,((f)?(-?\d+))?)?$/i)) {
              obj["location"] = {
                x: Math.floor(parseFloat(RegExp.$1) * 10) / 10,
                y: Math.floor(parseFloat(RegExp.$3) * 10) / 10
              }
              if (RegExp.$8) {
                obj[RegExp.$7 ? "floorId": "level"] = parseInt(RegExp.$8) || null
              }
              obj["id"] = 0
              obj["placeType"] = "place"
              obj["name"] = this.$t("place.marker.place")
            }
          } else if (key.match(/^(from|to)Id$/)) {
            const obj = RegExp.$1 === "to" ? toObj : fromObj
            if (`${this.$route.query[key]}`.match(this.placeIdReg)) {
              obj["id"] = parseInt(RegExp.$1)
              if (RegExp.$3) {
                obj["floorId"] = parseInt(RegExp.$3)
              }
            }
          }
        }
        if (this.$isEmptyObject(this.globalFromObj)) {
          this.$store.commit("direction/setGlobalFromObj", (fromObj.location || fromObj.id) ? fromObj : {})
        }
        if (this.$isEmptyObject(this.globalToObj)) {
          this.$store.commit("direction/setGlobalToObj", (toObj.location || toObj.id) ? toObj : {})
        }

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
      this.showLoading = true
      this.$refs.loadingPanel?.setLoading()

      this.$emit("scrollpanel", "m")

      try {
        const query = {}
        if (this.globalFromText) {
          query["fromName"] = this.globalFromText
        }
        if (this.globalFromObj.id != null) {
          if (this.globalFromObj.id === 0) {
            if (this.globalFromObj.location?.x != null && this.globalFromObj.location?.y != null) {
              query["fromLocation"] = this.getLocationString(this.globalFromObj)
            }
          } else {
            query["fromId"] = this.getIdString(this.globalFromObj)
          }
        }
        if (this.globalToText) {
          query["toName"] = this.globalToText
        }
        if (this.globalToObj.id != null) {
          if (this.globalToObj.id === 0) {
            if (this.globalToObj.location?.x != null && this.globalToObj.location?.y != null) {
              query["toLocation"] = this.getLocationString(this.globalToObj)
            }
          } else {
            query["toId"] = this.getIdString(this.globalToObj)
          }
        }
        query["mode"] = this.transportList.find(e => e.travelMode === this.$route.query.mode)?.travelMode || this.transportList[0].travelMode
        const locationStr = this.getSearchLocation()
        if (locationStr) {
          query["location"] = locationStr
        }

        this.$store.commit("direction/setGlobalPathList", [])
        
        console.log(query)
        const data = await this.$api.direction.getPath(query)
        console.log(data)
        const start = data.start
        const end = data.end
        const pathList = data.pathList

        if (typeof(start) === "string") this.errorInfo = start || ""
        else if (typeof(end) === "string") this.errorInfo = end || ""
        else if (typeof(pathList) === "string") this.errorInfo = pathList || ""

        const startObj = {}
        const endObj = {}
        if (start instanceof Object) {
          this.globalObjKeyArr.forEach(key => startObj[key] = start[key])
          if (start.location?.x != null && start.location?.y != null) {
            startObj["location"] = {
              x: Math.round(start.location.x * 10) / 10,
              y: Math.round(start.location.y * 10) / 10
            }
          }
        }
        if (end instanceof Object) {
          this.globalObjKeyArr.forEach(key => endObj[key] = end[key])
          if (end.location?.x != null && end.location?.y != null) {
            endObj["location"] = {
              x: Math.round(end.location.x * 10) / 10,
              y: Math.round(end.location.y * 10) / 10
            }
          }
        }
        this.$store.commit("direction/setGlobalFromObj", startObj)
        this.$store.commit("direction/setGlobalToObj", endObj)
        this.$store.commit("direction/setGlobalPathList", pathList instanceof Array ? pathList : [])

        const routerPathIndex = this.$route.query.route != null ? (parseInt(this.$route.query.route) || 0) - 1 : null 
        let validPathIndex = null
        if (pathList instanceof Array && pathList.length) {
          validPathIndex = 0
          if (routerPathIndex != null && routerPathIndex > 0 && routerPathIndex < pathList.length) validPathIndex = routerPathIndex
        }

        let refreshRoute = false
        if (startObj.name && startObj.name !== this.globalFromText) refreshRoute = true
        if (startObj.id) {
          if (this.getIdString(startObj) !== this.$route.query.fromId) refreshRoute = true
        } else if (startObj.location?.x != null && startObj.location?.y != null) {
          if (this.getLocationString(startObj) !== this.$route.query.fromLocation) refreshRoute = true
        }
        if (endObj.name && endObj.name !== this.globalToText) refreshRoute = true
        if (endObj.id) {
          if (this.getIdString(endObj) !== this.$route.query.toId) refreshRoute = true
        } else if (endObj.location?.x != null && endObj.location?.y != null) {
          if (this.getLocationString(endObj) !== this.$route.query.toLocation) refreshRoute = true
        }
        if (data.travelMode !== this.$route.query.mode || validPathIndex !== routerPathIndex) refreshRoute = true

        if (refreshRoute) {
          const query = { ...this.$route.query }
          if (startObj.id) {
            query["fromId"] = this.getIdString(startObj)
          } else if (startObj.location?.x != null && startObj.location?.y != null) {
            query["fromLocation"] = this.getLocationString(startObj)
          }
          if (endObj.id) {
            query["toId"] = this.getIdString(endObj)
          } else if (endObj.location?.x != null && endObj.location?.y != null) {
            query["toLocation"] = this.getLocationString(endObj)
          }
          query["mode"] = data.travelMode
          if (validPathIndex != null) {
            query["route"] = validPathIndex + 1
          }
          this.$router.push({ 
            name: "Direction",
            params: {
              fromText: startObj.name || this.globalFromText,
              toText: endObj.name || this.globalToText,
              locationInfo: this.$route.params.locationInfo,
              floorId: this.$route.params.floorId,
              noRequest: true
            },
            query
          })
        }

        if (!this.errorInfo) {
          this.showLoading = false
        } else {
          this.$refs.loadingPanel?.setEmpty()
          this.$emit("scrollpanel", "t")
        }
      } catch (error) {
        console.log(error)
        if (error instanceof HttpError) {
          this.$refs.loadingPanel?.setNetworkError()
        } else {
          this.$refs.loadingPanel?.setError()
        }
      }
    },
    
    ontouchendcard(e, index) {
      if (!this.moveInCard) {
        if (index !== this.globalPathListIndex) this.$store.commit("direction/setGlobalPathListIndex", index)
        this.$EventBus.$emit("displayPath")
        this.$emit("scrollpanel", "m")
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
      const routeIndex = (parseInt(to.query.route) || 0) - 1
      vm.$store.commit("direction/setGlobalPathListIndex", routeIndex)
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
      if (!noRequest) {
        this.$nextTick(() => this.searchDirection())
      }
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

  .direction-loading-panel {
    width: 100%; 
    height: 100%;
    background: #F8F8F8; 
    position: absolute; 
    top: 0; 
  }
}
</style>