<template>
  <div class="place-page" ref="page">
    <div class="place-basic">
      <div class="place-basic-name" :style="{ color: displayHeader ? '#F8F8F8' : 'black' }">{{place.name}}</div>
      <div class="place-basic-secondary">
        <span v-if="place.code" class="place-basic-secondary-code">{{place.code}}</span><span class="place-basic-secondary-type"><pre v-if="place.code"> · </pre>{{place.type ? place.type.join(", ").capitalize() : ""}}</span>
      </div>
      <!-- <div v-if="timeInfo" class="place-basic-time" :class="{ 'text-success': place.extraInfo && place.extraInfo.endTime - place.extraInfo.startTime === 24 }">{{timeInfo}}</div> -->
      <div v-if="timeInfo" class="place-basic-time">
        <span class="iconfont icon-clock place-basic-time-icon"></span>
        <span class="place-basic-time-text" :class="{ 'text-success': place.extraInfo && place.extraInfo.endTime - place.extraInfo.startTime === 24 }">{{timeInfo}}</span>
      </div>
    </div>

    <div class="place-address">
      <div class="iconfont icon-marker place-address-icon text-secondary"></div>
      <div class="place-address-text">{{placeAddress}}</div>
    </div>

    <div class="place-button">
      <template v-if="floorList.length">
        <button v-for="(placeFloor, index) in floorList" :key="index" class="place-button-direction"
          @touchstart="ontouchstartdirection"
          @touchmove="ontouchmovedirection"
          @touchend="ontouchenddirection($event, placeFloor)">{{directionName(placeFloor)}}</button>
      </template>
      <button v-if="place.baseFloorId" class="place-button-indoor" 
        @touchstart="ontouchstartindoor"
        @touchmove="ontouchmoveindoor"
        @touchend="ontouchendindoor">{{$t('place.indoor')}}</button>
      <button v-if="place.id != null" class="place-button-share" 
        @touchstart="ontouchstartshare"
        @touchmove="ontouchmoveshare"
        @touchend="ontouchendshare">{{$t('place.share')}}</button>
    </div>

    <div v-if="place.imgUrl" class="place-image-area">
      <div class="place-image" :style="{ 'background-image': 'url('+baseUrl+place.imgUrl+')' }" @click="viewImage">
      </div>
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

    <div v-if="place.department" class="place-section place-department">
      <div class="place-section-title">{{$t('place.department')}}</div>
      <div class="place-department-text">{{place.department.length ? place.department.join('\n') : $t("place.departmentNone")}}</div>
    </div>

    <div v-if="place.description" class="place-section place-description">
      <div class="place-section-title">{{$t('place.description')}}</div>
      <div class="place-description-text">{{place.description}}</div>
    </div>

    <div v-if="loading" class="place-loading">
      <div class="place-loading-header">{{headerName}}</div>
      <loading-panel
        :has-error="loadingError"
        class="place-loading-panel"
        @refresh="getPlaceInfo">
      </loading-panel>
    </div>
  </div>
</template>

<script>
import Timetable from 'components/Timetable'
import LoadingPanel from "components/LoadingPanel"

import { mapState } from 'vuex'

