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
  </div>
</template>

<script>
import iconSpriteInfo from "assets/json/iconSpriteInfo.json"
import markerSpriteInfo from "assets/json/markerSpriteInfo.json"
import { locationAnimation } from "assets/js/utilFunctions.js"
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
  data() {
    return {
      canvas: null,
      context: null,
      canvasWidth: null,
      canvasHeight: null,
      imgWidth: null,
      imgHeight: null,
      translateAdaption: {
        x: null,
        y: null,
      },
      scaleAdaption: {
        x: null,
        y: null,
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
      iconSize: null,
      markerSize: null,
      locationIconSize: null,
      locationUrlTimeout: null,
      mapAnimation: {
        deltaX: 0,
        deltaY: 0,
        deltaScale: 0,
        timer: -1,
        duration: 0
      },
      isCurrentTo: false,
      fromDirectionMarker: {},
      toDirectionMarker: {},
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
      location: {
        x: null,
        y: null,
        direction: null,
      },
      locationAnimation: {
        duration: 2,
        timer: 0
      },
    }
  },
  computed: {
    ...mapState({
      imageMap: state => state.imageMap,
      rotate: state => state.imageRotation,
      marginColor: state => state.imageMarginColor,
      placeList: state => state.placeList,
      geolocation: state => state.geolocation,
      locationActivated: state => state.button.locationActivated,
      globalFromObj: state => state.direction.globalFromObj,
      globalToObj: state => state.direction.globalToObj,
      isSelectorTo: state => state.direction.isSelectorTo
    })
  },
  methods: {
    animate() {
      if (this.mapAnimation.timer >= 0 && this.mapAnimation.timer <= this.mapAnimation.duration) {
        const t = this.mapAnimation.timer
        const nt = (t + 0.016) > this.mapAnimation.duration ? this.mapAnimation.duration : t + 0.016
        // const deltaX = easeOutCirc(nt, 0, this.mapAnimation.deltaX, this.mapAnimation.duration) - easeOutCirc(t, 0, this.mapAnimation.deltaX, this.mapAnimation.duration)
        // const deltaY = easeOutCirc(nt, 0, this.mapAnimation.deltaY, this.mapAnimation.duration) - easeOutCirc(t, 0, this.mapAnimation.deltaY, this.mapAnimation.duration)
        // const deltaScale = easeOutCirc(nt, 0, this.mapAnimation.deltaScale, this.mapAnimation.duration) - easeOutCirc(t, 0, this.mapAnimation.deltaScale, this.mapAnimation.duration)
        const deltaX = (nt - t) / this.mapAnimation.duration * this.mapAnimation.deltaX
        const deltaY = (nt - t) / this.mapAnimation.duration * this.mapAnimation.deltaY 
        const deltaScale = (nt - t) / this.mapAnimation.duration * this.mapAnimation.deltaScale 
        this.manipulateMap(deltaX, deltaY, deltaScale)
        this.mapAnimation.timer += 0.016
      }

      // this.validateScale()
      // this.validateTranslate()

      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawMapInfo();
      requestAnimationFrame(this.animate)
    },

    drawMapInfo() {
      const ctx = this.context
      ctx.save()

      ctx.fillStyle = this.marginColor
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)

      const rotate = this.rotate
      if (this.imageMap.get("map")) {
        const scaledSizeX = this.imgWidth * this.scale.x * this.scaleAdaption.x
        const scaledSizeY = this.imgHeight * this.scale.y * this.scaleAdaption.y
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

      if (this.isCurrentTo && !this.$isEmptyObject(this.fromDirectionMarker)) this.drawPolygon(this.fromDirectionMarker.areaCoords)
      if (!this.isCurrentTo && !this.$isEmptyObject(this.toDirectionMarker)) this.drawPolygon(this.toDirectionMarker.areaCoords)

      if (this.placeList.length) {
        const size = this.iconSize
        for (let i = this.placeList.length - 1; i >= 0; i--) {
          let place = this.placeList[i]
          // place not to display
          if (!place.iconLevel || (this.scale.x < place.iconLevel || this.scale.y < place.iconLevel)) continue
          this.drawImage(this.imageMap.get("icon"), place.location.x, place.location.y, size, size, size/2, size/2, true, 
            (iconSpriteInfo[place.iconType]["column"] - 1) * iconSpriteInfo[place.iconType]["width"], (iconSpriteInfo[place.iconType]["row"] - 1) * iconSpriteInfo[place.iconType]["height"], iconSpriteInfo[place.iconType]["width"], iconSpriteInfo[place.iconType]["height"])
        }
      }

      if (this.isCurrentTo && !this.$isEmptyObject(this.fromDirectionMarker)) this.drawMarker(this.fromDirectionMarker.x, this.fromDirectionMarker.y, this.markerSize, "fromDir")
      if (!this.isCurrentTo && !this.$isEmptyObject(this.toDirectionMarker)) this.drawMarker(this.toDirectionMarker.x, this.toDirectionMarker.y, this.markerSize, "toDir")

      if (this.locationActivated && this.location.x != null && this.location.y != null) {
        const size = this.iconSize * 1.2
        if (this.location.direction != null)
          this.drawImage(this.imageMap.get("locationProbe"), this.location.x, this.location.y, size, size, size/2, size/2, true, parseInt(this.location.direction))
        this.drawImage(this.imageMap.get("locationMarker"), this.location.x, this.location.y, size, size, size/2, size/2, true)
        const aniSize = size * 0.3 + locationAnimation(this.locationAnimation.timer, size * 0.15, this.locationAnimation.duration)
        // this.drawImage(this.imageMap.get("locationCircle"), this.location.x, this.location.y, aniSize, aniSize, aniSize/2, aniSize/2, true)
        ctx.restore()
        const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint(this.transformPoint({ x: this.location.x, y: this.location.y }))
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

      const { x: pointX, y: pointY } = this.transformPoint({ x, y })

      if (degree != null) {
        const { x: tx, y: ty } = this.getImageToCanvasPoint({ x: pointX, y: pointY })
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate((degree + (this.rotate ? 90 : 0)) * Math.PI / 180);
        ctx.translate(-tx, -ty);
        ctx.translate(translateX, translateY);
      }

      const scaleX = this.scale.x * this.scaleAdaption.x
      const scaleY = this.scale.y * this.scaleAdaption.y

      if (!fixSize) {
        const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint({ x: pointX - imgOffsetX, y: pointY - imgOffsetY })
        if (arguments.length >= 12) ctx.drawImage(image, sx, sy, sWidth, sHeight, parseInt(canvasX), parseInt(canvasY), sizeX * scaleX, sizeY * scaleY)
        else ctx.drawImage(image, parseInt(canvasX), parseInt(canvasY), sizeX * scaleX, sizeY * scaleY)
      } else {
        const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint({ x: pointX, y: pointY })
        if (arguments.length >= 12) ctx.drawImage(image, sx, sy, sWidth, sHeight, parseInt(canvasX - imgOffsetX), parseInt(canvasY - imgOffsetY), sizeX, sizeY)
        else ctx.drawImage(image, parseInt(canvasX - imgOffsetX), parseInt(canvasY - imgOffsetY), sizeX, sizeY)
      }

      if (degree != null) ctx.restore()
    },

    drawPolygon(polygon) {
      if (!polygon) return
      const ctx = this.context
      ctx.globalAlpha = 0.2
      ctx.fillStyle = 'red'
      ctx.strokeStyle = 'rgb(255, 0, 0)'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      polygon.forEach((pointList, i) => {
        pointList.forEach((point, j) => {
          const { x, y } = this.getImageToCanvasPoint(this.transformPoint(point))
          if (j == 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
      })
      ctx.closePath()
      ctx.fill("evenodd")
      ctx.globalAlpha = 1
      ctx.stroke()
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

      if (newScale > 4) newScale = 4
      else if (newScale < 1) newScale = 1

      if (this.scale.x !== newScale && this.scale.x === this.scale.y) {
        this.scale.x = newScale
        this.scale.y = newScale
      }
    },

    validateTranslate(newTranslateX = this.translate.x, newTranslateY = this.translate.y) {
      // edges cases
      const currentWidth = this.imgWidth * this.scaleAdaption.x * this.scale.x
      const currentHeight = this.imgHeight * this.scaleAdaption.y * this.scale.y

      if (newTranslateX + currentWidth + this.translateAdaption.x < this.canvasWidth - this.translateAdaption.x) 
        newTranslateX = this.canvasWidth - 2 * this.translateAdaption.x - currentWidth
      if (newTranslateX > 0) newTranslateX = 0

      if (newTranslateY + currentHeight + this.translateAdaption.y < this.canvasHeight - this.translateAdaption.y) 
        newTranslateY = this.canvasHeight - 2 * this.translateAdaption.y - currentHeight
      if (newTranslateY > 0) newTranslateY = 0

      if (this.translate.x !== newTranslateX) this.translate.x = newTranslateX
      if (this.translate.y !== newTranslateY) this.translate.y = newTranslateY
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

      const oldScale = this.scale.x
      const newScale = this.scale.x + deltaScale
      this.validateScale(newScale)

      let newTranslateX = oldScale === this.scale.x ? this.translate.x : (this.focusedPoint.x - this.translateAdaption.x - (this.focusedPoint.x - this.translateAdaption.x - this.translate.x) * this.scale.x / oldScale)
      let newTranslateY = oldScale === this.scale.y ? this.translate.y : (this.focusedPoint.y - this.translateAdaption.y - (this.focusedPoint.y - this.translateAdaption.y - this.translate.y) * this.scale.y / oldScale)
      newTranslateX += deltaX
      newTranslateY += deltaY
      this.validateTranslate(newTranslateX, newTranslateY)
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

      const imgWidth = parseInt(this.imageMap.get("map").width)
      const imgHeight = parseInt(this.imageMap.get("map").height)
      this.imgWidth = this.rotate ? imgHeight : imgWidth
      this.imgHeight = this.rotate ? imgWidth : imgHeight

      this.canvasWidth = clientWidth
      this.canvasHeight =  clientHeight

      const scaleAdaption = Math.min(this.canvasWidth / this.imgWidth, this.canvasHeight / this.imgHeight)
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
      if (!this.canvasWidth || !this.canvasHeight || !this.imgWidth || !this.imgHeight) return
      if (!this.scale.x || !this.scale.y || this.translate.x == null || this.translate.y == null) return

      const { x: centerX, y: centerY } = this.transformPoint(this.getCanvasToImagePoint(this.getTouchPoint({ x: this.canvasWidth / 2, y: this.canvasHeight / 2 })), true)
      const zoom = Math.floor(this.scale.x * 100) / 100
      const currentLocationInfo = `${Math.floor(centerX)},${Math.floor(centerY)},${zoom}z`

      const radius = Math.floor(this.radius / (this.scale.x * this.scaleAdaption.x))
      this.centerX = Math.floor(centerX)
      this.centerY = Math.floor(centerY)

      // const ctx = this.context
      // const radius = 80 / (this.scale.x * this.scaleAdaption.x)

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
      //   ...this.markerObj,
      //   level: 0,
      //   location: {
      //     x: Math.floor(centerX),
      //     y: Math.floor(centerY)
      //   }
      // })
      // console.log(nearbyPlaceList)

      const defaultList = this.unifySearchItem([
        {
          ...this.markerObj,
          location: {
            x: Math.floor(this.centerX),
            y: Math.floor(this.centerY)
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
        r: radius,
        indoor: (this.$route.params.buildingId && this.$route.params.floorId) ? `${this.$route.params.buildingId},${this.$route.params.floorId}` : null
      }
      this.$api.search.searchGeo(query, { cancelToken: this.source.token }).then(data => {
        console.log(data)
        if (data.location?.x === this.centerX
            && data.location?.y === this.centerY
            && data.radius === radius
            && data.buildingId == this.$route.params.buildingId
            && data.floorId == this.$route.params.floorId) {
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
      const re = /^([+-]?\d+),([+-]?\d+),(\d+(\.\d*)?)z$/
      const matchArr = this.$route.params.locationInfo?.match(re)

      if (matchArr) {
        const centerX = parseInt(matchArr[1])
        const centerY = parseInt(matchArr[2])
        const zoom = Math.floor(parseFloat(matchArr[3]) * 100) / 100

        this.validateScale(zoom)

        const { x: mapCenterX, y: mapCenterY } = this.getTouchPoint({ x: this.canvasWidth / 2, y: this.canvasHeight / 2 })

        const newOriginX = mapCenterX - centerX * this.scale.x * this.scaleAdaption.x - this.translateAdaption.x
        const newOriginY = mapCenterY - centerY * this.scale.y * this.scaleAdaption.y - this.translateAdaption.y
        this.validateTranslate(newOriginX, newOriginY)
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

        if (this.globalObjKeyArr.every((key, i) => i === 0 ? true : oppositeGlobalObj[key] === place[key]) && oppositeGlobalObj.location?.x === place.location?.x && oppositeGlobalObj.location?.y === place.location?.y) {
          this.$toast({
            message: this.$t("direction.selector.same"),
            time: 3000
          })
        } else {
          const obj = {}
          this.globalObjKeyArr.forEach(key => obj[key] = place[key])
          this.$store.commit(this.isCurrentTo ? "direction/setGlobalToObj" : "direction/setGlobalFromObj", obj)
          this.$EventBus.$emit("setDirectionText", { isTo: this.isCurrentTo, text: obj.name })
          this.$store.commit("direction/toSelector", false)
        }
        this.stopBubble(e)
      }
    },
    transformPoint({ x: oldX = 0, y: oldY = 0 }, reverse = false) {
      if (this.rotate) {
        return {
          x: reverse ? oldY : this.imgWidth - oldY,
          y: reverse ? this.imgWidth - oldX : oldX
        }
      } else {
        return {
          x: oldX,
          y: oldY
        }
      }
    }
  },
  mounted() {
    this.isCurrentTo = this.isSelectorTo

    this.canvas = this.$refs.canvas
    this.context = this.canvas.getContext("2d")

    this.resetLayout()
    this.setInitialMapLocation()

    this.location.direction = this.geolocation.direction
    if (this.geolocation.lon && this.geolocation.lat) {
      const { x, y } = this.getGeoToImagePoint({ longitude: this.geolocation.lon, latitude: this.geolocation.lat })
      if ((x >= 0 && x <= this.imgWidth) && (y >= 0 && y <= this.imgHeight)) {
        this.location = {
          ...this.location,
          x,
          y
        }
      }
    }
    this.$EventBus.$on("selfFromLocation", () => {
      const locationX = this.location.x
      const locationY = this.location.y
      if (!(locationX != null && locationY != null)) return

      const getGroupSize = (currentScale = this.scale.x) => {
        return {
          width: this.markerSize,
          height: this.markerSize
        }
      }

      let flag = false
      let currentScale = this.scale.x
      let { width: groupWidth, height: groupHeight } = getGroupSize(currentScale)
      if (this.canvasWidth < groupWidth || this.canvasHeight < groupHeight) {
        currentScale = Math.ceil(this.scale.x * 2) / 2;
        do {
          if (currentScale < this.scale.x) flag = true
          currentScale = (currentScale - 0.5 < 1) ? 1 : (currentScale - 0.5);
          ({ width: groupWidth, height: groupHeight } = getGroupSize(currentScale));
        } while ((this.canvasWidth < groupWidth || this.canvasHeight < groupHeight) && currentScale > 1);
      } else if (this.canvasWidth > groupWidth && this.canvasHeight > groupHeight) {
        currentScale = Math.floor(this.scale.x * 2) / 2;
        do {
          if (currentScale > this.scale.x) flag = true
          currentScale = (currentScale + 0.5 > 4) ? 4 : (currentScale + 0.5);
          ({ width: groupWidth, height: groupHeight } = getGroupSize(currentScale));
        } while ((this.canvasWidth > groupWidth && this.canvasHeight > groupHeight) && currentScale < 4);
      }
      if (!flag) currentScale = this.scale.x;

      const translateX = locationX
      const translateY = locationY
      const scale = currentScale
      
      const { x: placeX, y: placeY } = this.getImageToCanvasPoint({ x: translateX, y: translateY })
      const { x: centerX, y: centerY }  = this.getTouchPoint({ x: this.canvasWidth / 2, y: this.canvasHeight / 2 })

      this.focusedPoint = this.getImageToCanvasPoint({ x: translateX, y: translateY })
      this.manipulateMap(parseInt(centerX - placeX), parseInt(centerY - placeY), parseInt((scale - this.scale.x) * 10000) / 10000)
    })

    requestAnimationFrame(this.animate)
  },
  watch: {
    globalFromObj: {
      immediate: true,
      deep: true,
      handler: function (val) {
        if (!this.$isEmptyObject(val)) {
          const { id, placeType, location } = val
          let place
          if (id) {
            place = this.placeList.find(e => e.id === parseInt(id) && e.placeType === placeType)
          } else if (!this.$isEmptyObject(location)) {
            place = {
              ...this.markerObj,
              location
            }
          }
          if (!this.$isEmptyObject(place)) {
            this.fromDirectionMarker = {
              x: place.location?.x,
              y: place.location?.y,
              areaCoords: place.areaCoords,
              id: place.id,
              placeType: place.placeType,
              name: place.name
            }
          }
        } else {
          this.fromDirectionMarker = {}
        }
      }
    },
    globalToObj: {
      immediate: true,
      deep: true,
      handler: function (val) {
        if (!this.$isEmptyObject(val)) {
          const { id, placeType, location } = val
          let place
          if (id) {
            place = this.placeList.find(e => e.id === parseInt(id) && e.placeType === placeType)
          } else if (!this.$isEmptyObject(location)) {
            place = {
              ...this.markerObj,
              location
            }
          }
          if (!this.$isEmptyObject(place)) {
            this.toDirectionMarker = {
              x: place.location?.x,
              y: place.location?.y,
              areaCoords: place.areaCoords,
              id: place.id,
              placeType: place.placeType,
              name: place.name
            }
          }
        } else {
          this.toDirectionMarker = {}
        }
      }
    },
    geolocation: {
      immediate: true,
      deep: true,
      handler: function (val) {
        this.location.direction = val.direction
        if (!(val.lon && val.lat)) return
        const { x, y } = this.getGeoToImagePoint({ longitude: val.lon, latitude: val.lat })
        if ((x >= 0 && x <= this.imgWidth) && (y >= 0 && y <= this.imgHeight)) {
          this.location = {
            ...this.location,
            x,
            y
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
}
</style>