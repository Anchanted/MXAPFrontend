<template>
  <div class="page" style="overflow: hidden;">
    <canvas-map
      ref="canvasMap"
      :map-level="mapLevel"
      :occupied-room-list="occupiedRoomList"
      :gate-list="gateList"    
      ></canvas-map>
      
    <button-group
      v-show="!displayVirtualButton"
      :button-list="buttonList"
      :current-floor="selectedFloor"
      :floor-list="floorList"
      :current-building="selectedBuilding"
      :occupation-time="occupationTime"
      :occupation-requesting="occupationRequesting"
      :gate-requesting="gateRequesting"
      :loading="loading"></button-group>

    <search-panel :current-floor-id="selectedFloor.id" ref="searchPanel"></search-panel>
    <direction-panel ref="directionPanel"></direction-panel>
    <direction-selector-panel ref="directionSelectorPanel"></direction-selector-panel>
    <direction-selector-map v-if="displaySelectorMap" ref="directionSelectorMapPanel"></direction-selector-map>
    <place-panel ref="placePanel"></place-panel>

    <datetime 
      v-if="displayDatetime"
      type="datetime" 
      v-model="occupationTime" 
      format="yyyy-MM-dd HH:mm"
      value-zone="Asia/Shanghai"
      zone="Asia/Shanghai"
      min-datetime="2019-08-26T00:00:00.000+08:00"
      max-datetime="2020-02-16T23:59:59.000+08:00"
      ref="dt"
      class="theme-mobile"
      input-id="datetime"
      :input-style="datetimeStyle"
      @input="datetimeInput"
      @close="datetimeClose">
      <template slot="button-cancel">
        {{$t('datePicker.cancel')}}
      </template>
      <template slot="button-confirm" slot-scope="scope">
        <span v-if='scope.step !== "time"'>{{$t('datePicker.next')}}</span>
        <span v-else>{{$t('datePicker.ok')}}</span>
      </template>  
    </datetime>

    <loading-panel
      v-if="loading"
      :style="{ height: `${clientHeight}px` }"
      :has-error="loadingError"
      class="canvas-map-loading-panel"
      @refresh="$router.go(0)">
    </loading-panel>
  </div>
</template>

<script>
import SearchPanel from 'components/SearchPanel'
import PlacePanel from 'components/PlacePanel'
import DirectionPanel from 'components/DirectionPanel'
import DirectionSelectorPanel from 'components/DirectionSelectorPanel'
import DirectionSelectorMap from 'components/DirectionSelectorMap'
import ButtonGroup from 'components/ButtonGroup'
import LoadingPanel from 'components/LoadingPanel'
import CanvasMap from "components/CanvasMap"

import weekInfo from 'assets/json/week.json'
import { DateTime, Interval } from 'luxon'

import { mapState } from 'vuex'