export default {
  components: {
    Timetable,
    LoadingPanel
  },
  data () {
    return {
      baseUrl: process.env.VUE_APP_BASE_API + '/static',
      lessonList: [],
      place: {},
      loading: true,
      loadingName: '',
      loadingError: false,
      moveInDirection: false,
      moveInIndoor: false,
      moveInShare: false
    }
  },
  computed: {
    ...mapState({
      displayHeader: state => state.place.displayHeader,
      headerName: state => state.place.headerName
    }),
    
    placeAddress() {
      let addressArr = []
      const floorInfo = this.place.floorInfo
      const buildingName = this.place.buildingName
      const zone = this.place.zone || this.place.buildingZone 
      if (this.place.address) addressArr.push(this.place.address)
      if (floorInfo) {
        const floorStr = floorInfo.filter(e => !!e.floorId).map(e => this.$t("place.floor." + (e.floorName || "GF"))).join(this.$t("place.floor.conj"))
        if (floorStr) addressArr.push(floorStr)
      }
      if (buildingName) addressArr.push(buildingName)
      if (zone) addressArr.push(this.$t(`place.zone.${zone}`))
      if (this.$t("place.address.reverse") === "true") addressArr = addressArr.reverse()
      return addressArr.join(this.$t("place.address.conj"))
    },

    itemType() {
      if (!this.place.id) return this.$t("place.marker.place")
      else if (this.place.placeType === 'building') return this.place.code 
      else if (!!this.place.type && this.place.type instanceof Array) return this.place.type.map(e => e?.capitalize()).join(', ')
      return null
    },

    timeInfo() {
      if (this.place.extraInfo?.startTime == null || this.place.extraInfo?.endTime == null) return ""
      const startHour = this.place.extraInfo.startTime
      if (this.place.placeType === "portal") {
        if (this.place.extraInfo.endTime - this.place.extraInfo.startTime === 24) {
          return this.$t("place.openHour.24")
        } else {
          const padding = (number) => ('0' + number).slice(-2)
          const startHour = Math.floor(this.place.extraInfo.startTime)
          const startMinute = Math.floor((this.place.extraInfo.startTime - startHour) * 60)
          const endHour = Math.floor(this.place.extraInfo.endTime)
          const endMinute = Math.floor((this.place.extraInfo.endTime - endHour) * 60)
          return `${padding(startHour)}:${padding(startMinute)} - ${padding(endHour)}:${padding(endMinute)}`
        }
      } else if (this.place.placeType === "room" && this.place.extraInfo.endTime - this.place.extraInfo.startTime === 24) {
        return this.$t("place.openHour.24")
      } else {
        return ""
      }
    },

    floorList() {
      return this.place.floorInfo ? this.place.floorInfo.filter(e => this.place.buildingId == null && e.floorId == null) : [] 
    },

    directionName() {
      return placeFloor => {
        const suffix = (this.floorList.length > 1 && placeFloor.level < 0) ? ` (${this.$t("place.level.underground")})` : ""
        return this.$t("place.direction") + suffix
      }
    }
  },
  methods: {
    async getPlaceInfo() {
      const { id, location } = this.$route.query
      const { buildingId, floorId } = this.$route.params

      const params = {
        id: id,
        location,
        indoor: (!id && (buildingId && floorId)) ? `${buildingId},${floorId}` : null
      }

      this.loadingError = false
      this.loading = true

      this.$emit("onscrollpanel", "m")

      try {
        const data = await this.$api.place.getPlaceInfo(params)
        console.log(data)
        if (!data.place) throw new Error('Data Not Found')
        this.place = { ...data.place }
        this.lessonList = data.place.extraInfo?.timetable || []

        this.$store.commit("place/setHeaderName", this.place.name)
      } catch (error) {
        console.log(error)
        this.$toast({
          message: 'Failed to get place information.\nPlease try again.',
          time: 3000
        })
        this.bodyOverflow = false
        this.loadingError = true
      } finally {
        if (!this.loadingError) this.loading = false
        this.$nextTick(() => {
          if (this.$refs.page) this.$store.commit('place/setBodyHeight', this.$refs.page.offsetHeight)
        })
      }
    },

    ontouchstartdirection(e) {
      this.moveInDirection = false
    },
    ontouchmovedirection(e) {
      this.moveInDirection = true
    },
    ontouchenddirection(e, placeFloor) {
      if (!this.moveInDirection) {
        this.$store.commit("direction/setCachedPlaceInfo", { params: this.$route.params, query: this.$route.query })
        
        const obj = {}
        this.globalObjKeyArr.forEach(key => obj[key] = this.place[key])
        obj["level"] = placeFloor.level
        obj["floorId"] = placeFloor.floorId
        obj["location"] = placeFloor.location
        this.$store.commit("direction/setGlobalToObj", obj)

        const query = {
          mode: this.transportList[0].travelMode
        }
        if (placeFloor.location?.x != null && placeFloor.location?.y != null) query["toLocation"] = `${placeFloor.location.x},${placeFloor.location.y}` + (placeFloor.level != null ? `,${placeFloor.level}` : "")
        if (this.place.buildingId && placeFloor.floorId) query["toIndoor"] = `${this.place.buildingId},${placeFloor.floorId}`
        this.$router.push({ 
          name: "Direction", 
          params: { 
            buildingId: null, 
            floorId: null,
            toText: this.place.name,
            locationInfo: !this.$route.params.buildingId && !this.$route.params.floorId ? this.$route.params.locationInfo : null,
            geolocation: true
          },
          query
        })
        this.stopBubble(e)
      }
    },

    ontouchstartindoor(e) {
      this.moveInIndoor = false
    },
    ontouchmoveindoor(e) {
      this.moveInIndoor = true
    },
    ontouchendindoor(e) {
      if (!this.moveInIndoor) {
        this.$router.push({
          name: "Map", 
          params: { 
            buildingId: this.place.id, 
            floorId: this.place.baseFloorId 
          }
        })
        this.stopBubble(e)
      }
    },

    ontouchstartshare(e) {
      this.moveInShare = false
    },
    ontouchmoveshare(e) {
      this.moveInShare = true
    },
    ontouchendshare(e) {
      if (!this.moveInShare) {
        const tag = document.createElement('input');
        tag.setAttribute('id', 'cp_hgz_input');
        tag.value = window.location.href;
        document.getElementsByTagName('body')[0].appendChild(tag);
        document.getElementById('cp_hgz_input').select();
        document.execCommand('copy');
        document.getElementById('cp_hgz_input').remove();

        this.$toast({
          message: "Link successfully added to the clipboard!",
          time: 3000
        })
        this.stopBubble(e)
      }
    },

    viewImage() {
      if (!this.place?.imgUrl) return
      this.$EventBus.$emit("viewImage", this.baseUrl + this.place.imgUrl)
    }
  },
  mounted() {
    if (this.$route.name === "Place") {
      this.getPlaceInfo()
    }
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
    color: #888888;
    display: flex;
    align-items: center;
    border-top: 1px #C6C6C6 solid;

    &-icon {
      width: 7vw;
      height: 7vw;
      font-size: 7vw;
      line-height: 7vw;
      flex-shrink: 0;
      // color: blue;
    }

    &-text {
      font-size: 4vw;
      flex-grow: 1;
      margin-left: 4vw;
      line-height: 1.5;
      color: black;
    }
  }

  .place-button {
    padding: 1.5vw 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
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

  .place-department {
    &-text {
      font-size: 4vw;
      line-height: 1.5;
      white-space: pre-line;
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