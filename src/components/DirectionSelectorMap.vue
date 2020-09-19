<template>
  <div class="selector-map-page" :style="{ height: `${clientHeight}px` }">
    <canvas class="selector-map-canvas" ref="canvas" id="selector-canvas"
      @touchstart="ontouchstart"
      @touchmove="ontouchmove"
      @touchend="ontouchend"
      @guesturestart.stop @guesturechange.stop @guestureend.stop>[Your browser is too old!]</canvas>

    <div class="selector-map-panel">
      <div class="selector-map-panel-header">
        <span 
          class="selector-map-panel-header-cancel text-primary" 
          @touchstart="ontouchstartcancel"
          @touchmove="ontouchmovecancel"
          @touchend="ontouchendcancel">{{$t("direction.selector.cancel")}}</span>
        <span class="selector-map-panel-header-title">{{$t(`direction.${isCurrentTo ? "to" : "from"}Input`)}}</span>
      </div>
      <div class="selector-map-panel-body">
        <div class="selector-map-panel-display">
          <place-card
            v-for="(place, index) in nearbyPlaceList" :key="`${place.id}|${place.placeType}|${place.level}`"
            :simple="true" :data-type="place.placeType" :style="cardStyle(index)"
            @touchstart.native="ontouchstartcard($event, index)"
            @touchmove.native="ontouchmovecard"
            @touchend.native="ontouchendcard">
            <template #icon v-if="place.placeType === 'building'">{{place.code}}</template>
            <template #icon v-else-if="place.placeType === 'room'">{{place.buildingCode}}</template>
            <template #icon v-else>
              <span class="iconfont" :class="`icon-${place.iconType || place.placeType}`"></span>
            </template>
            <template #name>{{placeName(index)}}</template>
            <template #address v-if="place.buildingZone || place.zone || place.path">{{placeAddress(place)}}</template>
          </place-card>
        </div>
        <loading-panel
          v-if="loading"
          :has-error="loadingError"
          class="selector-map-panel-loading-panel"
          @refresh="getNearbyPlaces">
        </loading-panel>
      </div>
    </div>
  </div>
</template>

<script>
import iconSpriteInfo from "assets/json/iconSpriteInfo.json"
import markerSpriteInfo from "assets/json/markerSpriteInfo.json"

