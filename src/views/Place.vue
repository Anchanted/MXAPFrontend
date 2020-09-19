<template>
  <div class="modal-body" ref="modalBody">
    <div class="modal-basic">
      <!-- <div class="modal-basic"> -->
      <div class="modal-basic-name" :style="{color: displayHeader ? '#F8F8F8' : 'black'}">{{place.name}}</div>
      
      <div class="modal-basic-type">
        <span class="modal-basic-type-placeType">{{$t(`placeType.${place.placeType || ''}`)}}</span><span class="modal-basic-type-itemType"><b>&nbsp;&nbsp;·&nbsp;&nbsp;</b>{{itemType}}</span>
      </div>
    </div>

    <div class="modal-address">
      <div class="iconfont icon-marker modal-address-icon"></div>
      <div class="modal-address-text">{{place.address || placeAddress}}</div>
    </div>

    <div class="modal-button">
      <template v-if="!place.buildingId && !place.floorId">
        <button v-for="level in levelList" :key="level" class="modal-button-direction"
          @touchstart="ontouchstartdirection"
          @touchmove="ontouchmovedirection"
          @touchend="ontouchenddirection($event, level)">{{directionName(level)}}</button>
      </template>
      <button v-if="place.baseFloorId" class="modal-button-indoor" 
        @touchstart="ontouchstartindoor"
        @touchmove="ontouchmoveindoor"
        @touchend="ontouchendindoor">{{$t('place.indoor')}}</button>
      <button v-if="place.id != null" class="modal-button-share" 
        @touchstart="ontouchstartshare"
        @touchmove="ontouchmoveshare"
        @touchend="ontouchendshare">{{$t('place.share')}}</button>
    </div>

    <div v-if="place.imgUrl" class="modal-image-area">
      <div class="modal-image" :style="{'background-image': 'url('+baseUrl+place.imgUrl+')'}">
        <!-- <img src="" alt=""> -->
      </div>
    </div>

    <div v-if="place.phone || place.email" class="modal-section modal-contact">
      <div class="title">{{$t('place.contact')}}</div>
      <div v-if="place.phone" class="modal-contact-section">
        <div class="iconfont icon-phone modal-contact-section-icon"></div>
        <div>
          <span v-for="(e, index) in place.phone" :key="index" style="display: block;">+86&nbsp;<a :href="`tel:${e}`">{{e}}</a></span>
        </div>
      </div>
      <div v-if="place.email" class="modal-contact-section">
        <div class="iconfont icon-mail modal-contact-section-icon"></div>
        <div>
          <a v-for="(e, index) in place.email" :key="index" style="display: block;" :href="`mailto:${e}`">{{e}}</a>
        </div>
      </div>
    </div>

    <div v-if="place.placeType === 'room' && lessonList.length > 0" class="modal-section modal-timetable">
      <div class="title">{{$t('place.timetable')}}</div>
      <timetable ref="timetable" :lessons="lessonList"></timetable>
    </div>

    <div v-if="place.placeType === 'building'" class="modal-section modal-allocation">
      <div class="title">{{$t('place.department')}}</div>
      <div class="modal-allocation-detail">{{departmentAllocation}}</div>
    </div>

    <div v-if="place.description" class="modal-section modal-description">
      <div class="title">{{$t('place.description')}}</div>
      <div class="modal-description-text" v-html="placeDescription"></div>
    </div>

    <div v-if="loading" class="modal-loading">
      <div class="modal-loading-header">{{headerName}}</div>
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
      scrollTop: 0,
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
      const floor = this.place.floorInfo || this.place.floorName
      const building = this.place.buildingName
      let zone = this.place.zone || this.place.buildingZone 
      if (floor) {
        if (floor instanceof Array) addressArr.push(floor.map(e => this.$t("place.floor." + (e.floorName || "GF"))).join(this.$t("place.floor.conj")))
        else if (typeof(floor) === "string") addressArr.push(this.$t("place.floor." + floor))
      }
      if (building) addressArr.push(building)
      addressArr.push(this.$t("place.zone." + (zone || "b")))
      if (this.$t("place.address.reverse") === "true") addressArr = addressArr.reverse()
      return addressArr.join(this.$t("place.address.conj"))
    },

    itemType() {
      if (!this.place.id) return this.$t("place.marker.place")
      else if (this.place.placeType === 'building') return this.place.code 
      else if (!!this.place.type && this.place.type instanceof Array) return this.place.type.map(e => e?.capitalize()).join(', ')
      return null
    },

    levelList() {
      return this.place.levelList || (this.place.level != null ? [this.place.level] : [])
    },

    directionName() {
      return (level) => {
        const suffix = (this.levelList.length > 1 && level < 0) ? ` (${this.$t("place.level.underground")})` : ""
        return this.$t("place.direction") + suffix
      }
    },

    departmentAllocation() {
      const str = this.place.department
      return str ? str.replace(/,/g, '\n') : this.$t("place.departmentNone")
    },

    placeDescription() {
      return this.place.description.replace(/\\n/g, "<br />")
    }
  },
  methods: {
    async getPlaceInfo() {
      const {id, type, location} = this.$route.query
      const {buildingId, floorId} = this.$route.params

      const params = {
        pid: (id && type) ? `${type?.substr(0, 1)}${id}` : null,
        location,
        indoor: (!(id && type) && (buildingId && floorId)) ? `${buildingId},${floorId}` : null
      }

      this.loadingError = false
      this.loading = true
      try {
        const data = await this.$api.place.getPlaceInfo(params)
        console.log(data)
        if (!data.place) throw new Error('Data Not Found')
        this.place = { ...data.place }
        this.lessonList = data.place.timetable || []

        this.$store.commit("place/setHeaderName", this.place.name)
      } catch (err) {
        console.log(err)
        this.$toast({
          message: err.message || 'Failed to get place information.\nPlease try again.',
          time: 3000
        })
        this.bodyOverflow = false
        this.loadingError = true
      } finally {
        if (!this.loadingError) this.loading = false
        this.$nextTick(() => {
          if (this.$refs.modalBody) this.$store.commit('place/setBodyHeight', this.$refs.modalBody.offsetHeight)
        })
      }
    },

    ontouchstartdirection(e) {
      this.moveInDirection = false
    },
    ontouchmovedirection(e) {
      this.moveInDirection = true
    },
    ontouchenddirection(e, level) {
      if (!this.moveInDirection) {
        this.$store.commit("direction/setCachedPlaceInfo", { params: this.$route.params, query: this.$route.query })
        
        const obj = {}
        this.globalObjKeyArr.forEach(key => obj[key] = this.place[key])
        obj["level"] = level
        this.$store.commit("direction/setGlobalToObj", obj)

        const query = {}
        if (this.place.location?.x != null && this.place.location?.y != null) query["toLocation"] = `${this.place.location.x},${this.place.location.y}` + (level != null ? `,${level}` : "")
        if (this.place.buildingId && this.place.floorId) query["toIndoor"] = `${this.place.buildingId},${this.place.floorId}`
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
    }
  },
  mounted() {
    if (this.$route.name === "Place") {
      this.getPlaceInfo()
    }
  },
  beforeRouteEnter(to, from, next) {
    next(vm => {
      vm.$store.commit('place/setCollapse', false)
    })
  },
  beforeRouteUpdate(to, from, next) {
    this.$store.commit('place/setCollapse', false)
    next()
  },
  beforeRouteLeave(to, from, next) {
    this.$store.commit("place/setRouterLeave", true)
    this.$store.commit('place/setCollapse', true)
    next()
  }
}
</script>

