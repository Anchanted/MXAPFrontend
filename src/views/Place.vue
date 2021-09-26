<template>
  <div class="place-page" ref="page">
    <div class="place-basic">
      <div class="place-basic-name" :style="{ color: displayHeader ? '#F8F8F8' : 'black' }">{{place.name}}</div>
      <div class="place-basic-secondary">
        <span v-if="place.code" class="place-basic-secondary-code">{{place.code}}</span><span class="place-basic-secondary-type"><pre v-if="place.code"> · </pre>{{place.type ? place.type.join(", ").capitalize() : ""}}</span>
      </div>
      <div v-if="timeText" class="place-basic-time">
        <span class="iconfont icon-clock place-basic-time-icon"></span>
        <span class="place-basic-time-text" :class="timeClass">{{timeText}}</span>
      </div>
    </div>

    <div class="place-address">
      <div class="place-address-text-wrapper">
        <div class="iconfont icon-marker place-address-icon text-secondary"></div>
        <div class="place-address-text">{{address}}</div>
        <!-- <link-address :place="place" @chooseFloor="ontouchendfloor"></link-address> -->
      </div>
      <div v-if="locateFloorList.length" class="place-address-locate">
        <button v-for="(pf, index) in locateFloorList" :key="index" 
          class="place-address-locate-cell btn btn-outline-primary"
          @touchstart="moveInFloor = false"
          @touchmove="moveInFloor = true"
          @touchend="ontouchendfloor($event, pf)">{{pf.floorName}}</button>
      </div>
    </div>

    <div v-if="place.imgUrl && place.imgUrl.length" class="place-image-area">
      <div class="place-image" :style="{ 'background-image': `url(${place.imgUrl[0] ? baseUrl + place.imgUrl[0] : defaultPic})` }" @click="viewImage">
      </div>
    </div>

    <div class="place-function-button">
      <template v-if="floorList.length">
        <button v-for="(placeFloor, index) in floorList" :key="index" class="place-function-button-direction"
          @touchstart="moveInDirection = false"
          @touchmove="moveInDirection = true"
          @touchend="ontouchenddirection($event, placeFloor)">{{directionName(placeFloor)}}</button>
      </template>
      <button v-if="place.id != null" class="place-function-button-share" 
        @touchstart="moveInShare = false"
        @touchmove="moveInShare = true"
        @touchend="ontouchendshare">{{$t('place.share')}}</button>
    </div>

    <div v-if="place.contact" class="place-section place-contact">
      <div class="place-section-title">{{$t('place.contact')}}</div>
      <div v-if="place.contact.phone" class="place-contact-section">
        <div class="iconfont icon-phone place-contact-section-icon"></div>
        <div>
          <span v-for="(e, index) in place.contact.phone" :key="index" style="display: block;">+86&nbsp;<a :href="`tel:${e}`">{{e}}</a></span>
        </div>
      </div>
      <div v-if="place.contact.email" class="place-contact-section">
        <div class="iconfont icon-mail place-contact-section-icon"></div>
        <div>
          <a v-for="(e, index) in place.contact.email" :key="index" style="display: block;" :href="`mailto:${e}`">{{e}}</a>
        </div>
      </div>
    </div>

    <div v-if="place.placeType === 'room' && lessonList.length > 0" class="place-section place-timetable">
      <div class="place-section-title">{{$t('place.timetable')}}</div>
      <timetable ref="timetable" :lessons="lessonList"></timetable>
    </div>

    <div v-if="place.description" class="place-section place-description">
      <div class="place-section-title">{{$t('place.description')}}</div>
      <div class="place-description-text">{{place.description}}</div>
    </div>

    <div v-if="infoFloorList.length" class="place-section place-floorinfo">
      <div class="place-section-title">{{$t('place.floorinfo')}}</div>
      <div class="place-floorinfo-content" v-for="(pf, index) in infoFloorList" :key="index">
        <span class="place-floorinfo-content-title">{{pf.floorName}}</span>
        <div class="place-floorinfo-content-body">{{(pf.info instanceof Array && pf.info.length) ? pf.info.join('\n') : $t("none")}}</div>
      </div>
    </div>

    <div v-if="place.department" class="place-section place-department">
      <div class="place-section-title">{{$t('place.department')}}</div>
      <div class="place-department-text">{{(place.department instanceof Array && place.department.length) ? place.department.join('\n') : $t("none")}}</div>
    </div>

    <div v-if="showLoading" class="place-loading">
      <div class="place-loading-header">{{headerName}}</div>
      <loading-panel
        :height="clientHeight * 0.4 - clientWidth * 0.04"
        loading-text
        network-image
        ref="loadingPanel"
        class="place-loading-panel"
        @refresh="getPlaceInfo"/>
    </div>
  </div>
