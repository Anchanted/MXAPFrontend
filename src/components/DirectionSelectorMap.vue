<template>
  <div class="selector-map-page" :style="{ height: `${clientHeight}px` }">
    <canvas class="selector-map-canvas" ref="canvas" id="selector-canvas"
      @touchstart.self="ontouchstart"
      @touchmove.self="ontouchmove"
      @touchend.self="ontouchend"
      @guesturestart.stop @guesturechange.stop @guestureend.stop>[Your browser is too old!]</canvas>

    <div class="selector-map-panel">
      <div class="selector-map-panel-header">
        <span class="selector-map-panel-header-cancel text-primary" 
          @touchstart="moveInCancel = false"
          @touchmove="moveInCancel = true"
          @touchend="ontouchendcancel">{{$t("direction.selector.cancel")}}</span>
        <span class="selector-map-panel-header-title">{{$t(`direction.${isCurrentTo ? "to" : "from"}Input`)}}</span>
      </div>
      <div class="selector-map-panel-body">
        <div class="selector-map-panel-display">
          <place-card v-for="(place, index) in nearbyPlaceList" :key="index"
            simple
            :item="place" 
            :selected="cardIndex === index && cardSelected"
            @touchstart.native="ontouchstartcard($event, index)"
            @touchmove.native="ontouchmovecard"
            @touchend.native="ontouchendcard"/>
        </div>
        <loading-panel v-show="showLoading"
          ref="loadingPanel"
          class="selector-map-panel-loading-panel"
          @refresh="getNearbyPlaces"/>
      </div>
    </div>

    <div v-show="indoorMode && currentBuilding && currentBuilding.code && floorName" class="floor-selector">
      <div class="dropdown-building">{{currentBuilding && currentBuilding.code}}</div>
      <button type="button" class="btn btn-secondary" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">{{floorName}}<br/><span class="iconfont icon-arrow-left"></span></button>
      <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
        <template v-for="(floor, index) in buildingFloorList" >
          <div :key="`d${floor.id}`" v-if="index !== 0" class="dropdown-divider" style="margin: 0"></div>
          <a :key="`a${floor.id}`" class="dropdown-item" href="javascript:void(0)" :class="{ active: floor.id === currentFloor.id }" @click="chooseOtherFloor(floor)">{{floor.name}}</a>
        </template>
      </div>
    </div>

    <div class="logo-ruler">
      <div class="position: relative;">
        <span v-show="!displayRuler" class="iconfont icon-logo logo"></span>
        <div v-show="displayRuler" class="scale-ruler-container">
          <span>{{rulerUnit}}</span>
          <div class="scale-ruler" :style="{ width: `${rulerWidth}px` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import iconSpriteInfo from "assets/json/iconSpriteInfo.json"
import markerSpriteInfo from "assets/json/markerSpriteInfo.json"
import { easeOutCirc, locationAnimation } from "assets/js/utilFunctions.js"
import HttpError from "assets/js/HttpError"

import PlaceCard from 'components/PlaceCard'
import LoadingPanel from "components/LoadingPanel"

import { mapState } from 'vuex'
import axios from 'axios'