<style lang="scss" scoped>
.title {
  font-weight: bold;
  font-size: 5vw;
  margin-bottom: 1vw;
}

.modal-close {
  background: #E6E3DF;
  color: #8E8E93;
  font-size: 3vw;
  height: 5vw;
  width: 5vw;
  line-height: 5vw;
  text-align: center;
  vertical-align: middle;
  border-radius: 2.5vw;
  flex-shrink: 0;
}

.modal-body {
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
  
  .modal-basic {
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

    &-type {
      width: 100%;
      margin-top: 2vw;
      color: #888888;
      font-size: 4vw;
      position: relative;

      span {
        display: inline;
      }
    }
  }

  .modal-address {
    width: 100%;
    padding: 3vw 0;
    color: #8E8E93;
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

  .modal-button {
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
        font-weight: bold;
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

  .modal-image-area {
    width: 100%;
    height: 56vw;
    padding: 3vw 0;
    border-top: 1px #C6C6C6 solid;
    flex-shrink: 0;

    .modal-image {
      width: 100%;
      height: 50vw;
      background-repeat: no-repeat;
      background-size: cover;
      background-position: center;
      flex-shrink: 0;
    }
  }

  .modal-section {
    width: 100%;
    height: auto;
    padding: 1.5vw 0 1vw;
    border-top: 1px #C6C6C6 solid;
    flex-shrink: 0;
  }

  .modal-contact {

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
        color: #8E8E93;
        font-weight: bold;
        margin-right: 5vw;
      }

      // a {
      //   text-decoration: none;
      //   color: inherit;
      // }
    }
  }

  .modal-description {

    &-text {
      font-size: 4vw;
      line-height: 1.5;
      // white-space: pre-line;
      word-wrap: break-word;
      // word-break: normal;
    }
  }

  .modal-allocation {
    
    &-detail {
      font-size: 4vw;
      line-height: 1.5;
      white-space: pre-line;
    }
  }
  
}

.modal-loading {
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
  
  .place-loading-panel {
    width: 100%; 
    height: 100%;
  }
}

</style>