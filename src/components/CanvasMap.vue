<template>
  <canvas ref="canvas" id="canvas" 
    @touchstart.self="ontouchstart"
    @touchmove.self="ontouchmove"
    @touchend.self="ontouchend"
    @guesturestart.stop @guesturechange.stop @guestureend.stop>[Your browser is too old!]</canvas>
</template>

<script>
import iconSpriteInfo from "assets/json/iconSpriteInfo.json"
import markerSpriteInfo from "assets/json/markerSpriteInfo.json"
import arrowSpriteInfo from "assets/json/arrowSpriteInfo.json"
import { easeOutBack, easeOutCirc, arrowAnimation, locationAnimation } from "assets/js/utilFunctions.js"

import { mapState } from "vuex"

export default {
  name: "CanvasMap",
  props: {
    indoorMode: Boolean,
    placeList: {
      type: Array,
      default: () => []
    },
    floorList: {
      type: Array,
      default: () => []
    },
    buildingList: {
      type: Array,
      default: () => []
    }, 
    mapLevel: Number,
    occupationDateStr: String
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
      tapTimeoutId: 0,
      lastTapTime: null,
      fastTapCount: 0,
      secondTouchstart: false,
      longPressed: false,
      longPressTimeoutId: 0,
      selectedPlace: {},
      selectedPlaceKeyArr: ["id", "placeType", "name", "floorId", "iconType", "displayLevel", "areaCoords"],
      fromDirectionMarker: {},
      toDirectionMarker: {},
      location: {
        x: null,
        y: null
      },
      iconSize: null,
      markerSize: null,
      locationIconSize: null,
      virtualButton: {
        position: {
          x: 100,
          y: 100
        },
        size: 0,
        tselected: false
      },
      currentHour: 0,
      gateIntervalId: null,
      mapAnimation: {
        deltaX: 0,
        deltaY: 0,
        deltaScale: 0,
        timer: -1,
        duration: 0
      },
      markerAnimationDuration: 0.5,
      lastMarkerAnimation: {
        x: 0,
        y: 0,
        markerType: "default",
        timer: -1
      },
      currentMarkerAnimation: {
        x: 0,
        y: 0,
        markerType: "default",
        timer: -1
      },
      arrowAnimation: {
        duration: 0.5,
        timer: 0
      },
      locationAnimation: {
        duration: 2,
        timer: 0
      },
      locationUrlTimeout: null,
      touchstartActivated: false,
      pathListComplete: {
        map: false,
        direction: false
      },
      placeListInitComplete: false
    }
  },
  computed: {
    ...mapState({
      imageWidth: state => state.imageWidth,  // original width of map image
      imageHeight: state => state.imageHeight,  // original height of map image
      maxScale: state => state.maxScale,
      minScale: state => state.minScale,
      indoorScale: state => state.indoorScale,
      imageMap: state => state.imageMap,
      rotate: state => state.imageRotation,
      marginColor: state => state.imageMarginColor,
      geolocation: state => state.geolocation,
      direction: state=> state.userDirection,
      firstRouteName: state => state.firstRouteName,
      firstRouteValue: state => state.firstRouteValue,
      globalFromObj: state => state.direction.globalFromObj,
      globalToObj: state => state.direction.globalToObj,
      globalPathList: state => state.direction.globalPathList,
      globalPathListIndex: state => state.direction.globalPathListIndex,
      displayVirtualButton: state => state.button.displayVirtualButton,
      gateActivated: state => state.button.gateActivated,
      occupationActivated: state => state.button.occupationActivated,
      locationActivated: state => state.button.locationActivated
    }),
    zoom() {
      const zoom = Math.pow(2, this.scale.x - 1) * this.scaleAdaption.x
      this.$store.commit("setZoom", zoom)
      return zoom
    }
  },
  methods: {
    initMap() {
      this.resetLayout()

      this.context.drawImage(this.imageMap.get("map"), 0, 0, this.imageWidth, this.imageHeight)
      const pixel = this.context.getImageData(2, 2, 1, 1).data
      if (pixel?.length) this.$store.commit("setImageMarginColor", `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`)

      this.setInitialMapLocation()

      this.setLocationUrl()

      if (!this.pathListComplete.map) this.pathListComplete.map = true
    },

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
          if (this.imageMap.has(`map${floor.id}`)) {
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
          }

          if (this.occupationActivated && this.occupationDateStr && this.occupationDateStr === floor.occupation?.time && floor.occupation?.data?.length) {
            floor.occupation.data.forEach(place => {
              this.drawArea(place.areaCoords, "#ff0000")
              // this.drawImage(this.imageMap.get('group'), place.location.x, place.location.y, this.iconSize, this.iconSize, this.iconSize/2, this.iconSize/2, true)
            })
          }

          if (this.gateActivated && floor.portal?.length) {
            const augY = arrowAnimation(this.arrowAnimation.timer, -this.iconSize, this.arrowAnimation.duration)
            const size = this.iconSize * 1.2
            floor.portal.forEach(place => {
              this.drawImage(this.imageMap.get("arrow"), place.location.x, place.location.y, size, size, size/2, 0, true, 
                (arrowSpriteInfo[place.arrow]["column"] - 1) * arrowSpriteInfo[place.arrow]["width"], (arrowSpriteInfo[place.arrow]["row"] - 1) * arrowSpriteInfo[place.arrow]["height"], arrowSpriteInfo[place.arrow]["width"], arrowSpriteInfo[place.arrow]["height"],
                place.direction * Math.PI / 180 + floor.degree, 0, (place.open ? augY : 0) + this.iconSize * 1.2)
            })
            this.arrowAnimation.timer = (this.arrowAnimation.timer + 0.016 > this.arrowAnimation.duration) ? 0 : this.arrowAnimation.timer + 0.016
          }
        })
      }

      if (this.$route.name !== "Direction") {
        if (!this.$isEmptyObject(this.selectedPlace))  this.drawArea(this.selectedPlace.areaCoords)
      } else {
        if (!this.$isEmptyObject(this.fromDirectionMarker)) this.drawArea(this.fromDirectionMarker.areaCoords)
        if (!this.$isEmptyObject(this.toDirectionMarker)) this.drawArea(this.toDirectionMarker.areaCoords)
      }

      if (this.globalPathList?.length) {
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        for (let index = this.globalPathList.length - 1; index >= 0; index--) {
          if (index === this.globalPathListIndex) continue
          const route = this.globalPathList[index];
          if (!route?.length) continue

          this.drawPath(route, 16, "#929497")
          this.drawPath(route, 12, "#bbbdbf")
        }

        const route = this.globalPathList[this.globalPathListIndex];
        if (route?.length) {
          this.drawPath(route, 16, "#3075d6")

          ctx.lineWidth = 12
          route.forEach((path, i) => {
            const pointList = path.pointList || []
            // ctx.strokeStyle = "#5298FF"
            ctx.strokeStyle = "#01DF4D"
            if (path.startLevel !== this.mapLevel || path.endLevel !== this.mapLevel) {
              if (path.startLevel > this.mapLevel || path.endLevel > this.mapLevel) {
                ctx.strokeStyle = "#DE1D16"
              } else if (path.startLevel < this.mapLevel || path.endLevel < this.mapLevel) {
                ctx.strokeStyle = "#161BDE"
              }
            } 

            ctx.beginPath()
            pointList.forEach((point, j) => {
              const { x, y } = this.getImageToCanvasPoint(point.x, point.y)
              if (j === 0) ctx.moveTo(x, y)
              else ctx.lineTo(x, y)
            })
            ctx.stroke()
          })
        }

        ctx.lineWidth = 1
      }

      if (this.placeList.length) {
        for (let i = this.placeList.length - 1; i >= 0; i--) {
          let place = this.placeList[i]
          if (place.zIndex === 0) continue
          // selected place
          if (!this.$isEmptyObject(this.selectedPlace) && this.selectedPlace.id === place.id && this.selectedPlace.placeType == place.placeType) continue
          // direction markers
          if (!this.$isEmptyObject(this.fromDirectionMarker) && this.globalFromObj.id === place.id && this.globalFromObj.placeType == place.placeType) continue
          if (!this.$isEmptyObject(this.toDirectionMarker) && this.globalToObj.id === place.id && this.globalToObj.placeType == place.placeType) continue
          // place not to display
          if (!place.displayLevel || (this.scale.x < place.displayLevel || this.scale.y < place.displayLevel)) continue
          this.drawImage(this.imageMap.get("icon"), place.location?.x, place.location?.y, this.iconSize, this.iconSize, this.iconSize/2, this.iconSize/2, true,
            (iconSpriteInfo[place.iconType]["column"] - 1) * iconSpriteInfo[place.iconType]["width"], (iconSpriteInfo[place.iconType]["row"] - 1) * iconSpriteInfo[place.iconType]["height"], iconSpriteInfo[place.iconType]["width"], iconSpriteInfo[place.iconType]["height"])
        }
      }

      if (this.$route.name !== "Direction") {
        if (this.lastMarkerAnimation.timer >= 0 && this.lastMarkerAnimation.timer <= this.markerAnimationDuration) {
          const t = this.lastMarkerAnimation.timer
          const sacleFactor = t < this.markerAnimationDuration ? easeOutCirc(t, 1, -0.8, this.markerAnimationDuration) : 0.2
          ctx.globalAlpha = sacleFactor
          this.drawMarker(this.lastMarkerAnimation.x, this.lastMarkerAnimation.y, this.markerSize * sacleFactor, this.lastMarkerAnimation.markerType)
          ctx.globalAlpha = 1
          this.lastMarkerAnimation.timer += 0.016
        }

        if (!this.$isEmptyObject(this.selectedPlace)) {
          const t = this.currentMarkerAnimation.timer
          const sacleFactor = t < this.markerAnimationDuration ? easeOutBack(t, 0.3, 0.7, this.markerAnimationDuration) : 1
          this.drawMarker(this.currentMarkerAnimation.x, this.currentMarkerAnimation.y, this.markerSize * sacleFactor, this.currentMarkerAnimation.markerType)
          if (t <= this.markerAnimationDuration) this.currentMarkerAnimation.timer += 0.016
        } 
      } else {
        if (!this.$isEmptyObject(this.fromDirectionMarker)) this.drawMarker(this.fromDirectionMarker.x, this.fromDirectionMarker.y, this.markerSize, "fromDir")
        if (!this.$isEmptyObject(this.toDirectionMarker)) this.drawMarker(this.toDirectionMarker.x, this.toDirectionMarker.y, this.markerSize, "toDir")
      }

      if (this.locationActivated && this.location.x != null && this.location.y != null) {
        if (this.direction != null) {
          this.drawImage(this.imageMap.get("locationProbe"), this.location.x, this.location.y, this.locationIconSize, this.locationIconSize, this.locationIconSize/2, this.locationIconSize/2, true, parseInt(this.direction))
        }
        this.drawImage(this.imageMap.get("locationMarker"), this.location.x, this.location.y, this.locationIconSize, this.locationIconSize, this.locationIconSize/2, this.locationIconSize/2, true)
        const aniSize = this.locationIconSize * 0.3 + locationAnimation(this.locationAnimation.timer, this.locationIconSize * 0.15, this.locationAnimation.duration)
        // this.drawImage(this.imageMap.get("locationCircle"), this.location.x, this.location.y, aniSize, aniSize, aniSize/2, aniSize/2, true)
        const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint(this.location.x, this.location.y)
        ctx.fillStyle = "#0069d9"
        ctx.beginPath()
        ctx.arc(canvasX, canvasY, aniSize / 2, 0, 2*Math.PI)
        ctx.fill()
        this.locationAnimation.timer = (this.locationAnimation.timer + 0.016 > this.locationAnimation.duration) ? 0 : this.locationAnimation.timer + 0.016
      }

      if (this.displayVirtualButton) {
        ctx.shadowBlur = 10
        ctx.shadowColor = "#555555"
        ctx.drawImage(this.imageMap.get("displayButton"), this.virtualButton.position.x, this.virtualButton.position.y, this.virtualButton.size, this.virtualButton.size)
        ctx.shadowBlur = 0
      }

      ctx.restore()
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
        ctx.rotate(degree + (this.rotate ? 90 : 0));
        ctx.translate(-canvasX, -canvasY);
        ctx.translate(translateX * scaleX, translateY * scaleY);
      }

      if (arguments.length >= 12) ctx.drawImage(image, sx, sy, sWidth, sHeight, parseInt(canvasX - imgOffsetX * scaleX), parseInt(canvasY - imgOffsetY * scaleY), sizeX * scaleX, sizeY * scaleY)
      else ctx.drawImage(image, parseInt(canvasX - imgOffsetX * scaleX), parseInt(canvasY - imgOffsetY * scaleY), sizeX * scaleX, sizeY * scaleY)

      if (degree != null) ctx.restore()
    },

    drawArea(polygonList, color = "#007bff") {
      if (!polygonList) return
      const ctx = this.context
      ctx.fillStyle = color
      ctx.strokeStyle = color
      ctx.lineWidth = 2
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

    drawMarker(x, y, size, iconType = "default") {
      const ctx = this.context
      ctx.shadowBlur = 10
      ctx.shadowColor = "#ffffff"
      this.drawImage(this.imageMap.get("marker"), x, y, size, size, size/2, size, true,
        (markerSpriteInfo[iconType]["column"] - 1) * markerSpriteInfo[iconType]["width"], (markerSpriteInfo[iconType]["row"] - 1) * markerSpriteInfo[iconType]["height"], markerSpriteInfo[iconType]["width"], markerSpriteInfo[iconType]["height"])
      ctx.shadowBlur = 0
    },

    drawPath(route, lineWidth, strokeStyle) {
      const ctx = this.context
      ctx.strokeStyle = strokeStyle
      ctx.lineWidth = lineWidth
      ctx.beginPath()
      route.forEach((path, i) => {
        const pointList = path.pointList || []
        pointList.forEach((point, j) => {
          const { x, y } = this.getImageToCanvasPoint(point.x, point.y)
          if (j === 0) {
            if (i === 0) ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
      })
      ctx.stroke()
    },

    getTouchPoint({ x, y }) {
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
        this.$store.commit("button/setDisplayRulerEvent", true)
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

    isPointInItem(pointX, pointY) {
      const ctx = this.context
      let { x: px, y: py } = this.getTouchPoint({ x: pointX, y: pointY })

      // tap on virtual button
      if (this.displayVirtualButton) {
        ctx.beginPath();
        ctx.rect(this.virtualButton.position.x, this.virtualButton.position.y, this.virtualButton.size, this.virtualButton.size)
        if (ctx.isPointInPath(px, py)) return 4
      }

      // tap on markers
      if (this.$route.name !== "Direction") {
        if (!this.$isEmptyObject(this.selectedPlace)) {
          const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint(this.currentMarkerAnimation.x, this.currentMarkerAnimation.y)
          ctx.beginPath()
          ctx.rect(parseInt(canvasX - this.markerSize/2), parseInt(canvasY - this.markerSize), this.markerSize, this.markerSize)
          if (ctx.isPointInPath(px, py)) return 1
        }
      } else {
        if (!this.$isEmptyObject(this.fromDirectionMarker)) {
          const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint(this.fromDirectionMarker.x, this.fromDirectionMarker.y)
          ctx.beginPath()
          ctx.rect(parseInt(canvasX - this.markerSize/2), parseInt(canvasY - this.markerSize), this.markerSize, this.markerSize)
          if (ctx.isPointInPath(px, py)) return 2
        }
        if (!this.$isEmptyObject(this.toDirectionMarker)) {
          const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint(this.toDirectionMarker.x, this.toDirectionMarker.y)
          ctx.beginPath()
          ctx.rect(parseInt(canvasX - this.markerSize/2), parseInt(canvasY - this.markerSize), this.markerSize, this.markerSize)
          if (ctx.isPointInPath(px, py)) return 3
        }
      }

      // tap on paths
      if (this.$route.name === "Direction" && this.globalPathList.length) {
        ctx.lineWidth = 24
        for (let index = -1; index < this.globalPathList.length; index++) {
          if (index === this.globalPathListIndex) continue
          const route = this.globalPathList[index === -1 ? this.globalPathListIndex : index]
          if (!route?.length) continue
          ctx.beginPath()
          route.forEach((path, i) => {
            const pointList = path.pointList || []
            pointList.forEach((point, j) => {
              const { x, y } = this.getImageToCanvasPoint(point.x, point.y)
              if (j === 0) {
                if (i === 0) ctx.moveTo(x, y)
              } else {
                ctx.lineTo(x, y)
              }
            })
          })
          if (ctx.isPointInStroke(px, py)) return 10 + (index === -1 ? this.globalPathListIndex : index)
        }
        ctx.lineWidth = 1
      }

      // tap on places
      const place = this.placeList
        .find(place => {
          if (place.zIndex === 0) return
          if (!this.$isEmptyObject(this.selectedPlace) && this.selectedPlace.id === place.id && this.selectedPlace.floorId == place.floorId) return
          if (!this.$isEmptyObject(this.fromDirectionMarker) && this.globalFromObj.id === place.id && this.globalFromObj.floorId == place.floorId) return
          if (!this.$isEmptyObject(this.toDirectionMarker) && this.globalToObj.id === place.id && this.globalToObj.floorId == place.floorId) return
          if (!place.areaCoords) {
            if (!place.displayLevel || (this.scale.x < place.displayLevel || this.scale.y < place.displayLevel)) return
            const { x, y } = this.getImageToCanvasPoint(place.location?.x, place.location?.y)
            ctx.beginPath()
            ctx.rect(parseInt(x - this.iconSize / 2), parseInt(y - this.iconSize / 2), this.iconSize, this.iconSize)
            return ctx.isPointInPath(px, py)
          } else {
            for (let i = 0; i < place.areaCoords.length; i++) {
              const polygon = place.areaCoords[i]
              ctx.beginPath()
              polygon[0].forEach((point, index) => {
                const { x, y } = this.getImageToCanvasPoint(point.x, point.y)
                if (index == 0) ctx.moveTo(x, y)
                else ctx.lineTo(x, y)
              })
              if (ctx.isPointInPath(px, py)) return true
            }
          }
        })
      if (place) return place

      // tap on selected area 
      if (this.$route.name !== "Direction") {
        if (this.selectedPlace?.areaCoords) {
          for (let i = 0; i < this.selectedPlace.areaCoords.length; i++) {
            ctx.beginPath()
            this.selectedPlace.areaCoords[i][0].forEach((point, index) => {
              const { x, y } = this.getImageToCanvasPoint(point.x, point.y)
              if (index == 0) ctx.moveTo(x, y)
              else ctx.lineTo(x, y)
            })
            if (ctx.isPointInPath(px, py)) return 1
          }
        }
      } else {
        if (this.fromDirectionMarker?.areaCoords) {
          for (let i = 0; i < this.fromDirectionMarker.areaCoords.length; i++) {
            ctx.beginPath()
            this.fromDirectionMarker.areaCoords[i][0].forEach((point, index) => {
              const { x, y } = this.getImageToCanvasPoint(point.x, point.y)
              if (index == 0) ctx.moveTo(x, y)
              else ctx.lineTo(x, y)
            })
            if (ctx.isPointInPath(px, py)) return 2
          }
        }
        if (this.toDirectionMarker?.areaCoords) {
          for (let i = 0; i < this.toDirectionMarker.areaCoords.length; i++) {
            ctx.beginPath()
            this.toDirectionMarker.areaCoords[i][0].forEach((point, index) => {
              const { x, y } = this.getImageToCanvasPoint(point.x, point.y)
              if (index == 0) ctx.moveTo(x, y)
              else ctx.lineTo(x, y)
            })
            if (ctx.isPointInPath(px, py)) return 3
          }
        }
      }
    },

    gesturePinchZoom(event) {
      let zoom
      if (event.touches.length >= 2) {
        const p1 = this.getTouchPoint({ x: event.touches[0].clientX, y: event.touches[0].clientY })
        const p2 = this.getTouchPoint({ x: event.touches[1].clientX, y: event.touches[1].clientY })
        
        this.focusedPoint = {
          x: (p1.x + p2.x) / 2,
          y: (p1.y + p2.y) / 2
        }
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
      this.longPressed = false
      this.secondTouchstart = false
      
      if (!this.canvas) return
      if (e.touches.length != 1) return

      if (this.displayVirtualButton) {
        this.virtualButton.tselected = false
        const element = this.isPointInItem(e.targetTouches[0].clientX, e.targetTouches[0].clientY)
        if (element && typeof element === "number" && element === 4) {
          this.virtualButton.tselected = true
          return
        }
      }

      if ((this.currentMarkerAnimation.timer >= 0 && this.currentMarkerAnimation.timer <= this.markerAnimationDuration) 
          || (this.lastMarkerAnimation.timer >= 0 && this.lastMarkerAnimation.timer <= this.markerAnimationDuration)) return
      if (this.lastTapTime && Date.now() - this.lastTapTime < 500) { // fast tap
        this.fastTapCount += 1
        if (this.fastTapCount % 2 === 1) this.secondTouchstart = true
        clearTimeout(this.tapTimeoutId)
        this.focusedPoint = this.getTouchPoint({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY })
      } else {
        this.fastTapCount = 0
        this.longPressTimeoutId = setTimeout(() => {
          this.longPressed = true
          this.chooseItem(e)
          console.log("longpress")
        }, 500)
      }
    },

    ontouchmove(e) {
      // e.preventDefault()
      // console.log("touchmove")
      if (this.longPressed) return
      clearTimeout(this.longPressTimeoutId)

      if (!this.tmove && Math.abs(this.tstartpos.x - e.changedTouches[0].clientX) <= 5 && Math.abs(this.tstartpos.y - e.changedTouches[0].clientY) <= 5) return
      this.tmove = true
      if (!this.canvas) return
      if (e.touches.length >= 2) { // pinch
        if (this.displayVirtualButton && this.virtualButton.tselected) this.virtualButton.tselected = false
        this.manipulateMap(this.gesturePinchZoom(e))
      } else if (e.touches.length == 1) {// move
        if (this.displayVirtualButton && this.virtualButton.tselected) {
          const { x: px, y: py } = this.getTouchPoint({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY })
          const offset = parseInt(this.virtualButton.size / 2)
          let posX = px - offset
          let posY = py - offset
          if (px + offset > this.canvasWidth) posX = this.canvasWidth - this.virtualButton.size
          else if (posX < 0) posX = 0
          if (py + offset > this.canvasHeight) posY = this.canvasHeight - this.virtualButton.size
          else if (posY < 0) posY = 0
          this.virtualButton.position.x = posX
          this.virtualButton.position.y = posY
        } else {
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
      }
    },

    ontouchend(e) {
      // console.log("touchend")
      if (this.longPressed) return
      clearTimeout(this.longPressTimeoutId)

      const tmove = this.tmove
      const tselected = this.virtualButton.tselected

      this.tmove = false
      if (this.displayVirtualButton && this.virtualButton.tselected) this.virtualButton.tselected = false

      if (!tmove) { // simple tap event
        if (this.displayVirtualButton && tselected) {
          // button group hidden mode 
          setTimeout(() => {
            this.$store.commit("button/setDisplayVirtualButton", false)
          }, 100)
          return
        }

        if (this.secondTouchstart) {
          this.focusedPoint = this.getTouchPoint({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY })
          this.mapAnimation = {
            deltaX: 0,
            deltaY: 0,
            deltaScale: 0.5,
            timer: 0,
            duration: 0.1
          }
        } else {
          this.tapTimeoutId = setTimeout(() => this.chooseItem(e), 500)
        }
        this.lastTapTime = Date.now()
      } else {
        if (this.locationUrlTimeout) clearTimeout(this.locationUrlTimeout)
        this.setLocationUrl()
      }
    },

    chooseItem(e) {
      if ((this.currentMarkerAnimation.timer >= 0 && this.currentMarkerAnimation.timer <= this.markerAnimationDuration) 
          || (this.lastMarkerAnimation.timer >= 0 && this.lastMarkerAnimation.timer <= this.markerAnimationDuration)) return

      const element = this.isPointInItem(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
      if (element) {
        if (this.$route.name !== "Direction") {
          // route is not direction
          if (typeof element === "number" && element === 1) {
            this.adjustMapPosition("include", this.selectedPlace.x, this.selectedPlace.y, null, this.selectedPlace.areaCoords)
            this.$EventBus.$emit("scrollPlacePanel", "m")
          } else if (typeof element === "object") {
            this.touchstartActivated = true
            this.setSelectedPlace(element)
          }
        } else {
          // route is direction
          if (typeof element === "number") {
            if (element >= 10) {
              const index = element - 10
              if (index !== this.globalPathListIndex) this.$store.commit("direction/setGlobalPathListIndex", index)
              this.$EventBus.$emit("scrollDirectionPanel", "t")
              this.adjustMapPosition("direction")
            }
          } else if (typeof element === "object") {
            if (!this.$isEmptyObject(this.fromDirectionMarker) && !this.$isEmptyObject(this.toDirectionMarker)) {
              // Exit Direction
              console.log("third point")
              this.touchstartActivated = true
              this.$store.commit("direction/setCachedPlaceInfo", {})
              this.setSelectedPlace(element)
            }
          }
        }
      } else {
        // click on nothing
        if (this.longPressed) {
          // marked place
          const touchPoint = this.getTouchPoint({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY })
          const { x: px, y: py } = this.getCanvasToImagePoint(touchPoint.x, touchPoint.y)
          if ((px >= 0 && px <= this.imageWidth) && (py >= 0 && py <= this.imageHeight)) {
            this.touchstartActivated = true
            const ctx = this.context
            const floor = this.floorList.find(floor => floor.buildingList.some(pf => {
              if (!pf.areaCoords) return false
              return pf.areaCoords.some(polygon => {
                let found = false
                polygon.forEach((pointList, ringIndex) => {
                  ctx.beginPath()
                  pointList.forEach((point, pointIndex) => {
                    if (pointIndex == 0) ctx.moveTo(point.x, point.y)
                    else ctx.lineTo(point.x, point.y)
                  })
                  if (ctx.isPointInPath(px, py)) {
                    found = ringIndex === 0
                  }
                })
                return found
              })
            }))
            this.setSelectedPlace({
              ...this.markedPlaceObj,
              location: {
                x: Math.floor(px * 10) / 10,
                y: Math.floor(py * 10) / 10
              },
              floorId: floor?.id
            })
          }
        } else if (!this.$isEmptyObject(this.selectedPlace)) {
          this.setSelectedPlace()
        }
      }
    },

    setSelectedPlace(place = {}, centered = false) {
      // null => a cV lX rV
      // a => a    cX lX rX
      // a => b    cV lV rV
      // a => null cX lV rV
      if (this.selectedPlace.id !== place.id 
          || this.selectedPlace.placeType !== place.placeType  
          || this.selectedPlace.floorId !== place.floorId
          || this.selectedPlace.x !== place.location?.x 
          || this.selectedPlace.y !== place.location?.y) {
        // click on another place or no place clicked before or click on nothing
        const oldVal = this.selectedPlace
        const selectedPlace = {}
        if (!this.$isEmptyObject(place)) {
          this.selectedPlaceKeyArr.forEach(key => selectedPlace[key] = place[key])
          selectedPlace["x"] = place.location?.x
          selectedPlace["y"] = place.location?.y
        }
        this.selectedPlace = selectedPlace
        const val = this.selectedPlace
        if (oldVal && oldVal.x != null && oldVal.y != null && this.$route.name !== "Direction") {
          this.lastMarkerAnimation = {
            timer: 0,
            x: oldVal.x,
            y: oldVal.y,
            markerType: oldVal.iconType || "default"
          }
        } 
        if (!val) return
        if (!this.$isEmptyObject(val)) {
          this.currentMarkerAnimation = {
            timer: 0,
            x: val.x,
            y: val.y,
            markerType: val.iconType || "default"
          }
          if (this.touchstartActivated) {
            if (centered) { 
              this.adjustMapPosition("middle", this.selectedPlace.x, this.selectedPlace.y, this.selectedPlace.displayLevel)
            } else {
              this.adjustMapPosition("include", this.selectedPlace.x, this.selectedPlace.y, null, this.selectedPlace.areaCoords)
            }
            this.touchstartActivated = false
          }

          let query = {}
          if (val.id) {
            query["id"] = `${val.id}`
          } else {
            query["location"] = `${val.x},${val.y}${val.floorId == null ? "" : (",f" + val.floorId)}`
          }

          if (!(this.$route.name === "Place" && JSON.stringify(this.$route.query, Object.keys(this.$route.query).sort()) === JSON.stringify(query, Object.keys(query).sort()))) {
            this.$router.push({
              name: "Place",
              params: {
                locationInfo: this.$route.params.locationInfo,
                floorId: this.$route.params.floorId
              },
              query
            })
          }
          this.$store.commit("place/setHeaderName", val.name || "")
        } else {
          if (!this.$route.name.match(/Search|Direction|Map/g)) {
            this.$router.push({
              name: "Map",
              params: {
                locationInfo: this.$route.params.locationInfo,
                floorId: this.$route.params.floorId
              }
            })
          }
        }
        // return false
      } 
      // else {
      //   // console.log("same place")
      //   // return true
      // }
    },

    adjustMapPosition(type, translateX = 0, translateY = 0, scale = 1, areaCoords) {
      ({ x: translateX, y: translateY } = this.transformPoint(translateX, translateY, this.rotate));
      if (type === "middle" || type === "direction") {
        if (type === "direction") {
          let pathPointList = []
          this.globalPathList.forEach(route => {
            route.forEach((path, i) => {
              const pointList = path.pointList || []
              pointList.forEach((point, j) => {
                if (i === 0 && j === 0) pathPointList.push(point)
                if (j > 0) pathPointList.push(point)
              })
            })
          })

          let areaPointList = []
          if (this.fromDirectionMarker.areaCoords) {
            this.fromDirectionMarker.areaCoords.forEach(polygon => areaPointList = areaPointList.concat(polygon[0]))
          }
          if (this.toDirectionMarker.areaCoords) {
            this.toDirectionMarker.areaCoords.forEach(polygon => areaPointList = areaPointList.concat(polygon[0]))
          }

          const markerList = []
          if (this.fromDirectionMarker.x != null && this.fromDirectionMarker.y != null) {
            markerList.push(this.transformPoint(this.fromDirectionMarker.x, this.fromDirectionMarker.y, this.rotate))
          }
          if (this.toDirectionMarker.x != null && this.toDirectionMarker.y != null) {
            markerList.push(this.transformPoint(this.toDirectionMarker.x, this.toDirectionMarker.y, this.rotate))
          }

          pathPointList = pathPointList.map(point => this.transformPoint(point.x, point.y, this.rotate))
          areaPointList = areaPointList.map(point => this.transformPoint(point.x, point.y, this.rotate))

          if (!markerList.length && !pathPointList.length) return

          const getGroupEnvelope = (currentScale = this.scale.x) => {
            let pointList = []
            const finalCurrentScale = Math.pow(2, currentScale - 1)
            const markerSize = this.markerSize / (finalCurrentScale * this.scaleAdaption.x)
            const margin = 30

            markerList.forEach(({ x: markerX, y: markerY }) => {
              pointList = pointList.concat([
                {x: markerX - markerSize / 2, y: markerY - markerSize},
                {x: markerX + markerSize / 2, y: markerY - markerSize},
                {x: markerX + markerSize / 2, y: markerY},
                {x: markerX - markerSize / 2, y: markerY}
              ])
            })

            pointList = pointList.concat(pathPointList).concat(areaPointList)

            const minX = pointList.reduce((min, p) => p.x < min ? p.x : min, pointList[0].x)
            const maxX = pointList.reduce((max, p) => p.x > max ? p.x : max, pointList[0].x)
            const minY = pointList.reduce((min, p) => p.y < min ? p.y : min, pointList[0].y)
            const maxY = pointList.reduce((max, p) => p.y > max ? p.y : max, pointList[0].y)

            return {
              width: Math.ceil((maxX - minX) * finalCurrentScale * this.scaleAdaption.x) + margin * 2,
              height: Math.ceil((maxY - minY) * finalCurrentScale * this.scaleAdaption.y) + margin * 2,
              x: parseInt((maxX + minX) / 2),
              y: parseInt((maxY + minY) / 2)
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

          ({ x: translateX, y: translateY } = getGroupEnvelope(currentScale));
          scale = currentScale
        }

        const { x: placeX, y: placeY } = this.getImageToCanvasPoint(translateX, translateY, false)
        const { x: centerX, y: centerY }  = this.getTouchPoint({ x: this.canvasWidth / 2, y: this.canvasHeight / 2 })
        this.focusedPoint = { x: placeX, y: placeY }
        this.mapAnimation = {
          imageX: translateX,
          imageY: translateY,
          deltaX: parseInt(centerX - placeX),
          deltaY: parseInt(centerY - placeY),
          deltaScale: parseInt((scale - this.scale.x) * 10000) / 10000,
          timer: 0,
          duration: 0.5
        }
      } else if (type === "include") {
        const { x: placeX, y: placeY } = this.getImageToCanvasPoint(translateX, translateY, false)
        let deltaX = 0
        let deltaY = 0
        const markerSize = this.markerSize

        let pointList = [
          {x: placeX - markerSize / 2, y: placeY - markerSize},
          {x: placeX + markerSize / 2, y: placeY - markerSize},
          {x: placeX + markerSize / 2, y: placeY},
          {x: placeX - markerSize / 2, y: placeY}
        ]
        if (areaCoords) {
          areaCoords.forEach(polygon => pointList = pointList.concat(polygon[0].map(point => this.getImageToCanvasPoint(point.x, point.y, false))))
        }

        const minX = pointList.reduce((min, p) => p.x < min ? p.x : min, pointList[0].x)
        const maxX = pointList.reduce((max, p) => p.x > max ? p.x : max, pointList[0].x)
        const minY = pointList.reduce((min, p) => p.y < min ? p.y : min, pointList[0].y)
        const maxY = pointList.reduce((max, p) => p.y > max ? p.y : max, pointList[0].y)

        const left = parseInt(minX - 30)
        const right = parseInt(maxX + 30)
        const top = parseInt(minY - 30)
        const bottom = parseInt(maxY + 30)

        if (left < 0) deltaX = -left // (0 - left)
        if (right - this.canvasWidth > 0) deltaX = this.canvasWidth - right

        if (top < 0) deltaY = -top // (0 - top)
        if (bottom - this.canvasHeight > 0) deltaY = this.canvasHeight - bottom

        this.mapAnimation = {
          deltaX: deltaX,
          deltaY: deltaY,
          deltaScale: 0,
          timer: 0,
          duration: 0.1
        }
      }
    },

    resetLayout() {
      const clientWidth = this.clientWidth - 2
      const clientHeight = this.clientHeight - 2 - this.clientWidth * 0.2

      if (this.canvas) {
        this.canvas.width = clientWidth
        this.canvas.height = clientHeight
      }

      const imageWidth = parseInt(this.imageMap.get("map").width)
      const imageHeight = parseInt(this.imageMap.get("map").height)
      console.log(imageWidth, imageHeight)

      if (imageWidth <= imageHeight) {
        this.$store.commit("setImageRotation", clientWidth > clientHeight)
      } else { // imageWidth > imageHeight  
        this.$store.commit("setImageRotation", clientWidth < clientHeight)
      }

      this.$store.commit("setImageWidth", this.rotate ? imageHeight : imageWidth)
      this.$store.commit("setImageHeight", this.rotate ? imageWidth : imageHeight)

      this.canvasWidth = clientWidth
      this.canvasHeight = clientHeight

      const scaleAdaption = Math.min(this.canvasWidth / this.imageWidth, this.canvasHeight / this.imageHeight)
      this.scaleAdaption = {
        x: scaleAdaption,
        y: scaleAdaption
      }
      this.translateAdaption = {
        x: parseInt(this.canvasWidth - this.imageWidth * this.scaleAdaption.x) / 2,
        y: parseInt(this.canvasHeight - this.imageHeight * this.scaleAdaption.y) / 2
      }

      const iconSize = Math.max(clientWidth, clientHeight) || 0
      this.iconSize = parseInt(iconSize * 0.04)
      this.markerSize = this.iconSize * 2
      this.locationIconSize = parseInt(this.iconSize * 1.2)

      this.virtualButton.size = parseInt(this.clientWidth * 0.09)
    },

    setLocationUrl() {
      if (this.tmove) return
      if (!this.canvasWidth || !this.canvasHeight || !this.imageWidth || !this.imageHeight) return
      if (!this.scale.x || !this.scale.y || this.translate.x == null || this.translate.y == null) return

      const touchPoint = this.getTouchPoint({ x: this.canvasWidth / 2, y: this.canvasHeight / 2 })
      const { x: centerX, y: centerY } = this.getCanvasToImagePoint(touchPoint.x, touchPoint.y)
      const zoom = Math.floor(this.scale.x * 100) / 100
      const currentLocationInfo = `${Math.floor(centerX)},${Math.floor(centerY)},${zoom}z`

      const matchArr = this.$route.params.locationInfo?.match(this.locationUrlReg)
      if (matchArr?.[0] === currentLocationInfo) return

      this.$store.commit("setCenterLocation", this.getImageToGeoPoint(centerX, centerY))

      this.$router.replace({
        name: this.$route.name,
        query: this.$route.query,
        params: {
          ...this.$route.params,
          locationInfo: currentLocationInfo
        }
      })
    },

    setInitialMapLocation() {
      const matchArr = this.$route.params.locationInfo?.match(this.locationUrlReg)
      if (matchArr) {
        const { x: centerX, y: centerY } = this.transformPoint(parseInt(matchArr[1]), parseInt(matchArr[2]), this.rotate)
        const zoom = Math.floor(parseFloat(matchArr[3]) * 100) / 100

        this.validateScale(zoom)

        const { x: mapCenterX, y: mapCenterY } = this.getTouchPoint({ x: this.canvasWidth / 2, y: this.canvasHeight / 2 })
        const newOriginX = mapCenterX - centerX * this.zoom - this.translateAdaption.x
        const newOriginY = mapCenterY - centerY * this.zoom - this.translateAdaption.y

        this.validateTranslate(newOriginX, newOriginY)

        this.checkCenteredBuilding()
        return
      }

      if (this.locationUrlTimeout) clearTimeout(this.locationUrlTimeout)
      this.locationUrlTimeout = setTimeout(() => this.setLocationUrl(), 300)
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
        this.$store.commit("setCurrentBuildingId", minPlace.id)
      }
    }
  },

  created() {
    if (this.$route.params.locationInfo) {
      const matchArr = this.$route.params.locationInfo?.match(this.locationUrlReg)
      if (matchArr) {
        this.$store.commit("setCenterLocation", this.getImageToGeoPoint(parseInt(matchArr[1]), parseInt(matchArr[2])))
      }
    }

    const unwatch = this.$watch("placeList", val => {
      if (val?.length) {
        if (this.$route.name === "Place") {
          let floorId
          let place
          if (this.$route.query.id?.match(this.placeIdReg)) {
            const id = parseInt(RegExp.$1)
            if (RegExp.$3) {
              floorId = parseInt(RegExp.$3)
            }
            place = val.filter(e => !(e.placeType === "building" && e.floorId)).find(e => e.id === id && e.floorId == floorId)
            if (!place) {
              place = {
                ...this.defaultPlaceObj,
                id,
                location: {},
                floorId
              }
            }      
          } else if (this.$route.query.location?.match(/^(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)(,(f(\d+))?)?$/i)) {
            if (RegExp.$7) {
              floorId = parseInt(RegExp.$7)
            }
            place = {
              ...this.markedPlaceObj,
              location: {
                x: Math.floor(parseFloat(RegExp.$1) * 10) / 10,
                y: Math.floor(parseFloat(RegExp.$3) * 10) / 10
              },
              floorId
            }
          }
          if (this.firstRouteName === "Place" && this.firstRouteValue) {
            place = this.firstRouteValue
          }
          this.setSelectedPlace(place || {})
        }
      }
      if (unwatch) {
        unwatch()
      }
    })

    this.$EventBus.$on("setSelectedPlace", this.setSelectedPlace)

    this.$EventBus.$on("updateSelectedPlace", (place = {}) => {
      if (!this.placeListInitComplete) return
      if (this.$isEmptyObject(place) || this.$isEmptyObject(this.selectedPlace)) return
      let flag = false
      if (place.id && place.id === this.selectedPlace.id) flag = true
      else if ((place.location.x || place.location.x === 0) && (place.location.y || place.location.y === 0) && place.location.x === this.selectedPlace.x && place.location.y === this.selectedPlace.y) flag = true
      if (!flag) return

      this.selectedPlaceKeyArr.forEach(key => this.selectedPlace[key] = place[key])
      this.selectedPlace["x"] = place.location.x
      this.selectedPlace["y"] = place.location.y
      this.currentMarkerAnimation["x"] = place.location.x
      this.currentMarkerAnimation["y"] = place.location.y
      this.currentMarkerAnimation["markerType"] = place.iconType || "default"
    })

    this.$EventBus.$on("displayPath", () => this.adjustMapPosition("direction"))
  },

  mounted() {
    this.canvas = this.$refs.canvas
    this.context = this.canvas.getContext("2d")

    window.requestAnimationFrame(this.animate)

    // window.confetti.start(10000, 100, 200)
  },

  beforeDestroy() {
    if (this.gateIntervalId) clearInterval(this.gateIntervalId)
  },

  watch: {
    pathListComplete: {
      immediate: true,
      deep: true,
      handler: function (val) {
        if (!val.map || !val.direction) return
        this.$nextTick(() => this.adjustMapPosition("direction"))
      }
    },
    displayVirtualButton(val) {
      if (!val) return
      this.virtualButton.position.x = parseInt(this.canvasWidth * 0.98 - this.virtualButton.size)
      this.virtualButton.position.y = parseInt((this.canvasHeight - this.virtualButton.size) / 2)
    },
    geolocation(val, oldVal) {
      if (!(val.lon && val.lat)) return
      const firstcall = !oldVal.lon && !oldVal.lat
      const { x, y } = this.getGeoToImagePoint(val.lon, val.lat)
      // const { x, y } =  { x: this.imageWidth / 2, y: this.imageHeight / 2}
      if ((x >= 0 && x <= this.imageWidth) && (y >= 0 && y <= this.imageHeight)) {
        this.location = {
          x,
          y
        }
        if (firstcall) this.adjustMapPosition("middle", this.location.x, this.location.y, 1)
      } else {
        this.$toast({
          message: "You are not in campus right now.",
          time: 3000
        })
      }
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
    globalPathList(val) {
      if (!val.length) return
      if (this.scaleAdaption.x != null && this.scaleAdaption.y != null && this.translateAdaption.x != null && this.translateAdaption.y != null) {
        if (this.pathListComplete.direction) this.$nextTick(() => this.adjustMapPosition("direction"))
      }
      if (!this.pathListComplete.direction) this.pathListComplete.direction = true
    },
    scale: {
      deep: true,
      handler: function (val) {
        if (!(val.x && val.y)) return
        if (this.locationUrlTimeout) clearTimeout(this.locationUrlTimeout)
        this.locationUrlTimeout = setTimeout(() => this.setLocationUrl(), 300)
        this.$store.commit("setScale", val.x)
      }
    },
    translate: {
      deep: true,
      handler: function (val) {
        if (!(val.x != null && val.y != null)) return
        if (this.locationUrlTimeout) clearTimeout(this.locationUrlTimeout)
        this.locationUrlTimeout = setTimeout(() => this.setLocationUrl(), 300)
      }
    },
    $route: {
      immediate: true,
      handler: function (to, from) {
        if (this.checkRouterChange(to.fullPath, from?.fullPath)) {
          if (to.name !== 'Place') {
            this.setSelectedPlace()
          }
          if (to.name === "Direction") {
            this.lastMarkerAnimation = {
              ...this.lastMarkerAnimation,
              timer: this.markerAnimationDuration + 0.01
            }
          }
        }
        this.setLocationUrl()
      }
    }
  }
}
</script>

<style lang="scss">
#canvas {
  margin: 0 auto;
  border: 1px black solid;
  display: block;
}
</style>
