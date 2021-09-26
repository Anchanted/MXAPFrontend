<template>
  <div class="page" style="overflow: hidden;">
    <canvas-map
      ref="canvasMap"
      :indoor-mode="indoorMode"
      :place-list="placeList"
      :floor-list="floorList"
      :building-list="buildingList"
      :map-level="mapLevel"
      :occupation-date-str="occupationDateStr"/>

    <button-group
      v-show="!displayVirtualButton"
      :indoor-mode="indoorMode"
      :button-list="buttonList"
      :current-floor="currentFloor"
      :current-building="currentBuilding"
      :occupation-date-str="occupationDateStr"
      :occupation-requesting="occupationRequesting"
      :gate-requesting="gateRequesting"
      :loading="showLoading"/>

    <search-panel ref="searchPanel"/>
    <direction-panel ref="directionPanel"/>
    <direction-selector-panel ref="directionSelectorPanel"/>
    <direction-selector-map v-if="displaySelectorMap" ref="directionSelectorMapPanel"
      :campus-place-list="campusPlaceList"
      @refreshfloordata="getFloorData(currentBuildingId)"/>
    <place-panel ref="placePanel"/>

    <datetime 
      v-if="displayDatetime"
      type="datetime" 
      v-model="occupationDateStr" 
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

    <div class="modal fade" id="messageModal" tabindex="-1" aria-labelledby="messageModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="messageModalLabel">Message</h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="accordion" id="message-accordion">
              <div class="card">
                <div class="card-header" id="headingTwo">
                  <h2 class="mb-0">
                    <button class="btn btn-link btn-block text-left collapsed" type="button" data-toggle="collapse" data-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
                      Acknowledgement
                    </button>
                  </h2>
                </div>
                <div id="collapseTwo" class="collapse" aria-labelledby="headingTwo" data-parent="#message-accordion">
                  <div class="card-body">
                    <iframe title="Inline Frame" src="/static/html/acknowledgement.html" frameborder="0"></iframe>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <loading-panel
      v-if="showLoading"
      loading-text
      network-image
      ref="loadingPanel"
      :style="{ height: `${clientHeight}px` }"
      class="canvas-map-loading-panel"
      @refresh="$router.go(0)"/>
  </div>
</template>

<script>
import { DateTime, Interval } from 'luxon'
import weekInfo from 'assets/json/week.json'
import HttpError from "assets/js/HttpError"