export default {
  components: {
    PlaceCard,
    LoadingPanel
  },
  props: {
    campusPlaceList: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      canvas: null,
      context: null,
      canvasWidth: null,
      canvasHeight: null,
      translateAdaption: {
        x: 0,
        y: 0,
      },
      scaleAdaption: {
        x: 1,
        y: 1,
      },
      translate: {
        x: 0,
        y: 0,
      },
      scale: {
        x: 1,
        y: 1
      },
      focusedPoint: {
        x: 0,
        y: 0
      },
      lastZoomScale: null,
      lastX: null,
      lastY: null,
      tstartpos: {
        x: null,
        y: null
      },
      tmove: false,
      lastTapTime: null,
      fastTapCount: 0,
      secondTouchstart: false,
      isCurrentTo: false,
      fromDirectionMarker: {},
      toDirectionMarker: {},
      location: {
        x: null,
        y: null
      },
      iconSize: null,
      markerSize: null,
      locationIconSize: null,
      moveInCancel: false,
      selectorPosition: {
        x: null,
        y: null
      },
      nearbyPlaceList: [],
      cardSelected: false,
      cardIndex: 0,
      moveInCard: false,
      radius: 150,
      centerX: null,
      centerY: null,
      source: null,
      showLoading: false,
      mapAnimation: {
        deltaX: 0,
        deltaY: 0,
        deltaScale: 0,
        timer: -1,
        duration: 0
      },
      locationAnimation: {
        duration: 2,
        timer: 0
      },
      locationUrlTimeout: null,
      currentBuilding: null,
      currentFloor: null,
      currentBuildingId: null,
      floorList: [],
      floorListStr: null,
      placeList: [],
      indoorMode: false,
      getFloorDataId: 0,
      rulerWidth: 0,
      rulerUnit: "",
      displayRuler: false,
      displayRulerTimeoutId: 0
    }
  },
  computed: {
    ...mapState({
      imageWidth: state => state.imageWidth,
      imageHeight: state => state.imageHeight,
      maxScale: state => state.maxScale,
      minScale: state => state.minScale,
      indoorScale: state => state.indoorScale,
      rulerRatio: state => state.pixelPerMeter,
      rulerUnitArray: state => state.rulerUnitArray,
      cachedBuildingList: state => state.cachedBuildingList,
      cachedFloorList: state => state.cachedFloorList,
      requestingFloorSet: state => state.requestingFloorSet,
      imageMap: state => state.imageMap,
      rotate: state => state.imageRotation,
      marginColor: state => state.imageMarginColor,
      geolocation: state => state.geolocation,
      direction: state=> state.userDirection,
      locationActivated: state => state.button.locationActivated,
      globalFromObj: state => state.direction.globalFromObj,
      globalToObj: state => state.direction.globalToObj,
      isSelectorTo: state => state.direction.isSelectorTo
    }),
    zoom() {
      return Math.pow(2, this.scale.x - 1) * this.scaleAdaption.x
    },
    floorName() {
      return this.currentFloor?.name || ""
    },
    buildingList() {
      return this.campusPlaceList.filter(place => place.placeType === "building")
    },
    buildingFloorList() {
      const floorList = this.currentBuilding?.floorList || []
      return floorList.filter(e => !!e.refCoords)
    }
  },
  methods: {
    animate() {
      if (this.mapAnimation.timer >= 0 && this.mapAnimation.timer <= this.mapAnimation.duration) {
        const t = this.mapAnimation.timer
        const nt = (t + 0.016) > this.mapAnimation.duration ? this.mapAnimation.duration : t + 0.016
        let deltaX, deltaY
        const deltaScale = easeOutCirc(nt, 0, this.mapAnimation.deltaScale, this.mapAnimation.duration) - easeOutCirc(t, 0, this.mapAnimation.deltaScale, this.mapAnimation.duration)
        // const deltaX = (nt - t) / this.mapAnimation.duration * this.mapAnimation.deltaX
        // const deltaY = (nt - t) / this.mapAnimation.duration * this.mapAnimation.deltaY 
        // const deltaScale = (nt - t) / this.mapAnimation.duration * this.mapAnimation.deltaScale 
        if (this.mapAnimation.imageX != null && this.mapAnimation.imageY != null) {
          const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint(this.mapAnimation.imageX, this.mapAnimation.imageY, false)
          const { x: centerX, y: centerY }  = this.getTouchPoint({ x: this.canvasWidth / 2, y: this.canvasHeight / 2 })
          const oldFactor = easeOutCirc(t, 0, 1, this.mapAnimation.duration)
          const ratio = (easeOutCirc(nt, 0, 1, this.mapAnimation.duration) - oldFactor) / (1 - oldFactor)
          deltaX = ratio * (centerX - canvasX)
          deltaY = ratio * (centerY - canvasY)
        } else {
          deltaX = easeOutCirc(nt, 0, this.mapAnimation.deltaX, this.mapAnimation.duration) - easeOutCirc(t, 0, this.mapAnimation.deltaX, this.mapAnimation.duration)
          deltaY = easeOutCirc(nt, 0, this.mapAnimation.deltaY, this.mapAnimation.duration) - easeOutCirc(t, 0, this.mapAnimation.deltaY, this.mapAnimation.duration)
        }
        this.manipulateMap(deltaX, deltaY, deltaScale)
        this.mapAnimation.timer += 0.016
      }

      this.drawMapInfo();
      window.requestAnimationFrame(this.animate)
    },

    drawMapInfo() {
      const ctx = this.context
      ctx.save()

      ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

      ctx.fillStyle = this.marginColor
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)

      const rotate = this.rotate
      if (this.imageMap.get("map")) {
        const scaledSizeX = this.imageWidth * this.zoom
        const scaledSizeY = this.imageHeight * this.zoom
        const canvasX = parseInt(this.translate.x + this.translateAdaption.x)
        const canvasY = parseInt(this.translate.y + this.translateAdaption.y)

        ctx.save()
        ctx.translate(canvasX, canvasY)
        if (rotate) {
          ctx.translate(scaledSizeX, 0)
          ctx.rotate(Math.PI / 2)
        } 
        ctx.drawImage(this.imageMap.get("map"), 0, 0, rotate ? scaledSizeY : scaledSizeX, rotate ? scaledSizeX : scaledSizeY)
        ctx.restore()
      }

      if (this.indoorMode && this.floorList?.length) {
        this.floorList.forEach(floor => {
          if (!this.imageMap.has(`map${floor.id}`)) return
          if (floor.envelope) {
            const { x: minX, y: minY } = this.getImageToCanvasPoint(floor.envelope[0].x, floor.envelope[0].y)
            const { x: maxX, y: maxY } = this.getImageToCanvasPoint(floor.envelope[1].x, floor.envelope[1].y)
            if (!(minX <= this.canvasWidth && minY <= this.canvasHeight && maxX >= 0 && maxY >= 0)) return
          }
          ctx.save()
          if (floor.buildingList?.length) {
            let flag = false
            ctx.beginPath()
            floor.buildingList.forEach(pf => {
              if (pf.areaCoords) {
                flag = true
                pf.areaCoords.forEach(polygon => {
                  polygon.forEach(pointList => {
                    pointList.forEach((point, i) => {
                      const { x, y } = this.getImageToCanvasPoint(point.x, point.y)
                      if (i == 0) ctx.moveTo(x, y)
                      else ctx.lineTo(x, y)
                    })
                  })
                })
              }
            })
            ctx.closePath()
            if (flag) ctx.clip("evenodd")
          }
          // const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint(floor.refCoords[0][0][0], floor.refCoords[0][0][1])
          const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint(floor.origin.x, floor.origin.y)
          const scaleX = floor.scale * this.zoom
          const scaleY = floor.scale * this.zoom
          ctx.save()
          ctx.translate(canvasX, canvasY)
          if (rotate) ctx.rotate(Math.PI / 2)
          // ctx.translate(scaleX * -floor.offset.x, scaleY * -floor.offset.y)
          ctx.rotate(floor.degree)
          ctx.scale(scaleX, scaleY * floor.ratio)
          // ctx.globalAlpha = 0.5
          // ctx.strokeRect(0, 0, this.imageMap.get(`map${floor.id}`).width, this.imageMap.get(`map${floor.id}`).height)
          ctx.drawImage(this.imageMap.get(`map${floor.id}`), 0, 0, this.imageMap.get(`map${floor.id}`).width, this.imageMap.get(`map${floor.id}`).height)
          // ctx.globalAlpha = 1
          ctx.restore()
          ctx.restore()
        })
      }

      if (this.isCurrentTo && !this.$isEmptyObject(this.fromDirectionMarker)) this.drawArea(this.fromDirectionMarker.areaCoords)
      if (!this.isCurrentTo && !this.$isEmptyObject(this.toDirectionMarker)) this.drawArea(this.toDirectionMarker.areaCoords)

      if (this.placeList.length) {
        const size = this.iconSize
        for (let i = this.placeList.length - 1; i >= 0; i--) {
          let place = this.placeList[i]
          // place not to display
          if (!place.displayLevel || (this.scale.x < place.displayLevel || this.scale.y < place.displayLevel)) continue
          this.drawImage(this.imageMap.get("icon"), place.location.x, place.location.y, size, size, size/2, size/2, true, 
            (iconSpriteInfo[place.iconType]["column"] - 1) * iconSpriteInfo[place.iconType]["width"], (iconSpriteInfo[place.iconType]["row"] - 1) * iconSpriteInfo[place.iconType]["height"], iconSpriteInfo[place.iconType]["width"], iconSpriteInfo[place.iconType]["height"])
        }
      }

      if (this.isCurrentTo && !this.$isEmptyObject(this.fromDirectionMarker)) this.drawMarker(this.fromDirectionMarker.x, this.fromDirectionMarker.y, this.markerSize, "fromDir")
      if (!this.isCurrentTo && !this.$isEmptyObject(this.toDirectionMarker)) this.drawMarker(this.toDirectionMarker.x, this.toDirectionMarker.y, this.markerSize, "toDir")

      if (this.locationActivated && this.location.x != null && this.location.y != null) {
        if (this.direction != null) {
          this.drawImage(this.imageMap.get("locationProbe"), this.location.x, this.location.y, this.locationIconSize, this.locationIconSize, this.locationIconSize/2, this.locationIconSize/2, true, parseInt(this.direction))
        }
        this.drawImage(this.imageMap.get("locationMarker"), this.location.x, this.location.y, this.locationIconSize, this.locationIconSize, this.locationIconSize/2, this.locationIconSize/2, true)
        const aniSize = this.locationIconSize * 0.3 + locationAnimation(this.locationAnimation.timer, this.locationIconSize * 0.15, this.locationAnimation.duration)
        // this.drawImage(this.imageMap.get("locationCircle"), this.location.x, this.location.y, aniSize, aniSize, aniSize/2, aniSize/2, true)
        const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint(this.location.x, this.location.y)
        ctx.fillStyle="#0069d9"
        ctx.beginPath()
        ctx.arc(canvasX, canvasY, aniSize / 2, 0, 2*Math.PI)
        ctx.fill()
        this.locationAnimation.timer = (this.locationAnimation.timer + 0.016 > this.locationAnimation.duration) ? 0 : this.locationAnimation.timer + 0.016
      }

      // const { x: px, y: py } = this.getTouchPoint({ x: (this.rotate ? this.canvasHeight : this.canvasWidth) / 2, y: (this.rotate ? this.canvasWidth : this.canvasHeight) / 2 })
      // ctx.moveTo(px - 10, py)
      // ctx.lineTo(px + 10, py)
      // ctx.stroke()
      // ctx.moveTo(px, py - 10)
      // ctx.lineTo(px, py + 10)
      // ctx.stroke()

      ctx.restore()

      ctx.globalAlpha = 0.2
      ctx.fillStyle = 'blue'
      ctx.beginPath()
      ctx.arc(this.selectorPosition.x, this.selectorPosition.y, this.radius, 0, 2*Math.PI)
      ctx.fill()
      ctx.globalAlpha = 1

      ctx.shadowBlur = 10
      ctx.shadowColor = "#ffffff"
      const iconType = `${this.isCurrentTo ? "to" : "from"}Dir`
      ctx.drawImage(this.imageMap.get("marker"), 
        (markerSpriteInfo[iconType]["column"] - 1) * markerSpriteInfo[iconType]["width"], (markerSpriteInfo[iconType]["row"] - 1) * markerSpriteInfo[iconType]["height"], markerSpriteInfo[iconType]["width"], markerSpriteInfo[iconType]["height"], 
        this.selectorPosition.x - this.markerSize / 2, this.selectorPosition.y - this.markerSize, this.markerSize, this.markerSize)
      ctx.shadowBlur = 0
    },

    drawImage() {
      if (!(arguments.length === 8 
        || arguments.length === 9 
        || arguments.length === 11 
        || arguments.length === 12 
        || arguments.length === 13 
        || arguments.length === 15)) throw new Error("Invalid argument number.")

      if (!arguments[0]) return
      else if ((!arguments[1] && arguments[1] !== 0) || (!arguments[2] && arguments[2] !== 0)) return

      const image = arguments[0]
      const x = arguments[1]
      const y = arguments[2]
      const sizeX = arguments[3]
      const sizeY = arguments[4]
      const imgOffsetX = arguments[5]
      const imgOffsetY = arguments[6]
      const fixSize = arguments[7]
      let sx 
      let sy
      let sWidth
      let sHeight
      let degree
      let translateX
      let translateY

      if (arguments.length === 9 || arguments.length === 11) {
        degree = arguments[8]
        translateX = arguments[9] || 0
        translateY = arguments[10] || 0
      } else if (arguments.length === 13 || arguments.length === 15) {
        degree = arguments[12]
        translateX = arguments[13] || 0
        translateY = arguments[14] || 0
      }

      if (arguments.length >= 12) {
        sx = arguments[8]
        sy = arguments[9]
        sWidth = arguments[10]
        sHeight = arguments[11]
      }

      const ctx = this.context

      const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint(x, y)

      const scaleX = fixSize ? 1 : this.zoom
      const scaleY = fixSize ? 1 : this.zoom

      if (degree != null) {
        ctx.save();
        ctx.translate(canvasX, canvasY);
        ctx.rotate((degree + (this.rotate ? 90 : 0)) * Math.PI / 180);
        ctx.translate(-canvasX, -canvasY);
        ctx.translate(translateX * scaleX, translateY * scaleY);
      }

      if (arguments.length >= 12) ctx.drawImage(image, sx, sy, sWidth, sHeight, parseInt(canvasX - imgOffsetX * scaleX), parseInt(canvasY - imgOffsetY * scaleY), sizeX * scaleX, sizeY * scaleY)
      else ctx.drawImage(image, parseInt(canvasX - imgOffsetX * scaleX), parseInt(canvasY - imgOffsetY * scaleY), sizeX * scaleX, sizeY * scaleY)

      if (degree != null) ctx.restore()
    },

    drawArea(polygonList) {
      if (!polygonList) return
      const ctx = this.context
      ctx.fillStyle = 'rgb(255, 0, 0)'
      ctx.strokeStyle = 'rgb(255, 0, 0)'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      polygonList.forEach(polygon => {
        ctx.beginPath()
        polygon.forEach(pointList => {
          pointList.forEach((point, i) => {
            const { x, y } = this.getImageToCanvasPoint(point.x, point.y)
            if (i == 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          })
        })
        ctx.closePath()
        ctx.globalAlpha = 0.2
        ctx.fill("evenodd")
        ctx.globalAlpha = 1
        ctx.stroke()
      })
      ctx.lineWidth = 1
    },

    drawMarker (x, y, size, iconType = "default") {
      const ctx = this.context
      ctx.shadowBlur = 10
      ctx.shadowColor = "#ffffff"
      this.drawImage(this.imageMap.get("marker"), x, y, size, size, size/2, size, true,
        (markerSpriteInfo[iconType]["column"] - 1) * markerSpriteInfo[iconType]["width"], (markerSpriteInfo[iconType]["row"] - 1) * markerSpriteInfo[iconType]["height"], markerSpriteInfo[iconType]["width"], markerSpriteInfo[iconType]["height"])
      ctx.shadowBlur = 0
    },

    getTouchPoint ({ x, y }) {
      return {
        x: x - Math.floor(this.canvas.getBoundingClientRect().left),
        y: y - Math.floor(this.canvas.getBoundingClientRect().top)
      } 
    },

    validateScale(newScale = this.scale.x) {
      newScale = Math.ceil(newScale * 10000) / 10000

      if (newScale > this.maxScale) newScale = this.maxScale
      else if (newScale < this.minScale) newScale = this.minScale

      if (this.scale.x !== newScale && this.scale.x === this.scale.y) {
        this.scale.x = newScale
        this.scale.y = newScale
      }
    },

    validateTranslate(newTranslateX = this.translate.x, newTranslateY = this.translate.y) {
      // edges cases
      const currentWidth = this.imageWidth * this.zoom
      const currentHeight = this.imageHeight * this.zoom

      if (newTranslateX + currentWidth + this.translateAdaption.x < this.canvasWidth - this.translateAdaption.x) 
        newTranslateX = this.canvasWidth - 2 * this.translateAdaption.x - currentWidth
      if (newTranslateX > 0) newTranslateX = 0

      if (newTranslateY + currentHeight + this.translateAdaption.y < this.canvasHeight - this.translateAdaption.y) 
        newTranslateY = this.canvasHeight - 2 * this.translateAdaption.y - currentHeight
      if (newTranslateY > 0) newTranslateY = 0

      if (this.translate.x !== newTranslateX) this.translate.x = newTranslateX
      if (this.translate.y !== newTranslateY) this.translate.y = newTranslateY
    },

    manipulateMap() {
      if (!(arguments.length >= 1 && arguments.length <= 3)) throw new Error("Invalid argument number.")

      let deltaX = 0, deltaY = 0, deltaScale = 0
      if (arguments.length === 3) {
        deltaX = arguments[0] || 0
        deltaY = arguments[1] || 0
        deltaScale = arguments[2] || 0
      } else if (arguments.length === 2) {
        deltaX = arguments[0] || 0
        deltaY = arguments[1] || 0
      } else {
        deltaScale = arguments[0] || 0
      }

      if (deltaScale) {
        this.displayRuler = true
        if (this.displayRulerTimeoutId) clearTimeout(this.displayRulerTimeoutId)
        this.displayRulerTimeoutId = setTimeout(() => this.displayRuler = false, 2000)
      }

      const oldScale = this.scale.x
      const newScale = this.scale.x + deltaScale
      this.validateScale(newScale)

      let newTranslateX = oldScale === this.scale.x ? this.translate.x : (this.focusedPoint.x - this.translateAdaption.x - (this.focusedPoint.x - this.translate.x - this.translateAdaption.x) * Math.pow(2, this.scale.x - oldScale))
      let newTranslateY = oldScale === this.scale.y ? this.translate.y : (this.focusedPoint.y - this.translateAdaption.y - (this.focusedPoint.y - this.translate.y - this.translateAdaption.y) * Math.pow(2, this.scale.y - oldScale))
      newTranslateX += deltaX
      newTranslateY += deltaY
      this.validateTranslate(newTranslateX, newTranslateY)

      this.checkCenteredBuilding()
    },

    gesturePinchZoom (event) {
      let zoom
      if (event.touches.length >= 2) {
        const p1 = this.getTouchPoint({ x: event.touches[0].clientX, y: event.touches[0].clientY })
        const p2 = this.getTouchPoint({ x: event.touches[1].clientX, y: event.touches[1].clientY })

        this.focusedPoint.x = (p1.x + p2.x) / 2
        this.focusedPoint.y = (p1.y + p2.y) / 2
        const zoomScale = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)) // euclidian
        if (this.lastZoomScale != null) zoom = zoomScale - this.lastZoomScale
        this.lastZoomScale = zoomScale
      }
      return zoom / 400
    },

    ontouchstart(e) {
      // console.log("touchstart")
      this.lastX = null
      this.lastY = null
      this.lastZoomScale = null
      this.tstartpos = {
        x: e.targetTouches[0].clientX, 
        y: e.targetTouches[0].clientY
      }
      this.tmove = false
      this.secondTouchstart = false

      if (e.touches.length != 1) return
      if (this.lastTapTime && Date.now() - this.lastTapTime < 500) { // fast tap
        this.fastTapCount += 1
        if (this.fastTapCount % 2 === 1) this.secondTouchstart = true
        this.focusedPoint = this.getTouchPoint({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY })
      } else {
        this.fastTapCount = 0
      }
    },

    ontouchmove(e) {
      // console.log("touchmove")
      if (!this.tmove && this.tstartpos.x === e.changedTouches[0].clientX && this.tstartpos.y === e.changedTouches[0].clientY) return
      this.tmove = true
      if (!this.canvas) return
      if (e.touches.length == 2) { // pinch
        this.manipulateMap(this.gesturePinchZoom(e))
      } else if (e.touches.length == 1) {// move
        const { x: px, y: py } = this.getTouchPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY})   
        if (this.lastX != null && this.lastY != null) {
          const deltaX = px - this.lastX
          const deltaY = py - this.lastY
          if (this.secondTouchstart) { // zoom
            this.manipulateMap(-deltaY / 400)
          } else { // pan
            this.manipulateMap(deltaX,  deltaY)
          }
        }
        this.lastX = px
        this.lastY = py
      }
    },

    ontouchend(e) {
      // console.log("touchend")
      const tmove = this.tmove
      this.tmove = false
      if (!tmove) { // simple tap event
        if (this.secondTouchstart) { 
          this.focusedPoint = this.getTouchPoint({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY })
          this.mapAnimation = {
            deltaX: 0,
            deltaY: 0,
            deltaScale: 0.5,
            timer: 0,
            duration: 0.1
          }
        }
        this.lastTapTime = Date.now()
      } else {
        if (this.locationUrlTimeout) clearTimeout(this.locationUrlTimeout)
        this.getNearbyPlaces()
      }
    },

    resetLayout() {
      const clientWidth = this.clientWidth - 2
      const clientHeight = this.clientHeight - 2 - this.clientWidth * 0.5
      console.log(this.clientWidth, this.clientHeight)

      this.selectorPosition.x = parseInt(clientWidth) / 2
      this.selectorPosition.y = parseInt(clientHeight) / 2

      if (this.canvas) {
        this.canvas.width = clientWidth
        this.canvas.height = clientHeight
      }

      this.canvasWidth = clientWidth
      this.canvasHeight =  clientHeight

      const scaleAdaption = Math.min(this.canvasWidth / this.imageWidth, this.canvasHeight / this.imageHeight)
      this.scaleAdaption = {
        x: scaleAdaption,
        y: scaleAdaption
      }
      this.translateAdaption = {
        x: parseInt(this.canvasWidth) / 2,
        y: parseInt(this.canvasHeight) / 2
      }

      const iconSize = Math.max(clientWidth, clientHeight) || 0
      this.iconSize = parseInt(iconSize * 0.04)
      this.markerSize = this.iconSize * 2
      this.locationIconSize = parseInt(this.iconSize * 1.2)
    },

    getNearbyPlaces() {
      if (this.tmove) return
      if (!this.canvasWidth || !this.canvasHeight || !this.imageWidth || !this.imageHeight) return
      if (!this.scale.x || !this.scale.y || this.translate.x == null || this.translate.y == null) return

      const touchPoint = this.getTouchPoint({ x: this.canvasWidth / 2, y: this.canvasHeight / 2 })
      const { x: centerX, y: centerY } = this.getCanvasToImagePoint(touchPoint.x, touchPoint.y)
      const zoom = Math.floor(this.scale.x * 100) / 100
      const currentLocationInfo = `${Math.floor(centerX)},${Math.floor(centerY)},${zoom}z`

      const radius = Math.floor(this.radius / this.zoom)
      this.centerX = Math.round(centerX * 10) / 10
      this.centerY = Math.round(centerY * 10) / 10

      // const ctx = this.context
      // const radius = 80 / this.zoom

      // const nearbyPlaceList = this.placeList.filter(place => {
      //   ctx.beginPath()
      //   ctx.arc(centerX, centerY, radius, 0, 2*Math.PI)
      //   // console.log(1, centerX, centerY, radius)
      //   if (ctx.isPointInPath(place.location.x, place.location.y)) return true

      //   let inside = false
      //   if (place.areaCoords?.[0]) {
      //     const pointList = place.areaCoords[0]
      //     for (let i = 0; i < pointList.length; i++) {
      //       const point = pointList[i]
      //       ctx.beginPath()
      //       ctx.arc(centerX, centerY, radius, 0, 2*Math.PI)
      //       // console.log(2, centerX, centerY, radius)
      //       if (ctx.isPointInPath(point.x, point.y)) return true
      //     }

      //     for (let i = 0; i < pointList.length; i++) {
      //       const p1 = pointList[i-1 < 0 ? pointList.length-1 : i-1]
      //       const p2 = pointList[i]

      //       const a = p1.y - p2.y
      //       const b = p2.x - p1.x
      //       const c = p1.x * p2.y - p2.x * p1.y

      //       /* https://stackoverflow.com/questions/10301001/perpendicular-on-a-line-segment-from-a-given-point */
      //       const t = ((centerX - p1.x) * (p2.x - p1.x) + (centerY - p1.y) * (p2.y - p1.y)) / (Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))

      //       const dist = Math.abs(a * centerX + b * centerY + c) / Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2))

      //       if (t >= 0 && t <= 1 && dist < radius) return true
      //     }
      //   }
      //   return false
      // })
      // nearbyPlaceList.sort((p1, p2) => {
      //   const dist1 = Math.sqrt(Math.pow(p1.location.x - centerX, 2) + Math.pow(p1.location.y - centerY, 2))
      //   const dist2 = Math.sqrt(Math.pow(p2.location.x - centerX, 2) + Math.pow(p2.location.y - centerY, 2))
      //   return dist1 - dist2
      // })
      // nearbyPlaceList.unshift({
      //   ...this.markedPlaceObj,
      //   level: 0,
      //   location: {
      //     x: Math.floor(centerX),
      //     y: Math.floor(centerY)
      //   }
      // })
      // console.log(nearbyPlaceList)

      const defaultList = this.unifySearchItem([
        {
          ...this.markedPlaceObj,
          location: {
            x: this.centerX,
            y: this.centerY
          }
        }
      ], false)

      this.nearbyPlaceList = defaultList

      console.log("search", this.centerX, this.centerY, radius)
      if (this.source) this.source.cancel(`request canceled by ${this.centerX}, ${this.centerY}, ${radius}`)
      this.source = axios.CancelToken.source()

      this.showLoading = true
      this.$refs.loadingPanel?.setLoading()

      const query = {
        location: `${this.centerX},${this.centerY}`,
        r: radius
      }
      if (this.indoorMode && this.currentFloor?.id) {
        query["floorId"] = this.currentFloor?.id
      }
      this.$api.search.searchGeo(query, { cancelToken: this.source.token }).then(data => {
        console.log(data)
        if (Math.round((data.location?.x || 0) * 10) / 10 === this.centerX
            && Math.round((data.location?.y || 0) * 10) / 10 === this.centerY
            && data.radius === radius
            && data.floorId == (this.indoorMode ? this.currentFloor?.id : null)) {
          let nearbyPlaceList
          if (!data.selectedPlaceList?.length) {
            nearbyPlaceList = defaultList
          } else {
            nearbyPlaceList = data.selectedPlaceList
          }
          nearbyPlaceList.forEach(place => {
            const markerName = `[${this.$t("place.marker.search")}]`
            let floorName
            switch (place.level) {
              case 0:
                floorName = "GF"
                break;
              case -1:
                floorName = "BF"
                break;
              default:
                floorName = "?F"
                break;
            }
            place["nameHighlight"] = markerName + (place.extraInfo?.levelCount > 1 ? ` (${this.$t("place.floor." + floorName)})` : "")
          })
          this.nearbyPlaceList = this.unifySearchItem(nearbyPlaceList.concat(data.neighborList), false)
          console.log(this.nearbyPlaceList)
        }
        this.showLoading = false
      }).catch(error => {
        console.log(error)
        if (error instanceof HttpError) {
          this.$refs.loadingPanel?.setNetworkError()
        } else {
          this.$refs.loadingPanel?.setError()
        }
        // if (axios.isCancel(err)) {
        //   console.log(err.message)
        // }
      })
    },

    setInitialMapLocation() {
      const matchArr = this.$route.params.locationInfo?.match(this.locationUrlReg)

      if (matchArr) {
        const centerX = parseInt(matchArr[1])
        const centerY = parseInt(matchArr[2])
        const zoom = Math.floor(parseFloat(matchArr[3]) * 100) / 100

        this.validateScale(zoom)

        const { x: mapCenterX, y: mapCenterY } = this.getTouchPoint({ x: this.canvasWidth / 2, y: this.canvasHeight / 2 })
        const newOriginX = mapCenterX - centerX * this.zoom - this.translateAdaption.x
        const newOriginY = mapCenterY - centerY * this.zoom - this.translateAdaption.y

        this.validateTranslate(newOriginX, newOriginY)

        this.checkCenteredBuilding()
      }
    },

    ontouchendcancel(e) {
      if (!this.moveInCancel) {
        this.$store.commit("direction/toSelector", false)
        this.stopBubble(e)
      }
    },

    ontouchstartcard(e, index) {
      this.cardIndex = index
      this.cardSelected = true
      this.moveInCard = false
    },
    ontouchmovecard(e) {
      // console.log('item touchmove')
      this.moveInCard = true
      this.cardSelected = false
    },
    ontouchendcard(e) {
      // console.log('item touchend')
      this.cardSelected = false
      
      if (!this.moveInCard) {
        const place = this.nearbyPlaceList[this.cardIndex]
        const oppositeGlobalObj = this.isCurrentTo ? this.globalFromObj : this.globalToObj

        if (this.isSamePlace(place, oppositeGlobalObj)) {
          this.$toast({
            message: this.$t("direction.selector.same"),
            time: 3000
          })
        } else {
          const obj = {}
          this.globalObjKeyArr.forEach(key => obj[key] = place[key])
          if (place.location?.x != null && place.location?.y != null) {
            obj["location"] = {
              x: Math.round(place.location.x * 10) / 10,
              y: Math.round(place.location.y * 10) / 10
            }
          }
          this.$store.commit(this.isCurrentTo ? "direction/setGlobalToObj" : "direction/setGlobalFromObj", obj)
          this.$EventBus.$emit("setDirectionText", { isTo: this.isCurrentTo, text: obj.name })
          this.$store.commit("direction/toSelector", false)
        }
        this.stopBubble(e)
      }
    },

    checkCenteredBuilding() {
      if (this.scale.x < this.indoorScale || this.scale.y < this.indoorScale) return
      let minDistance = 300 * Math.pow(2, this.scale.x - this.indoorScale)
      let minPlace = null
      const { x: centerX, y: centerY }  = this.getTouchPoint({ x: this.canvasWidth / 2, y: this.canvasHeight / 2 })
      this.buildingList.forEach(place => {
        const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint(place.location.x, place.location.y)
        const distance = this.getDistance(canvasX, canvasY, centerX, centerY)
        if (distance < minDistance) {
          minDistance = distance
          minPlace = place
        }
      })

      if (minPlace) {
        this.currentBuildingId = minPlace.id
      }
    },

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

          if (floor.refCoords) {
            const bounds = [
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

      this.currentFloor = floor

      if (this.locationUrlTimeout) clearTimeout(this.locationUrlTimeout)
      this.locationUrlTimeout = setTimeout(() => this.getNearbyPlaces(), 300)
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
      console.log("arrangePlaces")
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

    chooseOtherFloor(floor) {
      this.getFloorData(this.currentBuilding?.id, floor.id)
    }
  },
  mounted() {
    this.isCurrentTo = this.isSelectorTo

    this.canvas = this.$refs.canvas
    this.context = this.canvas.getContext("2d")

    this.resetLayout()
    this.setInitialMapLocation()

    this.$watch("geolocation", val => {
      if (!(val.lon && val.lat)) return
      const { x, y } = this.getGeoToImagePoint(val.lon, val.lat)
      if ((x >= 0 && x <= this.imageWidth) && (y >= 0 && y <= this.imageHeight)) {
        this.location = {
          x,
          y
        }
      }
    }, 
    {
      immediate: true,
      deep: true
    })

    this.$EventBus.$on("selfFromLocation", () => {
      const locationX = this.location.x
      const locationY = this.location.y
      if (locationX == null || locationY == null) return

      const getGroupEnvelope = (currentScale = this.scale.x) => {
        return {
          width: this.locationIconSize,
          height: this.locationIconSize
        }
      }

      let currentScale = this.scale.x
      let nextScale = this.scale.x
      let { width: groupWidth, height: groupHeight } = getGroupEnvelope(nextScale)
      let iterCount = 0
      const difference = 0.5
      // console.log(this.canvasWidth, this.canvasHeight, groupWidth, groupHeight)
      // IMPORTANT: comparing scales without considering equal case in the following while blocks
      if (this.canvasWidth < groupWidth || this.canvasHeight < groupHeight) {
        while ((this.canvasWidth < groupWidth || this.canvasHeight < groupHeight) && nextScale > this.minScale) {
          currentScale = nextScale
          nextScale = iterCount === 0 ? (Math.floor(this.scale.x / difference) * difference) : (nextScale - difference)
          if (nextScale < this.minScale) {
            nextScale = this.minScale
          }
          ({ width: groupWidth, height: groupHeight } = getGroupEnvelope(nextScale));
          // console.log(nextScale, groupWidth, groupHeight, this.canvasWidth < groupWidth, this.canvasHeight < groupHeight)
          iterCount++
        }
        currentScale = nextScale
      } else if (this.canvasWidth > groupWidth && this.canvasHeight > groupHeight) {
        while ((this.canvasWidth > groupWidth && this.canvasHeight > groupHeight) && nextScale < this.maxScale) {
          currentScale = nextScale
          nextScale = iterCount === 0 ? (Math.ceil(this.scale.x / difference) * difference) : (nextScale + difference)
          if (nextScale > this.maxScale) {
            nextScale = this.maxScale
          }
          ({ width: groupWidth, height: groupHeight } = getGroupEnvelope(nextScale));
          // console.log(nextScale, groupWidth, groupHeight, this.canvasWidth > groupWidth, this.canvasHeight > groupHeight)
          iterCount++
        }
      }

      const translateX = locationX
      const translateY = locationY
      const scale = currentScale

      const { x: placeX, y: placeY } = this.getImageToCanvasPoint(translateX, translateY)
      const { x: centerX, y: centerY }  = this.getTouchPoint({ x: this.canvasWidth / 2, y: this.canvasHeight / 2 })

      this.focusedPoint = this.getImageToCanvasPoint(translateX, translateY)
      this.manipulateMap(parseInt(centerX - placeX), parseInt(centerY - placeY), parseInt((scale - this.scale.x) * 10000) / 10000)
    })

    requestAnimationFrame(this.animate)
  },
  beforeDestroy() {
    this.$emit("refreshfloordata")
  },
  watch: {
    "scale.x": {
      handler: function (val, oldVal) {
        if ((val >= this.indoorScale) === (oldVal >= this.indoorScale)) return
        const lastIndoorMode = this.indoorMode
        this.indoorMode = (val >= this.indoorScale)
        if (this.indoorMode !== lastIndoorMode) {
          this.getFloorData(this.currentBuildingId)
        }
      }
    },
    zoom(val) {
      const pixels = this.rulerRatio / val
      const distance = pixels * this.clientWidth * 0.3
      let unit
      for (let i = 1; i < this.rulerUnitArray.length; i++) {
				if (this.rulerUnitArray[i - 1] <= distance && distance < this.rulerUnitArray[i]) {
					unit = this.rulerUnitArray[i - 1];
					break;
				}
			}
      this.rulerWidth = Math.floor(unit / pixels)
      this.rulerUnit = `${unit / (unit >= 1000 ? 1000 : 1)} ${this.$t("unit." + (unit >= 1000 ? "km" : "m"))}`
    },
    currentBuildingId(val) {
      if (!val) return
      this.getFloorData(val)
    },
    floorListStr() {
      this.arrangePlaces()
    },
    globalFromObj: {
      immediate: true,
      deep: true,
      handler: function (val) {
        if (this.$isEmptyObject(val)) {
          this.fromDirectionMarker = {}
          return
        } 
        const { id, floorId, location } = val
        let place
        if (id) {
          place = this.placeList.filter(e => !(e.placeType === "building" && e.floorId)).find(e => e.id === parseInt(id) && e.floorId == floorId)
          if (!place) {
            place = val
          }
        } else if (!this.$isEmptyObject(location)) {
          place = {
            ...this.markedPlaceObj,
            location
          }
        }
        if (!this.$isEmptyObject(place)) {
          this.fromDirectionMarker = {
            id: place.id,
            placeType: place.placeType == "place" ? undefined : place.placeType,
            name: place.name,
            floorId: place.floorId,
            x: place.location?.x,
            y: place.location?.y,
            areaCoords: place.areaCoords
          }
        }
      }
    },
    globalToObj: {
      immediate: true,
      deep: true,
      handler: function (val) {
        if (this.$isEmptyObject(val)) {
          this.toDirectionMarker = {}
          return
        }
        const { id, floorId, location } = val
        let place
        if (id) {
          place = this.placeList.filter(e => !(e.placeType === "building" && e.floorId)).find(e => e.id === parseInt(id) && e.floorId == floorId)
          if (!place) {
            place = val
          }
        } else if (!this.$isEmptyObject(location)) {
          place = {
            ...this.markedPlaceObj,
            location
          }
        }
        if (!this.$isEmptyObject(place)) {
          this.toDirectionMarker = {
            id: place.id,
            placeType: place.placeType == "place" ? undefined : place.placeType,
            name: place.name,
            floorId: place.floorId,
            x: place.location?.x,
            y: place.location?.y,
            areaCoords: place.areaCoords
          }
        }
      }
    },
    scale: {
      deep: true,
      handler: function (val) {
        if (!(val.x && val.y)) return
        if (this.locationUrlTimeout) clearTimeout(this.locationUrlTimeout)
        this.locationUrlTimeout = setTimeout(() => this.getNearbyPlaces(), 300)
      }
    },
    translate: {
      deep: true,
      handler: function (val) {
        if (!(val.x != null && val.y != null)) return
        if (this.locationUrlTimeout) clearTimeout(this.locationUrlTimeout)
        this.locationUrlTimeout = setTimeout(() => this.getNearbyPlaces(), 300)
      }
    }
  }
}
</script>