import { locationAnimation } from "utils/utilFunctions.js"

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
      rotate: false,
      canvas: null,
      context: null,
      canvasWidth: null,
      canvasHeight: null,
      imgWidth: null,
      imgHeight: null,
      scaleAdaption: null,
      positionAdaption: {
        x: null,
        y: null,
      },
      position: {
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
      init: false,
      tmove: false,
      lastTapTime: null,
      lastDoubleTap: false,
      iconSize: null,
      mapMarginColor: null,
      locationUrlTimeout: null,
      mapAnimation: {
        x: null,
        y: null,
        initialScale: 1,
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
      radius: null,
      centerX: null,
      centerY: null,
      source: null,
      loading: false,
      loadingError: false,
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
      placeList: state => state.placeList,
      geolocation: state => state.geolocation,
      locationActivated: state => state.button.locationActivated,
      globalFromObj: state => state.direction.globalFromObj,
      globalToObj: state => state.direction.globalToObj,
      isSelectorTo: state => state.direction.isSelectorTo
    }),
    cardStyle() {
      return index => {
        return {
          'background-color': (this.cardIndex === index && this.cardSelected) ? '#E6E3DF' : 'transparent'
        }
      }
    },
    placeName() {
      return index => {
        const place = this.nearbyPlaceList[index]
        if (place.id) {
          return place.name
        } else {
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
          return markerName + (place.levelCount > 1 ? ` (${this.$t("place.floor." + floorName)})` : "")
        }
      }
    },
    placeAddress() {
      return place => {
        let addressArr = []
        const floor = place.floorName
        const building = place.buildingName
        const zone = place.zone || place.buildingZone
        if (floor) addressArr.push(this.$t("place.floor." + floor))
        if (building) addressArr.push(building)
        addressArr.push(zone ? this.$t("place.zone." + zone) : place.path)
        if (this.$t("place.address.reverse") === "true") addressArr = addressArr.reverse()
        return addressArr.join(this.$t("place.address.conj"))
      }
    }
  },
  methods: {
    animate() {
      // set scale such as image cover all the canvas
      if (!this.init) {
        let scaleRatio;
        if (this.canvasWidth > this.canvasHeight) {
          scaleRatio = this.scale.x;
        } else {
          scaleRatio = this.scale.y;
        }
        this.scale.x = scaleRatio;
        this.scale.y = scaleRatio;
        this.init = true;
      }

      if (this.mapAnimation.timer >= 0 && this.mapAnimation.timer <= this.mapAnimation.duration) {
        const t = this.mapAnimation.timer
        const nt = (t + 0.016) > this.mapAnimation.duration ? this.mapAnimation.duration : t + 0.016
        // const deltaX = easeOutCirc(nt, 0, this.mapAnimation.deltaX, this.mapAnimation.duration) - easeOutCirc(t, 0, this.mapAnimation.deltaX, this.mapAnimation.duration)
        // const deltaY = easeOutCirc(nt, 0, this.mapAnimation.deltaY, this.mapAnimation.duration) - easeOutCirc(t, 0, this.mapAnimation.deltaY, this.mapAnimation.duration)
        // const deltaScale = easeOutCirc(nt, 0, this.mapAnimation.deltaScale, this.mapAnimation.duration) - easeOutCirc(t, 0, this.mapAnimation.deltaScale, this.mapAnimation.duration)
        const deltaX = (nt - t) / this.mapAnimation.duration * this.mapAnimation.deltaX
        const deltaY = (nt - t) / this.mapAnimation.duration * this.mapAnimation.deltaY 
        const deltaScale = (nt - t) / this.mapAnimation.duration * this.mapAnimation.deltaScale 
        if (this.mapAnimation.x != null && this.mapAnimation.y != null) this.focusedPoint = { ...this.getImageToCanvasPoint({ x: this.mapAnimation.x, y: this.mapAnimation.y }) }
        this.manipulateMap(deltaX, deltaY, deltaScale)
        this.mapAnimation.timer += 0.016
      }

      // this.validateScale()
      // this.validatePosition()

      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawMapInfo();
      requestAnimationFrame(this.animate)
    },

    drawMapInfo() {
      const ctx = this.context
      ctx.save()
      if (this.rotate) {
        this.context.translate(this.canvasHeight, 0)
        this.context.rotate(Math.PI / 2)
      } 

      if (this.mapMarginColor) {
        ctx.fillStyle = this.mapMarginColor
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
      }

      this.drawImage(this.imageMap.get('map'), 0, 0, this.imgWidth, this.imgHeight, 0, 0, false, false)

      if (!this.$isEmptyObject(this.fromDirectionMarker)) this.drawPolygon(this.fromDirectionMarker.areaCoords)
      if (!this.$isEmptyObject(this.toDirectionMarker)) this.drawPolygon(this.toDirectionMarker.areaCoords)

      if (this.placeList.length) {
        this.placeList.forEach(item => {
          // item not to display
          if (!item.iconLevel || (this.scale.x < item.iconLevel || this.scale.y < item.iconLevel)) return
          const size = this.iconSize
          this.drawImage(this.imageMap.get("facilitySprite"), item.location.x, item.location.y, size, size, size/2, size/2, true, true, 
            (iconSpriteInfo[item.iconType]["column"] - 1) * iconSpriteInfo[item.iconType]["width"], (iconSpriteInfo[item.iconType]["row"] - 1) * iconSpriteInfo[item.iconType]["height"], iconSpriteInfo[item.iconType]["width"], iconSpriteInfo[item.iconType]["height"])
        })
      }

      if (this.isCurrentTo && !this.$isEmptyObject(this.fromDirectionMarker)) this.drawMarker(this.fromDirectionMarker.x, this.fromDirectionMarker.y, this.iconSize * 2, "fromDir")
      if (!this.isCurrentTo && !this.$isEmptyObject(this.toDirectionMarker)) this.drawMarker(this.toDirectionMarker.x, this.toDirectionMarker.y, this.iconSize * 2, "toDir")
      
      if (this.locationActivated && this.location.x != null && this.location.y != null) {
        const size = this.iconSize * 1.2
        if (this.location.direction != null)
          this.drawImage(this.imageMap.get("locationProbe"), this.location.x, this.location.y, size, size, size/2, size/2, true, false, parseInt(this.location.direction))
        this.drawImage(this.imageMap.get("locationMarker"), this.location.x, this.location.y, size, size, size/2, size/2, true, false)
        const aniSize = size * 0.3 + locationAnimation(this.locationAnimation.timer, size * 0.15, this.locationAnimation.duration)
        // this.drawImage(this.imageMap.get("locationCircle"), this.location.x, this.location.y, aniSize, aniSize, aniSize/2, aniSize/2, true, false)
        ctx.restore()
        const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint({ x: this.location.x, y: this.location.y })
        this.context.fillStyle="#0069d9"
        ctx.beginPath()
        ctx.arc(canvasX, canvasY, aniSize / 2, 0, 2*Math.PI)
        ctx.fill()
        ctx.save()
        ctx.translate(this.canvasHeight, 0)
        ctx.rotate(Math.PI / 2)
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
      ctx.arc(this.selectorPosition.x, this.selectorPosition.y, 80, 0, 2*Math.PI)
      ctx.fill()
      ctx.globalAlpha = 1

      ctx.shadowBlur = 10
      ctx.shadowColor = "#ffffff"
      const iconType = `${this.isCurrentTo ? "to" : "from"}Dir`
      const markerSize = this.iconSize * 2
      ctx.drawImage(this.imageMap.get("markers"), 
        (markerSpriteInfo[iconType]["column"] - 1) * markerSpriteInfo[iconType]["width"], (markerSpriteInfo[iconType]["row"] - 1) * markerSpriteInfo[iconType]["height"], markerSpriteInfo[iconType]["width"], markerSpriteInfo[iconType]["height"], 
        this.selectorPosition.x - markerSize / 2, this.selectorPosition.y - markerSize, markerSize, markerSize)
      ctx.shadowBlur = 0
    },

    drawImage() {
      if (!(arguments.length === 9 
        || arguments.length === 10 
        || arguments.length === 12 
        || arguments.length === 13 
        || arguments.length === 14 
        || arguments.length === 16)) throw new Error("Invalid argument number.")

      if (!arguments[0]) return

      const image = arguments[0]
      const x = arguments[1]
      const y = arguments[2]
      const sizeX = arguments[3]
      const sizeY = arguments[4]
      const imgOffsetX = arguments[5]
      const imgOffsetY = arguments[6]
      const fixSize = arguments[7]
      const selfRotate = arguments[8]
      let sx 
      let sy
      let sWidth
      let sHeight
      let degree
      let translateX
      let translateY

      if (arguments.length === 10 || arguments.length === 12) {
        degree = arguments[9]
        translateX = arguments[10] || 0
        translateY = arguments[11] || 0
      } else if (arguments.length === 14 || arguments.length === 16) {
        degree = arguments[13]
        translateX = arguments[14] || 0
        translateY = arguments[15] || 0
      }

      if (arguments.length >= 13) {
        sx = arguments[9]
        sy = arguments[10]
        sWidth = arguments[11]
        sHeight = arguments[12]
      }

      const ctx = this.context
      if (degree != null) {
        const { x: tx, y: ty } = this.getImageToCanvasPoint({ x, y })
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(degree * Math.PI / 180);
        ctx.translate(-tx, -ty);
        ctx.translate(translateX, translateY);
      }

      const scaleX = this.scale.x * this.scaleAdaption
      const scaleY = this.scale.y * this.scaleAdaption
      if (this.rotate && selfRotate) {
        ctx.restore()
        if (!fixSize) {
          const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint({ x: x - imgOffsetY, y: y + imgOffsetX })
          if (arguments.length >= 13) ctx.drawImage(image, sx, sy, sWidth, sHeight, parseInt(this.canvasHeight - canvasY), parseInt(canvasX), sizeX * scaleY, sizeY * scaleX)
          else ctx.drawImage(image, parseInt(this.canvasHeight - canvasY), parseInt(canvasX), sizeX * scaleY, sizeY * scaleX)
        }
        else {
          const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint({ x, y })
          if (arguments.length >= 13) ctx.drawImage(image, sx, sy, sWidth, sHeight, parseInt(this.canvasHeight - (canvasY + imgOffsetX)), parseInt(canvasX - imgOffsetY), sizeX, sizeY)
          else ctx.drawImage(image, parseInt(this.canvasHeight - (canvasY + imgOffsetX)), parseInt(canvasX - imgOffsetY), sizeX, sizeY)
        }
        ctx.save()
        ctx.translate(this.canvasHeight, 0)
        ctx.rotate(Math.PI / 2)
      } else {
        if (!fixSize) {
          const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint({ x: x - imgOffsetX, y: y - imgOffsetY })
          if (arguments.length >= 13) ctx.drawImage(image, sx, sy, sWidth, sHeight, parseInt(canvasX), parseInt(canvasY), sizeX * scaleX, sizeY * scaleY)
          else ctx.drawImage(image, parseInt(canvasX), parseInt(canvasY), sizeX * scaleX, sizeY * scaleY)
        } else {
          const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint({ x, y })
          if (arguments.length >= 13) ctx.drawImage(image, sx, sy, sWidth, sHeight, parseInt(canvasX - imgOffsetX), parseInt(canvasY - imgOffsetY), sizeX, sizeY)
          else ctx.drawImage(image, parseInt(canvasX - imgOffsetX), parseInt(canvasY - imgOffsetY), sizeX, sizeY)
        }
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
          const { x, y } = this.getImageToCanvasPoint(point)
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
      this.drawImage(this.imageMap.get('markers'), x, y, size, size, size/2, size, true, true,
        (markerSpriteInfo[iconType]["column"] - 1) * markerSpriteInfo[iconType]["width"], (markerSpriteInfo[iconType]["row"] - 1) * markerSpriteInfo[iconType]["height"], markerSpriteInfo[iconType]["width"], markerSpriteInfo[iconType]["height"])
      ctx.shadowBlur = 0
    },

    getTouchPoint ({ x, y }, followRotation = true) {
      return {
        x: (!this.rotate || !followRotation) ? x - Math.floor(this.canvas.getBoundingClientRect().left) : y - Math.floor(this.canvas.getBoundingClientRect().top),
        y: (!this.rotate || !followRotation) ? y - Math.floor(this.canvas.getBoundingClientRect().top) : Math.floor(this.canvas.getBoundingClientRect().right) - 2 - x
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

    validatePosition(newPosX = this.position.x, newPosY = this.position.y) {
      // edges cases
      const currentWidth = this.imgWidth * this.scaleAdaption * this.scale.x
      const currentHeight = this.imgHeight * this.scaleAdaption * this.scale.y

      if (newPosX + currentWidth + this.positionAdaption.x < this.canvasWidth - this.positionAdaption.x) 
        newPosX = this.canvasWidth - 2 * this.positionAdaption.x - currentWidth
      if (newPosX > 0) newPosX = 0

      if (newPosY + currentHeight + this.positionAdaption.y < this.canvasHeight - this.positionAdaption.y) 
        newPosY = this.canvasHeight - 2 * this.positionAdaption.y - currentHeight
      if (newPosY > 0) newPosY = 0

      if (this.position.x !== newPosX) this.position.x = newPosX
      if (this.position.y !== newPosY) this.position.y = newPosY
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

      let newPosX = oldScale === this.scale.x ? this.position.x : (this.focusedPoint.x - this.positionAdaption.x - (this.focusedPoint.x - this.positionAdaption.x - this.position.x) * this.scale.x / oldScale)
      let newPosY = oldScale === this.scale.y ? this.position.y : (this.focusedPoint.y - this.positionAdaption.y - (this.focusedPoint.y - this.positionAdaption.y - this.position.y) * this.scale.y / oldScale)
      newPosX += deltaX
      newPosY += deltaY
      this.validatePosition(newPosX, newPosY)
    },

    ontouchstart (e) {
      // console.log("touchstart")
      this.lastX = null
      this.lastY = null
      this.lastZoomScale = null
      this.tmove = false
    },

    ontouchmove (e) {
      // console.log("touchmove")
      this.tmove = true
      if (this.canvas && e.target == this.canvas) {
        if (e.touches.length == 2) { // pinch
          this.manipulateMap(this.gesturePinchZoom(e))
        } else if (e.touches.length == 1) {// move
          const { x: px, y: py } = this.getTouchPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY})   
          if (this.lastX != null && this.lastY != null) this.manipulateMap(px - this.lastX, py - this.lastY)
          this.lastX = px
          this.lastY = py
        }
      }
    },

    ontouchend (e) {
      // console.log("touchend")
      const tmove = this.tmove
      this.tmove = false
      if (!tmove) { // simple tap event
        const currentTime = Date.now()
        if (this.lastTapTime && currentTime - this.lastTapTime < 500) { // double tap
          if (!this.lastDoubleTap) { // second tap
            this.focusedPoint = { ...this.getTouchPoint({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }) }
            this.mapAnimation = {
              x: null,
              y: null,
              deltaX: 0,
              deltaY: 0,
              deltaScale: 0.5,
              timer: 0,
              duration: 0.1
            }
            
            this.lastTapTime = currentTime
            this.lastDoubleTap = true
            return
          }
        }
        this.lastTapTime = currentTime
        this.lastDoubleTap = false
      } else {
        if (this.locationUrlTimeout) clearTimeout(this.locationUrlTimeout)
        this.getNearbyPlaces()
      }
    },

    resizeWindow() {
      const clientWidth = this.clientWidth - 2
      const clientHeight = this.clientHeight - 2 - this.clientWidth * 0.5
      console.log(this.clientWidth, this.clientHeight)

      this.selectorPosition.x = parseInt(clientWidth) / 2
      this.selectorPosition.y = parseInt(clientHeight) / 2

      if (this.canvas) {
        this.canvas.width = clientWidth
        this.canvas.height = clientHeight
      }

      if (this.imgWidth && this.imgHeight) {
        if (this.imgWidth <= this.imgHeight) {
          this.canvasWidth = clientWidth
          this.canvasHeight = clientHeight
          this.scaleAdaption = this.canvasHeight / this.imgHeight
          if (this.imgWidth * this.scaleAdaption > this.canvasWidth) this.scaleAdaption = this.canvasWidth / this.imgWidth
          this.rotate = false
        } else { // imgWidth > imgHeight  
          if (clientWidth > clientHeight) { 
            // img: landscape  screen: landscape
            this.canvasWidth = clientWidth  
            this.canvasHeight = clientHeight
            this.rotate = false
          } else { // clientWidth <= clientHeight  
            //img: landscape  screen: portrait
            this.canvasWidth = clientHeight
            this.canvasHeight = clientWidth
            this.rotate = true
          }
          this.scaleAdaption = this.canvasWidth / this.imgWidth
          if (this.imgHeight * this.scaleAdaption > this.canvasHeight) this.scaleAdaption = this.canvasHeight / this.imgHeight
        }
        
        this.positionAdaption = {
          x: parseInt(this.canvasWidth) / 2,
          y: parseInt(this.canvasHeight) / 2
        }
  
        this.iconSize = Math.max(clientWidth, clientHeight) || 0
        this.iconSize = parseInt(this.iconSize * 0.05)  
      }
    },

    getNearbyPlaces() {
      if (this.tmove) return
      if (!this.canvasWidth || !this.canvasHeight || !this.imgWidth || !this.imgHeight) return
      if (!this.scale.x || !this.scale.y || this.position.x == null || this.position.y == null) return

      const { x: centerX, y: centerY } = this.getCanvasToImagePoint(this.getTouchPoint({ x: (this.rotate ? this.canvasHeight : this.canvasWidth) / 2, y: (this.rotate ? this.canvasWidth : this.canvasHeight) / 2 }))
      const zoom = Math.floor(this.scale.x * 100) / 100
      const currentLocationInfo = `${Math.floor(centerX)},${Math.floor(centerY)},${zoom}z`

      this.radius = Math.floor(80 / (this.scale.x * this.scaleAdaption))
      this.centerX = Math.floor(centerX)
      this.centerY = Math.floor(centerY)

      // const ctx = this.context
      // const radius = 80 / (this.scale.x * this.scaleAdaption)

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

      this.nearbyPlaceList = [
        {
          ...this.markerObj,
          location: {
            x: Math.floor(this.centerX),
            y: Math.floor(this.centerY)
          }
        }
      ]

      console.log("search", this.centerX, this.centerY, this.radius)
      if (this.source) this.source.cancel(`request canceled by ${this.centerX}, ${this.centerY}, ${this.radius}`)
      this.source = axios.CancelToken.source()

      this.loading = true
      this.loadingError = false

      const query = {
        location: `${this.centerX},${this.centerY}`,
        r: this.radius,
        indoor: (this.$route.params.buildingId && this.$route.params.floorId) ? `${this.$route.params.buildingId},${this.$route.params.floorId}` : null
      }
      this.$api.search.searchGeo(query, { cancelToken: this.source.token }).then(data => {
        console.log(data)
        if (data.location?.x === this.centerX
            && data.location?.y === this.centerY
            && data.radius === this.radius
            && data.buildingId == this.$route.params.buildingId
            && data.floorId == this.$route.params.floorId) {
          let nearbyPlaceList
          if (!data.selectedPlaceList?.length) {
            nearbyPlaceList = [
              {
                ...this.markerObj,
                location: {
                  x: Math.floor(this.centerX),
                  y: Math.floor(this.centerY)
                }
              }
            ]
          } else {
            nearbyPlaceList = data.selectedPlaceList
          }
          nearbyPlaceList = nearbyPlaceList.concat(data.neighborList)
          this.nearbyPlaceList = nearbyPlaceList
        }
        if (!this.loadingError) this.loading = false
      }).catch(err => {
        console.log(err)
        this.loadingError = true
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

        const { x: mapCenterX, y: mapCenterY } = this.getTouchPoint({ x: (this.rotate ? this.canvasHeight : this.canvasWidth) / 2, y: (this.rotate ? this.canvasWidth : this.canvasHeight) / 2 })

        const newOriginX = mapCenterX - centerX * this.scale.x * this.scaleAdaption - this.positionAdaption.x
        const newOriginY = mapCenterY - centerY * this.scale.y * this.scaleAdaption - this.positionAdaption.y
        this.validatePosition(newOriginX, newOriginY)
      }
    },

    ontouchstartcancel(e) {
      this.moveInCancel = false
    },
    ontouchmovecancel(e) {
      this.moveInCancel = true
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
    }
  },
  mounted() {
    this.isCurrentTo = this.isSelectorTo

    this.canvas = this.$refs.canvas
    this.context = this.canvas.getContext("2d")

    this.imgWidth = parseInt(this.imageMap.get("map").width)
    this.imgHeight = parseInt(this.imageMap.get("map").height)

    this.context.drawImage(this.imageMap.get("map"), 0, 0, this.imgWidth, this.imgHeight)
    const pixel = this.context.getImageData(2, 2, 1, 1).data
    this.mapMarginColor = (!pixel?.length) ? null : `rgb(${pixel.join(",")})`
  
    this.resizeWindow()
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
          width: Math.ceil(this.iconSize * 2),
          height: Math.ceil(this.iconSize * 2)
        }
      }

      let currentScale = this.scale.x
      let { width: groupWidth, height: groupHeight } = getGroupSize(currentScale)
      let flag = false
      if (this.canvasWidth < groupWidth || this.canvasHeight < groupHeight) {
        currentScale = Math.floor(this.scale.x * 2) / 2;
        ({ width: groupWidth, height: groupHeight } = getGroupSize(currentScale));
        while ((this.canvasWidth < groupWidth || this.canvasHeight < groupHeight) && currentScale > 1) {
          flag = true
          currentScale = (currentScale - 0.5 < 1) ? 1 : (currentScale - 0.5);
          ({ width: groupWidth, height: groupHeight } = getGroupSize(currentScale));
        }
      } else if (this.canvasWidth > groupWidth && this.canvasHeight > groupHeight) {
        currentScale = Math.ceil(this.scale.x * 2) / 2;
        ({ width: groupWidth, height: groupHeight } = getGroupSize((currentScale + 0.5 > 4) ? 4 : (currentScale + 0.5)));
        while ((this.canvasWidth > groupWidth && this.canvasHeight > groupHeight) && currentScale < 4) {
          flag = true
          currentScale = (currentScale + 0.5 > 4) ? 4 : (currentScale + 0.5);
          ({ width: groupWidth, height: groupHeight } = getGroupSize((currentScale + 0.5 > 4) ? 4 : (currentScale + 0.5)));
        }
      }
      if (!flag) currentScale = this.scale.x;

      const posX = locationX
      const posY = locationY
      const scale = currentScale
      
      const { x: placeX, y: placeY } = this.getImageToCanvasPoint({ x: posX, y: posY })
      const { x: centerX, y: centerY }  = this.getTouchPoint({ x: (this.rotate ? this.canvasHeight : this.canvasWidth) / 2, y: (this.rotate ? this.canvasWidth : this.canvasHeight) / 2 })

      this.focusedPoint = { ...this.getImageToCanvasPoint({ x: posX, y: posY }) }
      this.manipulateMap(parseInt(centerX - placeX), parseInt(centerY - placeY), parseInt((scale - this.scale.x) * 10000) / 10000)
    })

    requestAnimationFrame(this.animate)
  },
  watch: {
    globalFromObj: {
      immediate: true,
      deep: true,
      handler: function(val) {
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
      handler: function(val) {
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
      handler: function(val) {
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
      handler: function(val) {
        if (!(val.x && val.y)) return
        if (this.locationUrlTimeout) clearTimeout(this.locationUrlTimeout)
        this.locationUrlTimeout = setTimeout(() => this.getNearbyPlaces(), 300)
      }
    },
    position: {
      deep: true,
      handler: function(val) {
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

        .refresh {
          span {
            font-size: 3.5vw;
            padding: 2vw;
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
}
</style>