export default {
  name: "MapPage",
  components: {
    SearchPanel,
    PlacePanel,
    DirectionPanel,
    DirectionSelectorPanel,
    DirectionSelectorMap,
    ButtonGroup,
    LoadingPanel,
    CanvasMap
  },
  data() {
    return {
      campusImage: require("assets/images/map/campus/map.png"),
      mapType: null,
      selectedBuilding: {},
      selectedFloor: {},
      occupiedRoomList: [],
      placeList: [],
      floorList: [],
      gateList: null,
      geolocation: {},
      geoWatchId: null,
      occupationTime: null,
      loading: false,
      loadingError: false,
      occupationRequesting: false,
      gateRequesting: false,
      initialAlphaOffset: null
    }
  },
  computed: {
    ...mapState({
      direction: state => state.userDirection,
      imageMap: state => state.imageMap,
      displayVirtualButton: state => state.button.displayVirtualButton,
      gateActivated: state => state.button.gateActivated,
      occupationActivated: state => state.button.occupationActivated,
      locationActivated: state => state.button.locationActivated,
      compassActivated: state => state.button.compassActivated,
      selectorRouter: state => state.direction.selectorRouter
    }),
    buttonList () {
      const buttonList = this.mapType === "floor" ? ["floor", "home", "compass"] : ["direction", "location"]
      if (this.mapType === "floor") {
        if (this.selectedFloor.hasGate) buttonList.push("gate")
        if (this.selectedFloor.hasOccupation) buttonList.push("occupation")
      } 
      return buttonList
    },
    mapLevel() {
      return (this.selectedFloor?.indexNum || 0) - (this.selectedBuilding?.levelDifference || 0)
    },
    displayDatetime() {
      return this.buttonList.some(e => e === "occupation")
    },
    datetimeStyle () {
      return {
        width: '30vw',
        height: '9vw'
      }
    },
    displaySelectorMap() {
      return this.selectorRouter.length === 2 && this.selectorRouter.indexOf("selector") === 0 && this.selectorRouter.indexOf("map") === 1
    }
  },
  methods: {
    loadImage(url) {
      return new Promise(function (resolve, reject) {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = (e) => reject(e)
        image.crossOrigin = ''
        image.src = url
      })
    },

    async datetimeInput(dateStr) {
      // console.log('datetime', dateStr)
      if (dateStr) {
        const date = DateTime.fromISO(dateStr)
        const startDate = DateTime.fromISO(weekInfo["start"])
        const interval = Interval.fromDateTimes(startDate, date)
        const days = Math.floor(interval.length('day') || -1)
        if (days >= 0) {
          const weekIndex = Math.floor(days / 7)
          if (weekIndex < weekInfo["weeks"].length) {
            this.occupationTime = date.toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY)
            // console.log(date.toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY), DateTime.local().locale)
            const weekObj = weekInfo["weeks"][weekIndex]
            let noEmptyRoom = !!weekObj["number"]
            if (noEmptyRoom) {
              try {
                this.$toast({
                  message: 'Requesting...',
                  time: 10000
                })
                this.occupationRequesting = true
                const data = await this.$api.place.getOccupiedRoom(this.selectedFloor.id, {
                  week: weekObj["number"],
                  day: date.weekday,
                  hour: date.minute >= 30 ? date.hour + 0.5 : date.hour
                })
                console.log(data)
                if (!this.occupationRequesting) return
                this.occupationRequesting = false
                this.$toast({
                  message: `Successfully get occupied rooms at ${this.occupationTime}`,
                  time: 3000
                })
                if (!data.occupiedRoomList || data.occupiedRoomList.length === 0) {
                  noEmptyRoom = false
                } else {
                  this.occupiedRoomList = data.occupiedRoomList
                  // this.setSelectedPlace()
                }
              } catch (error) {
                console.log(error)
                this.occupationRequesting = false
                this.$toast({
                  message: 'Failed to get occupied rooms.\nPlease try again.',
                  time: 3000
                })
                this.occupiedRoomList = []
                this.$store.commit("button/setOccupationActivated", false)
              }
            } 
            
            if (!noEmptyRoom) {
              this.$toast({
                message: `No room occupied at ${this.occupationTime}`,
                time: 3000
              })
              this.occupiedRoomList = []
            }
          }
        }
      }
    },

    datetimeClose() {
      if (!this.$refs.dt.datetime) this.$store.commit("button/setOccupationActivated", false)
    },

    geolocationInfo(position) {
      const { longitude, latitude } = position?.coords
      // console.log(position)

      // this.$toast({
      //   message: `altitude: ${position.coords.altitude}
      //             heading: ${position.coords.heading}
      //             latitude: ${position.coords.latitude}
      //             longitude: ${position.coords.longitude}
      //             alpha: ${this.geolocation.direction}`,
      //   time: 3000
      // })

      if (longitude && latitude) {
        this.geolocation = {
          lon: longitude,
          lat: latitude
        }
      } else {
        throw new Error("Error getting location.")
      }
    },

    geolocationError(error) {
      let errorMessage
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "User denied the request for Geolocation."
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information is unavailable."
          break;
        case error.TIMEOUT:
          errorMessage = "Location request timed out."
          break;
        // case error.UNKNOWN_ERROR:
        default:
          errorMessage = "An unknown error occurred."
          break;
      }
      this.$toast({
        message: errorMessage,
        time: 3000
      })
      // throw new Error("errorMessage")
    },
    
    deviceOrientationHandler(event) {
      if (!event) return
      if (this.initialAlphaOffset === null) this.initialAlphaOffset = event.alpha || 0;
      
      const alpha = event.alpha != null ? Math.floor(event.alpha) : 0
      const rhalpha = (-alpha + 360) % 360

      this.$toast({
        message: `
          absolute: ${event.absolute}
          initial: ${this.initialAlphaOffset != null ? Math.floor(this.initialAlphaOffset) : this.initialAlphaOffset}
          alpha: ${(rhalpha + 90 + 360) % 360}
          webkit: ${event.webkitCompassHeading != null ? Math.floor(event.webkitCompassHeading) : event.webkitCompassHeading}
        `,
        time: 3000
      })

      // let alpha
      // // if (event.absolute !== true && +event.webkitCompassAccuracy > 0 && +event.webkitCompassAccuracy < 50) {
      // if (!event.absolute) {
      //   if (this.initialAlphaOffset === null) this.initialAlphaOffset = event.webkitCompassHeading || 0;
      // } else {
      //   if (this.initialAlphaOffset === null) this.initialAlphaOffset = event.alpha;
      // }
      // alpha = (event.webkitCompassHeading || event.alpha) - this.initialAlphaOffset;
      // if (alpha < 0) {
      //   alpha += 360;
      // }
      // this.$store.commit("setUserDirection", (event.webkitCompassHeading || event.alpha) && alpha)
    },

    useDeviceOrientation(flag) {
      if (!flag) {
        window.removeEventListener('deviceorientation', this.deviceOrientationHandler, false)
        this.$store.commit("setUserDirection", null)
        return
      }
      if (!window.DeviceOrientationEvent) {
        console.warn("DeviceOrientation is not supported in this device.");
        return
      }
      let addEvent = false
      if (typeof(window.DeviceOrientationEvent.requestPermission) === "function") {
        window.DeviceOrientationEvent.requestPermission().then(state => {
          if (state === "granted") {
            console.log("用户允许", state)
            addEvent = true
          } else if(state === "denied") {
            console.log("用户拒绝", state)
          } else if(state === "prompt") {
            console.log("用户干了啥", state)
          }
        }).catch(error => {
          console.log(error)
        });
      } else {
        // handle regular non iOS 13+ devices
        addEvent = true
      }
      if (addEvent) {
        window.removeEventListener('deviceorientation', this.deviceOrientationHandler, false);
        window.addEventListener("deviceorientation", this.deviceOrientationHandler, false);
      }
    }
  },

  async mounted() {
    this.loading = true
    this.$store.commit("setImageMap", new Map())

    this.loadImage(require("assets/images/sprite/marker_sprite.png")).then(image => this.imageMap.set("marker", image))
    this.loadImage(require("assets/images/icon/eye.png")).then(image => this.imageMap.set("eye", image))
    this.loadImage(require("assets/images/sprite/icon_sprite.png")).then(image => this.imageMap.set("icon", image))
    if (this.$route.params.buildingId) {   
      this.loadImage(require("assets/images/icon/group.png")).then(image => this.imageMap.set("group", image))
      this.loadImage(require("assets/images/sprite/arrow-sprite.png")).then(image => this.imageMap.set("arrow", image))
    } else {
      this.loadImage(require("assets/images/icon/location-marker.png")).then(image => this.imageMap.set("locationMarker", image))
      this.loadImage(require("assets/images/icon/location-probe.png")).then(image => this.imageMap.set("locationProbe", image))
      this.loadImage(require("assets/images/icon/location-circle.png")).then(image => this.imageMap.set("locationCircle", image))
    }

    try {
      this.mapType = this.$route.params.buildingId ? 'floor' : 'campus'

      let data
      if (this.mapType === 'floor') {
        const buildingId = parseInt(this.$route.params.buildingId)
        const floorId = parseInt(this.$route.params.floorId)
        data = await this.$api.floor.getFloorInfo(buildingId, floorId)
        console.log(data)
        this.selectedBuilding = data.building || {}
        this.selectedFloor = data.selectedFloor || {}
        this.floorList = data.floorList || []
      } else {
        data = await this.$api.floor.getCampusInfo()
        console.log(data)
      }

      this.placeList = data.placeList || []
      const mapUrl = this.mapType === "floor" ? process.env.VUE_APP_BASE_API + this.selectedFloor.imgUrl : this.campusImage
      const image = await this.loadImage(mapUrl)
      this.imageMap.set("map", image)
      this.$refs.canvasMap.initMap()

      if (!this.loadingError) this.loading = false
    } catch (error) {
      console.log(error)
      // this.$toast({
      //   message: 'Failed to get data.\nPlease try again.',
      //   time: 3000
      // })
      this.loadingError = true
    }
  },

  beforeDestroy() {
    this.imageMap.clear()
    navigator.geolocation.clearWatch(this.geoWatchId)
    this.useDeviceOrientation(false)
    this.initialAlphaOffset = null
  },

  watch: {
    placeList: {
      immediate: true,
      deep: true,
      handler: function (val) {
        this.$store.commit("setPlaceList", val)
      }
    },
    occupationActivated(val) {
      if (val) {
        this.$refs.dt.datetime = null
        const input = document.querySelector('#datetime')
        input.click()
      } else {
        this.occupiedRoomList = []
        if (this.occupationRequesting) {
          this.$toast.close()
          this.occupationRequesting = false
        } 
        this.occupationTime = null
      }
    },
    async gateActivated(val) {
      if (val) {
        if (!this.gateList) {
          try {
            this.$toast({
              message: 'Requesting...',
              time: 10000
            })
            this.gateRequesting = true
            const data = await this.$api.portal.getGateList(this.selectedBuilding.id, this.selectedFloor.id)
            if (!this.gateRequesting) return
            this.gateRequesting = false
            this.$toast.close()
            const gateList = data.gateList || []
            this.gateList = gateList.map(e => {
              let color
              switch (e.endTime - e.startTime) {
                case 24:
                  color = 24
                  break;
                case 16:
                  color = 11
                  break;
                case 10.5:
                  color = 5
                  break;
                default:
                  color = 0
                  break;
              }
              return {
                ...e,
                arrow: color
              }
            })

            console.log(this.gateList)
          } catch (error) {
            console.log(error)
            this.gateRequesting = false
            this.$toast({
              message: 'Failed to get gates.\nPlease try again.',
              time: 3000
            })
            this.gateList = null
            this.$store.commit("button/setGateActivated", false)
          }
        }
      } else {
        if (this.gateRequesting) {
          this.$toast.close()
          this.gateRequesting = false
        }
      }
    },

    locationActivated(val) {
      try {
        if (val) {
          if (navigator.geolocation) {
            // this.geolocationInfo({
            //   coords: {
            //     longitude: 120.739362,
            //     latitude: 31.273855
            //   }
            // })

            const options = {
              enableHighAccuracy: true,
              timeout: 2000,
              maximumAge: 2000
            }
            // navigator.geolocation.getCurrentPosition(displayLocationInfo, handleLocationError, options);
            this.geoWatchId = navigator.geolocation.watchPosition(this.geolocationInfo, this.geolocationError, options)
            this.useDeviceOrientation(true)
          } else {
            console.warn("Geolocation is not supported in this browser.");
            throw new Error("Geolocation is not supported in this browser.")
          }
        } else {
          navigator.geolocation.clearWatch(this.geoWatchId)
          this.useDeviceOrientation(false)
          this.initialAlphaOffset = null
          // this.$toast.close()
          this.geolocation = {}
        }
      } catch (error) {
        console.log(error)
        this.$toast({
          // message: "Location Failure.",
          message: error?.message,
          time: 3000
        })
        this.$store.commit("button/setLocationActivated", false)
      }
    },

    compassActivated(val) {
      this.useDeviceOrientation(val)
    },

    geolocation: {
      immediate: true,
      deep: true,
      handler: function (val) {
        this.$store.commit("setGeolocation", val)
      }
    }
  }
}
</script>

<style style="scss">
.page {
  width: 100vw;
  height: 100%;
}

.canvas-map-loading-panel {
  width: 100vw; 
  position: fixed; 
  top: 0; 
  left: 0;
  background-color: #FFFFFF; 
  z-index: 5;
}
</style>