<style lang="scss">
.selector-map-page {
  width: 100vw;
  background: #ffffff;
  position: fixed;
  top: 0;
  z-index: 4;

  .selector-map-canvas {
    margin: 0 auto;
    border: 1px black solid;
    display: block;
  }

  .selector-map-panel {
    width: 100vw;
    height: 50vw;
    background: white;
    position: absolute;
    bottom: 0;

    &-header {
      width: 100%;
      height: 12vw;
      font-size: 4.5vw;
      line-height: 12vw;
      padding: 0 3vw;
      border-bottom: 1px #C6C6C6 solid;
      position: relative;
      text-align: center;

      &-cancel {
        position: absolute;
        left: 3vw;
      }
    }

    &-body {
      width: 100%;
      height: 38vw;
      overflow-x: hidden;
      overflow-y: auto;

      .selector-map-panel-display {
        width: 100%;

        .selector-map-panel-place-card {
          width: 100%;
          height: 15vw;
        }
      }

      .selector-map-panel-loading-panel {
        height: 22vw;

        span {
          font-size: 3.5vw;
          padding: 2vw;
          margin: 0;
        }

        button {
          font-size: 3.5vw;
          margin: 0;
          padding: 1vw 2vw;
        }
      }
    }
  }

  .floor-selector {
    position: absolute;
    top: 2vw;
    right: 2vw;
    width: 9vw;
    height: auto;

    .dropdown-building {
      width: 9vw;
      height: 7vw;
      font-size: 4vw;
      line-height: 6.5vw;
      font-weight: bold;
      background-color: #ffffff;
      color: #6c757d;
      // vertical-align: middle;
      text-align: center;
      border: 0.5vw #6c757d solid;
      border-bottom: none;
      border-radius: 1vw;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }

    button {
      position: relative;
      width: 9vw;
      height: 12vw;
      padding: 1vw 0;
      font-size: 4vw;
      line-height: 1.0;
      border-radius: 1vw;
      border-top-left-radius: 0;
      border-top-right-radius: 0;
    }

    span {
      font-size: 2.5vw;
      transform: rotateZ(-90deg);
    }

    .dropdown-menu {
      width: auto;
      max-height: 60vw;
      padding: 0;
      overflow-x: hidden;
      min-width: 0;

      .dropdown-item {
        width: 9vw;
        height: 8vw;
        margin: 0;
        padding: 0;
        line-height: 8vw;
        font-size: 3.5vw;
        text-align: center;
      }
    }

    .dropdown-menu::-webkit-scrollbar {
      display: none;
    }
  }

  .logo-ruler {
    position: absolute;
    bottom: 51vw;
    left: 1vw;

    .logo {
      position: absolute;
      bottom: 0;
      font-size: 6vw;
      line-height: 1;
      color: #743481;
    }

    .scale-ruler-container {
      position: absolute;
      bottom: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;

      span {
        font-size: 3vw;
        line-height: 1.2;
        margin: 0;
        margin-bottom: -1vw;
      }

      .scale-ruler {
        display: inline-block;
        height: 2vw;
        border: 2px solid gray;
        border-top: none;
      }
    }
  }
}
</style>