</template>

<script>
import HttpError from "assets/js/HttpError"

import Timetable from 'components/Timetable'
import LoadingPanel from "components/LoadingPanel"

import { mapState } from 'vuex'

const LinkAddress = {
  props: {
    place: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      moveInFloor: false
    } 
  },
  render(h) {
    let addressArr = []
    const placeFloorList = this.place.floorList
    const buildingName = this.place.buildingName
    const zone = this.place.zone || this.place.buildingZone 
    if (this.place.address) addressArr.push(this.place.address)
    if (placeFloorList) {
      const floorArr = placeFloorList
        .filter(e => !!e.floorId && this.place.placeType !== "building")
        .map(pf => h("a", {
          attrs: {
            href: "javascript:void(0);"
          },
          on: {
            touchstart: (e) => this.moveInFloor = false,
            touchmove: (e) => this.moveInFloor = true,
            touchend: (e) => {
              if (!this.moveInFloor) {
                this.$emit("chooseFloor", pf)
                this.stopBubble(e)
              }
            }
          }
        }, [this.$t("place.floor." + (pf.floorName || "GF"))]))
        if (floorArr.length) {
          const floorElementArr = []
          floorArr.forEach((e, i) => {
            floorElementArr.push(e)
            if (i < floorArr.length - 1) floorElementArr.push(this.$t("place.floor.conj"))
          })
          addressArr.push(floorElementArr)
        }
      }
    if (buildingName) addressArr.push(buildingName)
    if (zone) addressArr.push(this.$t(`place.zone.${zone}`))
    if (this.$t("place.address.reverse") === "true") addressArr = addressArr.reverse()
    const finalAddressArr = []
    addressArr.forEach((e, i) => {
      finalAddressArr.push(e)
      if (i < addressArr.length - 1) finalAddressArr.push(this.$t("place.address.conj"))
    })
    finalAddressArr.flat()
    return h("div", {
      attrs: {
        class: "place-address-text"
      },
    }, finalAddressArr)
  }
}