import SearchPanel from 'components/SearchPanel'
import PlacePanel from 'components/PlacePanel'
import DirectionPanel from 'components/DirectionPanel'
import DirectionSelectorPanel from 'components/DirectionSelectorPanel'
import DirectionSelectorMap from 'components/DirectionSelectorMap'
import ButtonGroup from 'components/ButtonGroup'
import LoadingPanel from 'components/LoadingPanel'
import CanvasMap from "components/CanvasMap"

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
      mapType: "campus",
      currentBuilding: null,
      currentFloor: null,
      campusPlaceList: [],
      placeList: [],
      geolocation: {},
      geoWatchId: null,
      occupationDateStr: null,
      showLoading: true,
      occupationRequesting: false,
      gateRequesting: false,
      initialAlphaOffset: null,
      floorList: [],
      floorListStr: null,
      indoorMode: false,
      getFloorDataId: 0
    }
  },
  computed: {
    ...mapState({
      imageMap: state => state.imageMap,
      scale: state => state.scale,
      indoorScale: state => state.indoorScale,
      currentBuildingId: state => state.currentBuildingId,
      cachedBuildingList: state => state.cachedBuildingList,
      cachedFloorList: state => state.cachedFloorList,
      requestingFloorSet: state => state.requestingFloorSet,
      floorDataEvent: state => state.floorDataEvent,
      direction: state => state.userDirection,
      firstRouteName: state => state.firstRouteName,
      firstRouteValue: state => state.firstRouteValue,
      displayVirtualButton: state => state.button.displayVirtualButton,
      gateActivated: state => state.button.gateActivated,
      occupationActivated: state => state.button.occupationActivated,
      locationActivated: state => state.button.locationActivated,
      compassActivated: state => state.button.compassActivated,
      selectorRouter: state => state.direction.selectorRouter
    }),
    buttonList () {
      const buttonList = this.mapType === "floor" ? ["home"] : ["gate", "occupation", "location"]
      if (this.mapType === "floor") {
        if (this.currentFloor.hasGate) buttonList.push("gate")
        if (this.currentFloor.hasOccupation) buttonList.push("occupation")
      } 
      return buttonList
    },
    buildingList() {
      return this.campusPlaceList.filter(place => place.placeType === "building")
    },
    mapLevel() {
      return (this.currentFloor?.indexNum ?? 0) - (this.currentBuilding?.levelDifference ?? 0)
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
    async getFloorData() {
      console.log("getFloorData", arguments[0], arguments[1])
      if (!this.indoorMode && !arguments[2]) {
        this.floorListStr = ""
        return
      }

      let buildingId = arguments[0]
      let floorId = arguments[1]
      let data = arguments[2]

      if (!buildingId && !floorId && !data) return

      const methodId = this.getFloorDataId + 1
      this.getFloorDataId = methodId

      let building = this.cachedBuildingList.find(building => building.id === buildingId)

      // if (building) {
      //   if (arguments[1] != null && building.floorList.some(f => f.id === floorId)) {
      //     // filter floor not in the building
      //     floorId = arguments[1]
      //   } else if (building.floorList[building.currentFloorIndex]) {
      //     // SA -> XX -> SA
      //     floorId = building.floorList[building.currentFloorIndex].id
      //   }
      // } else if (arguments[1] != null) {
      //   // building not requested before
      //   floorId = arguments[1]
      // }
      if (building && !(floorId != null && building.floorList.some(f => f.id === floorId)) && building.floorList[building.currentFloorIndex]) {
        // SA -> XX -> SA
        floorId = building.floorList[building.currentFloorIndex].id
      }
      if (buildingId != null) {
        if (floorId == null) {
          // SA -> XX -> SX
          let flag = false
          for (let i = 0; i < this.cachedBuildingList.length; i++) {
            const f = this.cachedBuildingList[i].floorList[this.cachedBuildingList[i].currentFloorIndex]
            if (f) {
              const buildingList = f.buildingList
              for (let j = 0; j < buildingList.length; j++) {
                if (buildingList[j].placeId === buildingId) {
                  floorId = buildingList[j].floorId
                  flag = true
                  break
                }
              }
              if (flag) break
            }
          }
        }
        if (floorId == null) {
          // ?? -> XX
          let flag = false
          for (let i = 0; i < this.cachedFloorList.length; i++) {
            const buildingList = this.cachedFloorList[i].buildingList
            for (let j = 0; j < buildingList.length; j++) {
              if (buildingList[j].placeId === buildingId) {
                floorId = buildingList[j].floorId
                flag = true
                break
              }            
            }
            if (flag) break
          }
        }
      }
      let floor = this.cachedFloorList.find(floor => floor.id === floorId)

      const key = `${buildingId ?? ""},${floorId ?? ""}`
      const requestData = !building || !floor
      if (requestData) {
        if (this.requestingFloorSet.has(key)) return
        this.requestingFloorSet.add(key)
        if (floor) {
          this.setCurrentFloor(floor)
          this.arrangeFloorList()
        }
        try {
          if (!data) {
            data = await this.$api.floor.getFloorData({buildingId, floorId})
          }
          console.log(data)
          if (!building) {
            building = {
              ...data.building,
              floorList: data.floorList
            }
          }
          if (!floor) {
            floor = this.setFloorGraphicData(data.floor, data.placeList)
          }
          if (!building.floorList.some(f => f.id === floor.id)) {
            throw new Error("Floor not in the building")
          }
        } catch (error) {
          console.log(error)
        }
      }

      // setFloorData ----------------------------------------
      if (building && floor) {
        let lastFloor
        // if (this.getFloorDataId === methodId && building.id === this.currentBuildingId) {
        if (this.getFloorDataId === methodId && floor.buildingList.some(pf => pf.placeId === this.currentBuildingId)) {
          if (building.id === this.currentBuildingId && building.id !== this.currentBuilding?.id) {
            this.currentBuilding = building
          }
          if (building.floorList.some(f => f.id === floor.id) && floor.id !== this.currentFloor?.id) {
            lastFloor = this.currentFloor
            this.setCurrentFloor(floor)
          }
        }
        this.arrangeFloorList()

        const buildingIndex = this.cachedBuildingList.findIndex(e => e.id === building.id)
        if (buildingIndex > 0) this.cachedBuildingList.splice(buildingIndex, 1)
        if (buildingIndex !== 0) this.cachedBuildingList.unshift(building)
        if (this.cachedBuildingList.length > 20) this.cachedBuildingList.splice(20)

        const floorIndex = this.cachedFloorList.findIndex(e => e.id === floor.id)
        if (floorIndex > 0) this.cachedFloorList.splice(floorIndex, 1)
        if (floorIndex !== 0) this.cachedFloorList.unshift(floor)
        if (this.cachedFloorList.length > 20) {
          for (let i = 20; i < this.cachedFloorList.length; i++) {
            if (this.cachedFloorList[i].id !== floor.id) {
              this.imageMap.delete(`map${this.cachedFloorList[i].id}`)
            }
          }
          this.cachedFloorList.splice(20)
        }

        // setFloorData ----------------------------------------
        if (lastFloor && this.currentFloor) {
          // last intersects but different form current
          let intersect = lastFloor.buildingList.some(pf => this.currentFloor.buildingList.some(pf2 => pf.placeId === pf2.placeId))
          let differenceArr = lastFloor.buildingList.filter(pf => this.currentFloor.buildingList.every(pf2 => pf.placeId !== pf2.placeId))
          if (intersect && differenceArr?.length) {
            this.cachedBuildingList.forEach(e => {
              if (!differenceArr.some(pf => pf.placeId === e.id)) return
              const lastUnrelatedFloor = this.cachedFloorList.find(f => f.buildingList.some(pf => pf.placeId === e.id) && f.buildingList.every(pf => this.currentFloor.buildingList.every(pf2 => pf.placeId !== pf2.placeId)))
              const index = e.floorList.findIndex(f => f.id === lastUnrelatedFloor?.id)
              e["currentFloorIndex"] = index > -1 ? index : e.floorList.findIndex(f => f.buildingList.every(pf => this.currentFloor.buildingList.every(pf2 => pf.placeId !== pf2.placeId)))
            })
          }
        }
        this.cachedBuildingList.forEach(e => {
          let index = e.floorList.findIndex(f => f.id === this.currentFloor?.id)
          if (index > -1) e["currentFloorIndex"] = e.floorList.findIndex(f => f.id === this.currentFloor?.id)
        })
      }

      if (requestData) {
        if (this.requestingFloorSet.has(key)) this.requestingFloorSet.delete(key)
      }
    },

    setFloorGraphicData(floor, placeList = []) {
      if (!floor) return null
      if (!floor.ratio) floor["ratio"] = 1
      if (floor.refCoords) {
        floor.refCoords[1][0][1] *= floor.ratio
        floor.refCoords[1][1][1] *= floor.ratio
        const degree = this.getDegree(floor.refCoords[0][0][0],floor.refCoords[0][0][1], floor.refCoords[0][1][0],floor.refCoords[0][1][1], floor.refCoords[1][0][0],floor.refCoords[1][0][1], floor.refCoords[1][1][0],floor.refCoords[1][1][1]) || 0
        floor["degree"] = degree + ((degree < -Math.PI / 4) ? Math.PI : 0)
        floor["scale"] = this.getDistance(floor.refCoords[0][0][0],floor.refCoords[0][0][1], floor.refCoords[0][1][0],floor.refCoords[0][1][1]) / this.getDistance(floor.refCoords[1][0][0],floor.refCoords[1][0][1], floor.refCoords[1][1][0],floor.refCoords[1][1][1]) || 1
        const offset = this.getRotatedPoint(floor.refCoords[1][0][0],floor.refCoords[1][0][1], floor.degree)
        floor["origin"] = {
          x: floor.refCoords[0][0][0] - floor.scale * offset.x,
          y: floor.refCoords[0][0][1] - floor.scale * offset.y
        }
        // placeList.forEach(place => {
        //   let pp = this.getRotatedPoint(place.location.x,place.location.y * floor.ratio,floor.degree)
        //   pp.x *= floor.scale
        //   pp.y *= floor.scale
        //   pp.x += origin.x
        //   pp.y += origin.y
        //   place.location.x = pp.x
        //   place.location.y = pp.y

        //   if (place.areaCoords) {
        //     place.areaCoords.forEach(polygon => {
        //       polygon.forEach(pointList => {
        //         pointList.forEach(point => {
        //           pp = this.getRotatedPoint(point.x,point.y * floor.ratio,floor.degree)
        //           pp.x *= floor.scale
        //           pp.y *= floor.scale
        //           pp.x += origin.x
        //           pp.y += origin.y
        //           point.x = pp.x
        //           point.y = pp.y
        //         })
        //       })
        //     })
        //   }
        // })
      }
      floor["placeList"] = placeList
      return floor
    },

    setCurrentFloor(floor) {
      if (!floor) return

      const key = `map${floor.id}`
      if (!this.imageMap.has(key)) {
        this.loadImage(process.env.VUE_APP_BASE_API + floor.imgUrl).then(image => {
          this.imageMap.set(key, image)

          let bounds = []
          if (floor.buildingList?.length) {
            floor.buildingList.forEach(pf => {
              if (!pf.areaCoords) return
              bounds = bounds.concat(pf.areaCoords.flat(2).map(point => [point.x, point.y]))
            })
          }
          if (!bounds.length && floor.refCoords) {
            bounds = [
              [0, 0],
              [image.width, 0],
              [image.width, image.height],
              [0, image.height],
            ]
            bounds.forEach(point => {
              const p = this.getRotatedPoint(point[0], point[1] * floor.ratio, floor.degree)
              p.x *= floor.scale
              p.y *= floor.scale
              p.x += floor.origin.x
              p.y += floor.origin.y
              point[0] = p.x
              point[1] = p.y
            })
          }
          if (bounds.length) {
            floor["envelope"] = [
              {
                x: Math.min.apply(null, bounds.map(e => e[0])),
                y: Math.min.apply(null, bounds.map(e => e[1]))
              },
              {
                x: Math.max.apply(null, bounds.map(e => e[0])),
                y: Math.max.apply(null, bounds.map(e => e[1]))
              }
            ]
          }
        })
      }

      this.setOccupiedRoomList(floor)

      this.setPortalList(floor)

      this.currentFloor = floor
    },

    arrangeFloorList() {
      if (!this.currentFloor?.refCoords) return
      const floor = this.currentFloor
      let floorList = this.floorList.filter(e => e ? !e.buildingList.some(pf => floor.buildingList.some(pf2 => pf2.placeId === pf.placeId)) : false)
      floorList.push(floor)
      floorList.sort((a, b) => a.id - b.id)
      floorList = floorList.filter(e => e.id === floor.id)
      this.floorList = floorList
      this.floorListStr = this.indoorMode ? floorList.map(e => e.id).join(",") : ""
    },

    arrangePlaces() {
      // console.log("arrangePlaces")
      let placeList = []
      if (this.indoorMode) {
        this.floorList.forEach(floor => placeList = placeList.concat(floor.placeList ?? []))
        placeList = placeList.concat(this.campusPlaceList.filter(place => {
          if (place.buildingId && !place.floorId) {
            for (let i = 0; i < this.floorList.length; i++) {
              for (let j = 0; j < this.floorList[i].buildingList.length; j++) {
                if (this.floorList[i].buildingList[j].placeId === place.buildingId) return false
              }
            }
          } else if (place.placeType === "building") {
            for (let i = 0; i < this.floorList.length; i++) {
              for (let j = 0; j < this.floorList[i].buildingList.length; j++) {
                if (this.floorList[i].buildingList[j].placeId === place.id) return false
              }
            }
          }
          return true
        }))

        // placeList.sort((a, b) => {
        //   if (a.id === b.id) {
        //     return Number(!a.floorId) -  Number(!b.floorId)
        //   } else {
        //     return a.id - b.id
        //   }
        // })
        // const deleteList = []
        // for (let i = placeList.length - 1; i >= 1; i--) {
        //   if (placeList[i - 1].id === placeList[i].id) {
        //     deleteList.push(i - 1)
        //   }
        // }
        // deleteList.forEach(index => placeList.splice(index, 1))

        placeList.sort((a, b) => {
          if (!!a.areaCoords === !!b.areaCoords) {
            return Number(!a.floorId) - Number(!b.floorId)
          } else {
            return Number(!!a.areaCoords) - Number(!!b.areaCoords)
          }
        })
      } else {
        placeList = placeList.concat(this.campusPlaceList)
      }

      this.placeList = placeList
    },

    async datetimeInput(dateStr) {
      // console.log('datetime', dateStr)
      if (!dateStr) return
      this.occupationDateStr = dateStr
      this.setOccupiedRoomList(this.currentFloor)
    },

    datetimeClose() {
      if (!this.$refs.dt?.datetime) this.$store.commit("button/setOccupationActivated", false)
    },

    setOccupiedRoomList(floor) {
      if (!floor) return
      if (!this.occupationDateStr || floor.occupation?.time === this.occupationDateStr) return
      if (!floor.hasOccupation || !this.occupationActivated) return

      const dateStr = this.occupationDateStr
      const date = DateTime.fromISO(dateStr)
      // console.log(date.toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY), DateTime.local().locale)
      const startDate = DateTime.fromISO(weekInfo["start"])
      const interval = Interval.fromDateTimes(startDate, date)
      const days = Math.floor(interval.length('day') || -1)

      if (days >= 0) {
        const weekIndex = Math.floor(days / 7)
        if (weekIndex < weekInfo["weeks"].length) {
          const weekObj = weekInfo["weeks"][weekIndex]
          if (weekObj["number"]) {
            const key = `${floor.id},${dateStr}`
            if (!this.requestingFloorSet.has(key)) {
              this.requestingFloorSet.add(key)
              this.$api.place.getOccupiedRoom(floor.id, {
                week: weekObj["number"],
                day: date.weekday,
                hour: date.minute >= 30 ? date.hour + 0.5 : date.hour
              }).then(data => {
                console.log(data)
                floor["occupation"] = {
                  time: dateStr,
                  data: data.placeList ?? []
                }
              }).catch(error => {
                console.log(error)
              }).finally(() => {
                this.requestingFloorSet.delete(key)
              })
              return
            }
          }
        }
      }

      floor["occupation"] = {
        time: dateStr,
        data: []
      }
    },

    setPortalList(floor) {
      if (!floor) return
      // if (!floor.hasGate || !this.gateActivated) return
      if (!this.gateActivated) return

      if (!floor.portal) {
        const key = `${floor.id},portal`
        if (this.requestingFloorSet.has(key)) return

        this.requestingFloorSet.add(key)
        this.$api.place.getPortalList(floor.id)
          .then(data => {
            console.log(data)
            const portalList = data.placeList ?? []
            portalList.forEach(place => {
              try {
                let color = 0
                place["time"] = place.extraInfo.time.filter(arr => arr instanceof Array && arr.length >= 2 && arr.every(e => typeof e === "number"))
                place["direction"] = place.extraInfo.direction ?? 0
                place.time.forEach(arr => {
                  switch (arr[1] - arr[0]) {
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
                })
                place["arrow"] = color
              } catch (error) {
                console.log(error)
                place["time"] = place.extraInfo.time ?? []
                place["direction"] = place.extraInfo.direction ?? 0
                place["arrow"] = color
              }
            })
            floor["portal"] = portalList

            const targetTimezone = -8
            let currentDate = new Date()
            const east8time = currentDate.getTime() + currentDate.getTimezoneOffset() * 60 * 1000 - (targetTimezone * 60 * 60 * 1000)
            currentDate = new Date(east8time)
            // console.log(currentDate)
            const currentTime = currentDate.getHours() + currentDate.getMinutes() / 60
            floor.portal.forEach(place => place["open"] = place.time.some(arr => currentTime >= arr[0] && currentTime < arr[1]))
          }).catch(error => {
            console.log(error)
          }).finally(() => {
            this.requestingFloorSet.delete(key)
          })
      } else {
        const targetTimezone = -8
        let currentDate = new Date()
        const east8time = currentDate.getTime() + currentDate.getTimezoneOffset() * 60 * 1000 - (targetTimezone * 60 * 60 * 1000)
        currentDate = new Date(east8time)
        // console.log(currentDate)
        const currentTime = currentDate.getHours() + currentDate.getMinutes() / 60
        floor.portal.forEach(place => place["open"] = place.time.some(arr => currentTime >= arr[0] && currentTime < arr[1]))
      }
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

      // this.$toast({
      //   message: `
      //     absolute: ${event.absolute}
      //     initial: ${this.initialAlphaOffset != null ? Math.floor(this.initialAlphaOffset) : this.initialAlphaOffset}
      //     alpha: ${(rhalpha + 90 + 360) % 360}
      //     webkit: ${event.webkitCompassHeading != null ? Math.floor(event.webkitCompassHeading) : event.webkitCompassHeading}
      //   `,
      //   time: 3000
      // })

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
      this.$store.commit("setUserDirection", event.webkitCompassHeading || rhalpha)
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
      new Promise((resolve, reject) => {
        if (typeof(window.DeviceOrientationEvent.requestPermission) === "function") {
          let addEvent = false
          window.DeviceOrientationEvent.requestPermission().then(state => {
            if (state === "granted") {
              console.log("用户允许", state)
              addEvent = true
            } else if(state === "denied") {
              console.log("用户拒绝", state)
            } else if(state === "prompt") {
              console.log("用户干了啥", state)
            }
            resolve(addEvent)
          }).catch(error => {
            console.log(error)
            reject(error)
          });
        } else {
          // handle regular non iOS 13+ devices
          resolve(true)
        }
      }).then(addEvent => {
        if (!addEvent) return
        window.removeEventListener('deviceorientation', this.deviceOrientationHandler, false);
        window.addEventListener("deviceorientation", this.deviceOrientationHandler, false);
      })
    }
  },

  created() {
    this.$store.commit("setImageMap", new Map())
    this.$store.commit("setCachedBuildingList", [])
    this.$store.commit("setCachedFloorList", [])
    this.$store.commit("setRequestingFloorSet", new Set())

    this.loadImage(require("assets/images/sprite/marker_sprite.png")).then(image => this.imageMap.set("marker", image))
    this.loadImage(require("assets/images/icon/display_button.png")).then(image => this.imageMap.set("displayButton", image))
    this.loadImage(require("assets/images/sprite/icon_sprite.png")).then(image => this.imageMap.set("icon", image))

    this.loadImage(require("assets/images/icon/group.png")).then(image => this.imageMap.set("group", image))
    this.loadImage(require("assets/images/sprite/arrow-sprite.png")).then(image => this.imageMap.set("arrow", image))

    this.loadImage(require("assets/images/icon/location-marker.png")).then(image => this.imageMap.set("locationMarker", image))
    this.loadImage(require("assets/images/icon/location-circle.png")).then(image => this.imageMap.set("locationCircle", image))
    this.loadImage(require("assets/images/icon/location-probe.png")).then(image => this.imageMap.set("locationProbe", image))
  },

  async mounted() {
    this.imageMap.set("map", await this.loadImage(require("assets/images/map/campus/map.png")))
    this.$refs.canvasMap.initMap()
    try {
      const query = {}
      if (this.$route.params.floorId) {
        query["floorId"] = this.$route.params.floorId
      }
      const requests = [this.$api.floor.getCampusData()]
      const floorId = this.$route.params.floorId
      if (floorId) {
        requests.push(this.$api.floor.getFloorData({ floorId }))
      }
      const dataList = await Promise.allSettled(requests)
      console.log(dataList)
      console.log(dataList[0])
      if (dataList[0].status === "rejected") {
        throw dataList[0].reason
      }
      const data = dataList[0].value

      this.campusPlaceList = data.placeList ?? []
      this.getFloorData()

      dataList.splice(0, 1)
      dataList.forEach(result => {
        if (result.status !== "fulfilled") return
        this.$store.commit("setCurrentBuildingId", result.value?.building?.id)
        this.getFloorData(result.value?.building?.id, result.value?.floor?.id, result.value)
      })

      this.showLoading = false
    } catch (error) {
      console.log(error)
      if (error instanceof HttpError) {
        this.$refs.loadingPanel?.setNetworkError()
      } else {
        this.$refs.loadingPanel?.setError()
      }
    }
  },

  beforeDestroy() {
    this.imageMap.clear()
    navigator.geolocation.clearWatch(this.geoWatchId)
    this.useDeviceOrientation(false)
    this.initialAlphaOffset = null
  },

  watch: {
    currentFloor(val) {
      if (val?.id && val?.id !== parseInt(this.$route.params.floorId)) {
        this.$router.replace({
          name: this.$route.name,
          query: this.$route.query,
          params: {
            ...this.$route.params,
            floorId: val?.id
          }
        })
      }
    },
    scale(val, oldVal) {
      if ((val >= this.indoorScale) === (oldVal >= this.indoorScale)) return
      const lastIndoorMode = this.indoorMode
      this.indoorMode = (val >= this.indoorScale)
      if (this.indoorMode !== lastIndoorMode) {
        this.getFloorData(this.currentBuildingId)
      }
    },
    currentBuildingId(val) {
      if (!val) return
      this.getFloorData(val)
    },
    floorListStr() {
      this.arrangePlaces()
    },
    "floorDataEvent.flag"() {
      this.getFloorData(this.floorDataEvent.buildingId, this.floorDataEvent.floorId)
    },
    occupationActivated(val) {
      if (val) {
        this.$refs.dt.datetime = null
        document.querySelector('#datetime').click()
      } else {
        if (this.occupationRequesting) {
          this.$toast.close()
          this.occupationRequesting = false
        } 
        this.occupationDateStr = null
      }
    },
    async gateActivated(val) {
      if (val) {
        this.setPortalList(this.currentFloor)
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

<style lang="scss">
.page {
  width: 100vw;
  height: 100%;

  .canvas-map-loading-panel {
    width: 100vw; 
    position: fixed; 
    top: 0; 
    left: 0;
    background-color: #FFFFFF; 
    z-index: 5;
  }

  #messageModal {
    .modal-dialog {
      width: 90vw;
      max-width: none;

      .modal-header, .modal-body {
        padding: 2vw;
      }

      .modal-header {
        .modal-title {
          font-size: 5vw;
        }

        button {
          font-size: 5vw;
        }
      }

      .card-header {
        button {
          font-size: 4vw;
        }
      }

      iframe {
        width: 100%;
        height: 60vh;
        font-size: 100px;
      }
    }
  }
}
</style>