export default {
  components: {
    Timetable,
    LoadingPanel,
    LinkAddress
  },
  data () {
    return {
      firstRoute: false,
      baseUrl: process.env.VUE_APP_BASE_API,
      lessonList: [],
      place: {},
      showLoading: true,
      loadingName: '',
      moveInFloor: false,
      moveInDirection: false,
      moveInShare: false
    }
  },
  computed: {
    ...mapState({
      displayHeader: state => state.place.displayHeader,
      headerName: state => state.place.headerName
    }),

    address() {
      let addressArr = []
      const floorList = this.place.floorList
      const buildingName = this.place.buildingName
      const zone = this.place.zone || this.place.buildingZone 
      if (this.place.address) addressArr.push(this.place.address)
      if (floorList) {
        const filteredFloorList = floorList.filter(e => !!e.floorId && this.place.placeType !== "building")
        filteredFloorList.sort((a, b) => a.floorLevelIndex - b.floorLevelIndex)
        const groupedFloorArr = []
        for (let i = 0; i < filteredFloorList.length; i++) {
          const e = filteredFloorList[i];
          if (i === 0 || e.floorLevelIndex - filteredFloorList[i-1].floorLevelIndex > 1) {
            groupedFloorArr.push([e])
          } else {
            groupedFloorArr[groupedFloorArr.length - 1].push(e)
          }
        }
        const hasConsecutive = groupedFloorArr.some(e => e.length > 1)
        const floorStr = groupedFloorArr.map(arr => hasConsecutive ? (arr.length === 1 ? `${arr[0].floorName}` : `${arr[0].floorName}-${arr[arr.length - 1].floorName}`) : this.$t("place.floor." + (arr[0].floorName || "GF"))).join(this.$t("place.floor.conj"))
        if (floorStr) addressArr.push(floorStr)
      }
      if (buildingName) addressArr.push(buildingName)
      if (zone) addressArr.push(this.$t(`place.zone.${zone}`))
      if (this.$t("place.address.reverse") === "true") addressArr = addressArr.reverse()
      return addressArr.join(this.$t("place.address.conj"))
    },

    itemType() {
      if (!this.place.id) return this.$t("place.marker.place")
      else if (this.place.placeType === "building") return this.place.code 
      else if (!!this.place.type && this.place.type instanceof Array) return this.place.type.map(e => e?.capitalize()).join(', ')
      return null
    },

    timeArr() {
      if (this.place.extraInfo?.time instanceof Array) {
        return this.place.extraInfo.time.filter(slot => slot instanceof Array && slot.length >= 2 && slot.every(e => typeof e === "number"))
      } else {
        return []
      }
    },

    timeText() {
      if (!this.timeArr.length) return ""
      if (this.timeArr.some(arr => arr[1] - arr[0] === 24)) {
        return this.$t("place.openHour.24")
      } else if (this.timeArr.some(arr => arr[1] - arr[0] === 0)) {
        return ""
      } else {
        const padding = (number) => ('0' + number).slice(-2)
        return this.timeArr.map(arr => {
          const startHour = Math.floor(arr[0])
          const startMinute = Math.floor((arr[0] - startHour) * 60)
          const endHour = Math.floor(arr[1])
          const endMinute = Math.floor((arr[1] - endHour) * 60)
          return `${padding(startHour)}:${padding(startMinute)} - ${padding(endHour)}:${padding(endMinute)}`
        }).join(", ")
      }
    },

    timeClass() {
      if (this.timeArr.some(arr => arr[1] - arr[0] === 24)) {
        return "text-success"
      } else {
        const current = new Date()
        const timeNum = current.getHours() + current.getMinutes() / 60
        if (!this.timeArr.some(arr => timeNum >= arr[0] && timeNum < arr[1])) {
          return "text-danger"
        }
      }
      return ""
    },

    floorList() {
      return this.place.floorList?.filter(e => (this.place.buildingId == null) === (e.floorId == null)) || [] 
    },

    locateFloorList() {
      return this.place.floorList?.filter(e => e.floorId != null) || [] 
    },

    infoFloorList() {
      return this.place.floorList?.filter(e => e.floorId != null && e.info) || [] 
    },

    directionName() {
      return placeFloor => {
        const floorName = placeFloor.level != null ? `${placeFloor.level}F` : placeFloor.floorName
        const suffix = (this.floorList.length > 1 && floorName) ? ` (${floorName})` : ""
        return this.$t("place.direction") + suffix
      }
    }
  },
  methods: {
    async getPlaceInfo() {
      const idStr = this.$route.query.id
      const location = this.$route.query.location

      const query = {}

      let floorId
      if (idStr?.match(this.placeIdReg)) {
        query["id"] = RegExp.$1
        if (RegExp.$3) {
          floorId = parseInt(RegExp.$3)
        }
      } else {
        query["location"] = location
      }

      this.$emit("scrollpanel", "m")

      try {
        const data = await this.$api.place.getPlaceInfo(query)
        console.log(data)
        if (!data.place) throw new Error("Data Not Found")
        this.place = { ...data.place }
        this.lessonList = data.place.extraInfo?.timetable || []

        this.$store.commit("place/setHeaderName", this.place.name)

        const placeFloorList = data.place.floorList || []
        const pf = placeFloorList.find(pf => pf.floorId == floorId) || placeFloorList[0] || {}
        if (pf.location?.x || pf.location?.x === 0) {
          pf.location.x = Math.round(pf.location.x * 10) / 10
        }
        if (pf.location?.y || pf.location?.y === 0) {
          pf.location.y = Math.round(pf.location.y * 10) / 10
        }
        if (this.firstRoute) {
          this.$store.commit("setFirstRouteValue", {
            ...data.place,
            ...pf
          })
        }
        this.$EventBus.$emit("updateSelectedPlace", {
          ...data.place,
          ...pf
        })

        this.showLoading = false
      } catch (error) {
        let message
        if (error instanceof HttpError) {
          message = error.message
          this.$refs.loadingPanel?.setNetworkError()
          if (error.status == 404) {
            this.$router.push({
              name: "Map",
              params: {
                locationInfo: this.$route.params.locationInfo,
                floorId: this.$route.params.floorId
              }
            })
          }
        } else {
          message = "Failed to get place information.\nPlease try again."
          this.$refs.loadingPanel?.setError()
        }
        this.$toast({
          message,
          time: 3000
        })
        this.bodyOverflow = false
      }
      this.$nextTick(() => {
        if (this.$refs.page) this.$store.commit('place/setBodyHeight', this.$refs.page.offsetHeight)
      })
    },

    ontouchendfloor(e, pf) {
      if (!this.moveInFloor) {
        this.$emit("viewmap")
        this.$store.commit("setFloorDataEvent", [this.place?.[this.place?.placeType === "building" ? "id" : "buildingId"], pf.floorId])
        this.$EventBus.$emit("setSelectedPlace", {
          ...this.place,
          ...pf
        })
        this.stopBubble(e)
      }
    },

    ontouchenddirection(e, placeFloor) {
      if (!this.moveInDirection) {
        this.$store.commit("direction/setCachedPlaceInfo", { params: this.$route.params, query: this.$route.query })
        
        const obj = {}
        this.globalObjKeyArr.forEach(key => obj[key] = this.place[key])
        obj["level"] = placeFloor.level
        obj["floorId"] = placeFloor.floorId
        if (placeFloor.location?.x != null && placeFloor.location?.y != null) {
          obj["location"] = {
            x: Math.round(placeFloor.location.x * 10) / 10,
            y: Math.round(placeFloor.location.y * 10) / 10
          }
        }
        this.$store.commit("direction/setGlobalToObj", obj)

        const query = {
          mode: this.transportList[0].travelMode
        }
        if (obj.id) {
          query["toId"] = this.getIdString(obj)
        } else if (obj.location?.x != null && obj.location?.y != null) {
          query["toLocation"] = this.getLocationString(obj)
        }
        this.$router.push({ 
          name: "Direction", 
          params: { 
            toText: this.place.name,
            locationInfo: this.$route.params.locationInfo,
            floorId: this.$route.params.floorId,
            geolocation: true
          },
          query
        })
        this.stopBubble(e)
      }
    },

    ontouchendshare(e) {
      if (!this.moveInShare) {
        this.copytText(window.location.href)
        this.stopBubble(e)
      }
    },

    viewImage() {
      const filteredArr = this.place?.imgUrl?.filter(url => !!url).map(url => this.baseUrl + url)
      if (!filteredArr?.length) return
      this.$store.commit("setImageUrlListEvent", filteredArr)
    }
  },
  mounted() {
    if (this.$route.name === "Place") {
      this.getPlaceInfo()
    }
  },
  beforeRouteEnter(to, from, next) {
    next(vm => {
      if ((!from?.name || !from?.matched?.length) && vm.$store.state.firstRouteName === "Place") {
        vm.firstRoute = true
      }
    })
  }
}
</script>

<style lang="scss">
.place-page {
  padding: 0 3vw 2vw;
  // width: 94vw;
  width: 100vw;
  height: auto;
  min-height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  // min-height: 101%;
  // align-items: center;
  
  .place-basic {
    width: calc(100% - 5vw);
    height: auto;
    // background: red;
    padding-bottom: 2vw;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    flex-shrink: 0;

    &-name {
      width: 100%;
      line-height: 7vw;
      font-size: 6vw;
      font-weight: bold;
    }

    &-secondary {
      // position: relative;
      width: 100%;
      margin-top: 2vw;
      color: #888888;
      font-size: 4vw;
      line-height: 1.5;

      span {
        display: inline;

        pre {
          display: inline;
          margin: 0;
          padding: 0;
          color: inherit;
          font-weight: bold;
          font-size: inherit;
          position: static;
        }
      }
    }

    &-time {
      margin-top: 2vw;
      color: #888888;
      font-size: 4vw;
      line-height: 1.5;

      &-icon {
        font-size: 4vw;
        line-height: 1;
        margin-right: 2vw;
      }
    }
  }

  .place-address {
    width: 100%;
    padding: 3vw 0;
    border-top: 1px #C6C6C6 solid;

    .place-address-text-wrapper {
      color: #888888;
      display: flex;
      align-items: center;

      .place-address-icon {
        width: 7vw;
        height: 7vw;
        font-size: 7vw;
        line-height: 7vw;
        flex-shrink: 0;
        // color: blue;
      }
  
      .place-address-text {
        font-size: 4vw;
        flex-grow: 1;
        margin-left: 4vw;
        line-height: 1.5;
        color: black;
      }
    }

    &-locate {
      margin-top: 3vw;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      grid-row-gap: 2vw;
      grid-column-gap: 2vw;

      &-cell {
        font-size: 3.5vw;
        padding: 2vw 0;
        border-radius: 2vw;
        // text-align: center;

        // &:hover {
        //   background: #cce5ff;
        // }
      }
    }
  }

  .place-function-button {
    padding: 1.5vw 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-row-gap: 1.5vw;
    grid-column-gap: 1.5vw;
    // display: flex;
    // flex-wrap: wrap;
    // align-items: center;
    border-top: 1px #C6C6C6 solid;

    button {
      margin: 1.5vw 2vw;
      background-color: transparent;
      background-color: #0069d9;
      color: white;
      // border: 2px solid #D1D1D1;
      outline: none;

      padding: 0 4vw;
      height: 10vw;
      font-size: 4vw;
      line-height: 10vw;
      position: relative;
      border-radius: 5vw;
      outline: none;
      border: none;

      &:before {
        font-family: "iconfont";
        color: white;
        margin-right: 2vw;
        font-size: 4.5vw;
      }
    }

    &-direction {
      &:before {
        content: "\e9fd";
      }
    }

    &-indoor {
      &:before {
        content: "\e61b";
      } 
    }

    &-share {
      &:before {
        content: "\e60c";
      } 
    }
  }

  .place-image-area {
    width: 100%;
    height: 56vw;
    padding: 3vw 0;
    border-top: 1px #C6C6C6 solid;
    flex-shrink: 0;

    .place-image {
      width: 100%;
      height: 50vw;
      background-repeat: no-repeat;
      background-size: cover;
      background-position: center;
      flex-shrink: 0;
    }
  }

  .place-section {
    width: 100%;
    height: auto;
    padding: 1.5vw 0 1vw;
    border-top: 1px #C6C6C6 solid;
    flex-shrink: 0;

    &-title {
      font-weight: bold;
      font-size: 5vw;
      margin-bottom: 1vw;
    }
  }

  .place-contact {
    &-section {
      font-size: 4vw;
      line-height: 2;
      padding: 0 2vw 1vw;
      vertical-align: middle;
      display: flex;
      align-items: center;

      &-icon {
        font-size: 5vw;
        line-height: 8vw;
        color: #888888;
        font-weight: bold;
        margin-right: 5vw;
      }

      // a {
      //   text-decoration: none;
      //   color: inherit;
      // }
    }
  }

  .place-description {
    &-text {
      font-size: 4vw;
      line-height: 1.5;
      white-space: pre-line;
      word-wrap: break-word;
      // word-break: normal;
    }
  }

  .place-floorinfo {
    &-content {
      display: flex;
      border-bottom: 1px #C6C6C6 solid;
      padding: 1vw 0;
      font-size: 4vw;
      line-height: 1.5;

      &-title {
        width: 10vw;
        font-weight: bold;
        flex-shrink: 0;
      }

      &-body {
        white-space: pre-line;
      }

      &:last-child {
        border-bottom: none;
      }
    }
  }

  .place-department {
    &-text {
      font-size: 4vw;
      line-height: 1.5;
      white-space: pre-line;
    }
  }

  .place-loading {
    position: absolute;
    top: 0;
    width: calc(100% - 6vw);
    height: 100%;
    background: #F8F8F8;
    margin: 0;
    border: none;

    &-header {
      position: absolute;
      top: 0;
      width: calc(100% - 5vw);
      font-size: 4vw;
      line-height: 7vw;
      font-size: 6vw;
      font-weight: bold;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      z-index: 1;
    }
    
    &-panel {
      width: 100%; 
      height: 100%;
    }
  }
}
</style>