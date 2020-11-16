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
import { easeOutBack, easeOutCirc, arrowAnimation, locationAnimation } from "utils/utilFunctions.js"

import { mapState } from "vuex"

export default {
  name: "CanvasMap",
  props: {
    mapLevel: Number,
    occupiedRoomList: {
      type: Array,
      default: () => []
    },
    gateList: {
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
      tapTimeoutId: 0,
      lastTapTime: null,
      lastDoubleTap: false,
      longPressed: false,
      longPressTimeoutId: 0,
      selectedPlace: {},
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
      fromDirectionMarker: {},
      toDirectionMarker: {},
      location: {
        x: null,
        y: null
      },
      iconSize: null,
      mapMarginColor: null,
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
      fromDirectionMarkerComplete: {
        map: false,
        direction: false
      },
      toDirectionMarkerComplete: {
        map: false,
        direction: false
      },
      pathListComplete: {
        map: false,
        direction: false
      }
    }
  },
  computed: {
    ...mapState({
      imageMap: state => state.imageMap,
      rotate: state => state.imageRotation,
      placeList: state => state.placeList,
      geolocation: state => state.geolocation,
      direction: state=> state.userDirection,
      displayVirtualButton: state => state.button.displayVirtualButton,
      gateActivated: state => state.button.gateActivated,
      occupationActivated: state => state.button.occupationActivated,
      locationActivated: state => state.button.locationActivated,
      globalFromObj: state => state.direction.globalFromObj,
      globalToObj: state => state.direction.globalToObj,
      globalPathList: state => state.direction.globalPathList,
      globalPathListIndex: state => state.direction.globalPathListIndex
    })
  },
  methods: {
    initMap() {
      this.imgWidth = parseInt(this.imageMap.get("map").width)
      this.imgHeight = parseInt(this.imageMap.get("map").height)
      console.log(this.imgWidth, this.imgHeight)

      this.context.drawImage(this.imageMap.get("map"), 0, 0, this.imgWidth, this.imgHeight)
      const pixel = this.context.getImageData(2, 2, 1, 1).data
      this.mapMarginColor = (!pixel?.length) ? null : `rgb(${pixel.join(",")})`
    
      this.resizeWindow()
      this.setInitialMapLocation()

      this.setLocationUrl()

      if (!this.pathListComplete.map) this.pathListComplete.map = true
    },

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
        const deltaX = easeOutCirc(nt, 0, this.mapAnimation.deltaX, this.mapAnimation.duration) - easeOutCirc(t, 0, this.mapAnimation.deltaX, this.mapAnimation.duration)
        const deltaY = easeOutCirc(nt, 0, this.mapAnimation.deltaY, this.mapAnimation.duration) - easeOutCirc(t, 0, this.mapAnimation.deltaY, this.mapAnimation.duration)
        const deltaScale = easeOutCirc(nt, 0, this.mapAnimation.deltaScale, this.mapAnimation.duration) - easeOutCirc(t, 0, this.mapAnimation.deltaScale, this.mapAnimation.duration)
        // const deltaX = (nt - t) / this.mapAnimation.duration * this.mapAnimation.deltaX
        // const deltaY = (nt - t) / this.mapAnimation.duration * this.mapAnimation.deltaY 
        // const deltaScale = (nt - t) / this.mapAnimation.duration * this.mapAnimation.deltaScale 
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

      this.drawImage(this.imageMap.get("map"), 0, 0, this.imgWidth, this.imgHeight, 0, 0, false, false)

      // ctx1.clearRect(0,0,800,800);
      // ctx1.fillStyle='blue';
      // ctx1.translate((obj.x+(obj.width/2)),(obj.y+(obj.height/2)));
      // ctx1.rotate(Math.PI/180);
      // ctx1.translate(-(obj.x+(obj.width/2)),-(obj.y+(obj.height/2)));
      // ctx1.strokeRect(obj.x,obj.y,obj.width,obj.height);
      // ctx1.fillRect(obj.x,obj.y,obj.width,obj.height);

      // ctx.font = "48px bold serif";
      // ctx.fillStyle = "#000";
      // ctx.textAlign = "center";
      // ctx.textBaseline = "middle";
      // ctx.fillText("hello from the other side", 100, 100);

      // Gate arrow
      if (this.gateActivated && this.gateList) {
        const arrowDuration = 0.5
        const augY = arrowAnimation(this.arrowAnimation.timer, -20, arrowDuration)
        const size = parseInt(this.iconSize * 1.5)
        this.gateList.forEach((e) => {
          this.drawImage(this.imageMap.get("arrowSprite"), e.location.x, e.location.y, size, size, size/2, 0, true, false, 
          (arrowSpriteInfo[e.arrow]["column"] - 1) * arrowSpriteInfo[e.arrow]["width"], (arrowSpriteInfo[e.arrow]["row"] - 1) * arrowSpriteInfo[e.arrow]["height"], arrowSpriteInfo[e.arrow]["width"], arrowSpriteInfo[e.arrow]["height"],
          e.direction, 0, (this.currentHour >= e.startTime && this.currentHour < e.endTime) ? augY : 0)
        })
        this.arrowAnimation.timer = (this.arrowAnimation.timer + 0.016 > arrowDuration) ? 0 : this.arrowAnimation.timer + 0.016
      }

      if (!this.occupationActivated) {
        if (this.$route.name !== "Direction") {
          if (!this.$isEmptyObject(this.selectedPlace))  this.drawPolygon(this.selectedPlace.areaCoords)
        } else {
          if (!this.$isEmptyObject(this.fromDirectionMarker)) this.drawPolygon(this.fromDirectionMarker.areaCoords)
          if (!this.$isEmptyObject(this.toDirectionMarker)) this.drawPolygon(this.toDirectionMarker.areaCoords)
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
                const { x, y } = this.getImageToCanvasPoint(point)
                if (j === 0) ctx.moveTo(x, y)
                else ctx.lineTo(x, y)
              })
              ctx.stroke()
            })
          }

          ctx.lineWidth = 1
        }

        if (this.placeList.length) {
          this.placeList.forEach(place => {
            // selected place
            if (!this.$isEmptyObject(this.selectedPlace) && this.selectedPlace.id === place.id && this.selectedPlace.placeType === place.placeType) return
            // direction markers
            if (!this.$isEmptyObject(this.fromDirectionMarker) && this.fromDirectionMarker.id === place.id && this.fromDirectionMarker.placeType === place.placeType) return
            if (!this.$isEmptyObject(this.toDirectionMarker) && this.toDirectionMarker.id === place.id && this.toDirectionMarker.placeType === place.placeType) return
            // place not to display
            if (!place.iconLevel || (this.scale.x < place.iconLevel || this.scale.y < place.iconLevel)) return
            const size = this.iconSize
            this.drawImage(this.imageMap.get("facilitySprite"), place.location.x, place.location.y, size, size, size/2, size/2, true, true, 
              (iconSpriteInfo[place.iconType]["column"] - 1) * iconSpriteInfo[place.iconType]["width"], (iconSpriteInfo[place.iconType]["row"] - 1) * iconSpriteInfo[place.iconType]["height"], iconSpriteInfo[place.iconType]["width"], iconSpriteInfo[place.iconType]["height"])
          })
        }
        
        if (this.$route.name !== "Direction") {
          if (this.lastMarkerAnimation.timer >= 0 && this.lastMarkerAnimation.timer <= this.markerAnimationDuration) {
            const t = this.lastMarkerAnimation.timer
            const size = t < this.markerAnimationDuration ? easeOutCirc(t, this.iconSize*2, -this.iconSize*1.9, this.markerAnimationDuration) : 0
            this.drawMarker(this.lastMarkerAnimation.x, this.lastMarkerAnimation.y, size, this.lastMarkerAnimation.markerType)
            this.lastMarkerAnimation.timer += 0.016
          }

          if (!this.$isEmptyObject(this.selectedPlace)) {
            const t = this.currentMarkerAnimation.timer
            const size = t < this.markerAnimationDuration ? easeOutBack(t, this.iconSize*2/3, this.iconSize*2*2/3, this.markerAnimationDuration) : this.iconSize*2
            this.drawMarker(this.currentMarkerAnimation.x, this.currentMarkerAnimation.y, size, this.currentMarkerAnimation.markerType)
            if (t <= this.markerAnimationDuration) this.currentMarkerAnimation.timer += 0.016
          } 
        } else {
          if (!this.$isEmptyObject(this.fromDirectionMarker)) this.drawMarker(this.fromDirectionMarker.x, this.fromDirectionMarker.y, this.iconSize * 2, "fromDir")
          if (!this.$isEmptyObject(this.toDirectionMarker)) this.drawMarker(this.toDirectionMarker.x, this.toDirectionMarker.y, this.iconSize * 2, "toDir")
        }
      }

      if (this.occupationActivated && this.occupiedRoomList) {
        const size = this.iconSize;
        this.occupiedRoomList.forEach(room => {
          const centroid = room.location
          this.drawImage(this.imageMap.get('group'), centroid.x, centroid.y, size, size, size/2, size/2, true, true)
        })
      }

      if (this.locationActivated && this.location.x != null && this.location.y != null) {
        const size = this.iconSize * 1.2
        if (this.direction != null) {
          this.drawImage(this.imageMap.get("locationProbe"), this.location.x, this.location.y, size, size, size/2, size/2, true, false, parseInt(this.direction))
        }
        this.drawImage(this.imageMap.get("locationMarker"), this.location.x, this.location.y, size, size, size/2, size/2, true, false)
        const aniSize = size * 0.3 + locationAnimation(this.locationAnimation.timer, size * 0.15, this.locationAnimation.duration)
        // this.drawImage(this.imageMap.get("locationCircle"), this.location.x, this.location.y, aniSize, aniSize, aniSize/2, aniSize/2, true, false)
        ctx.restore()
        const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint({ x: this.location.x, y: this.location.y })
        this.context.fillStyle = "#0069d9"
        ctx.beginPath()
        ctx.arc(canvasX, canvasY, aniSize / 2, 0, 2*Math.PI)
        ctx.fill()
        ctx.save()
        ctx.translate(this.canvasHeight, 0)
        ctx.rotate(Math.PI / 2)
        this.locationAnimation.timer = (this.locationAnimation.timer + 0.016 > this.locationAnimation.duration) ? 0 : this.locationAnimation.timer + 0.016
      }

      if (this.displayVirtualButton) {
        ctx.restore()
        const size = this.virtualButton.size
        ctx.shadowBlur = 10
        ctx.shadowColor = "#555555"
        ctx.fillStyle = "#f8f9fa"
        ctx.fillRect(this.virtualButton.position.x, this.virtualButton.position.y, size, size)
        ctx.shadowBlur = 0
        ctx.drawImage(this.imageMap.get('eye'), this.virtualButton.position.x, this.virtualButton.position.y, size, size)
        ctx.save()
      }

      ctx.restore()
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

    drawMarker(x, y, size, iconType = "default") {
      const ctx = this.context
      ctx.shadowBlur = 10
      ctx.shadowColor = "#ffffff"
      this.drawImage(this.imageMap.get('markers'), x, y, size, size, size/2, size, true, true,
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
          const { x, y } = this.getImageToCanvasPoint(point)
          if (j === 0) {
            if (i === 0) ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
      })
      ctx.stroke()
    },

    getTouchPoint({ x, y }, followRotation = true) {
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

    isPointinItem(pointX, pointY) {
      const ctx = this.context
      let { x: px, y: py } = this.getTouchPoint({ x: pointX, y: pointY }, false)

      // tap on virtual button
      if (this.displayVirtualButton) {
        ctx.beginPath();
        ctx.rect(this.virtualButton.position.x, this.virtualButton.position.y, this.virtualButton.size, this.virtualButton.size)
        if (ctx.isPointInPath(px, py)) return 4
      }

      // tap on markers
      const size = this.iconSize * 2
      const selfRotate = false
      if (!this.$isEmptyObject(this.selectedPlace)) {
        const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint({ x: this.currentMarkerAnimation.x, y: this.currentMarkerAnimation.y })
        ctx.beginPath()
        if (!this.rotate || selfRotate) ctx.rect(parseInt(canvasX - size/2), parseInt(canvasY - size), size, size)
        else ctx.rect(parseInt(this.canvasHeight - (canvasY + size/2)), parseInt(canvasX - size), size, size)
        if (ctx.isPointInPath(px, py)) return 1
      }

      // tap on places
      ({ x: px, y: py } = this.getTouchPoint({ x: pointX, y: pointY }));
      const place = this.placeList.filter(place => place.id !== this.selectedPlace.id).find(place => {
        if (!place.areaCoords) {
          if (!place.iconLevel || (this.scale.x < place.iconLevel || this.scale.y < place.iconLevel)) return
          const { x, y } = this.getImageToCanvasPoint(place.location)
          ctx.beginPath()
          ctx.rect(parseInt(x - this.iconSize / 2), parseInt(y - this.iconSize / 2), this.iconSize, this.iconSize)
        } else {
          const pointList = place.areaCoords[0] || []
          ctx.beginPath()
          pointList.forEach((e, index) => {
            const { x, y } = this.getImageToCanvasPoint(e)
            if (index == 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          })
        }
        if (ctx.isPointInPath(px, py)) return true
      })
      if (place) return place

      // click on paths
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
              const { x, y } = this.getImageToCanvasPoint(point)
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

      // tap on selected area 
      if (this.$route.name !== "Direction" && this.selectedPlace?.areaCoords) {
        ctx.beginPath()
        this.selectedPlace.areaCoords[0].forEach((e, index) => {
          const { x, y } = this.getImageToCanvasPoint(e)
          if (index == 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        if (ctx.isPointInPath(px, py)) return 1
      }
    },

    ontouchstart(e) {
      // console.log("touchstart")
      this.lastX = null
      this.lastY = null
      this.lastZoomScale = null
      this.tmove = false
      this.longPressed = false
      
      if (this.displayVirtualButton) {
        this.virtualButton.tselected = false
        const element = this.isPointinItem(e.targetTouches[0].clientX, e.targetTouches[0].clientY)
        if (element && typeof element === "number" && element === 4) this.virtualButton.tselected = true
      }

      if (!this.canvas) return
      if (e.touches.length == 1 && !this.virtualButton.tselected) {
        this.longPressTimeoutId = setTimeout(() => {
          this.longPressed = true
          this.chooseItem(e)
          // console.log("longpress")
        }, 500)
      }
    },

    ontouchmove(e) {
      // e.preventDefault()
      // console.log("touchmove")
      if (this.longPressed) return
      clearTimeout(this.longPressTimeoutId)

      this.tmove = true
      if (!this.canvas) return
      if (e.touches.length == 2) { // pinch
        if (this.displayVirtualButton && this.virtualButton.tselected) this.virtualButton.tselected = false
        this.manipulateMap(this.gesturePinchZoom(e))
      } else if (e.touches.length == 1) {// move
        if (this.displayVirtualButton && this.virtualButton.tselected) {
          const { x: px, y: py } = this.getTouchPoint({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }, false)
          const canvasWidth = this.rotate ? this.canvasHeight : this.canvasWidth
          const canvasHeight = this.rotate ? this.canvasWidth : this.canvasHeight
          const offset = parseInt(this.virtualButton.size / 2)
          this.virtualButton.position.x = (px + offset > canvasWidth) ? canvasWidth - offset * 2 : px - offset
          this.virtualButton.position.y = (py + offset > canvasHeight) ? canvasHeight - offset * 2 : py - offset
          if (this.virtualButton.position.x < 0) this.virtualButton.position.x = 0
          if (this.virtualButton.position.y < 0) this.virtualButton.position.y = 0
        } else {
          const { x: px, y: py } = this.getTouchPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY})   
          if (this.lastX != null && this.lastY != null) this.manipulateMap(px - this.lastX, py - this.lastY)
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

        if (!(this.currentMarkerAnimation.timer >= 0 && this.currentMarkerAnimation.timer <= this.markerAnimationDuration) 
          && !(this.lastMarkerAnimation.timer >= 0 && this.lastMarkerAnimation.timer <= this.markerAnimationDuration)) {
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
              clearTimeout(this.tapTimeoutId)
              return
            }
          }
          this.tapTimeoutId = setTimeout(() => this.chooseItem(e), 500)
          this.lastTapTime = currentTime
          this.lastDoubleTap = false
        }
      } else {
        if (this.locationUrlTimeout) clearTimeout(this.locationUrlTimeout)
        this.setLocationUrl()
      }
      
    },
  
    chooseItem(e) {
      if (!(this.currentMarkerAnimation.timer >= 0 && this.currentMarkerAnimation.timer <= this.markerAnimationDuration) 
        && !(this.lastMarkerAnimation.timer >= 0 && this.lastMarkerAnimation.timer <= this.markerAnimationDuration)) {
        // occupation mode
        if (this.occupationActivated) {
          this.$toast({
            message: 'To do other operations, please quit room occupation mode first.',
            time: 3000
          })
          return
        }

        const element = this.isPointinItem(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
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
            if (typeof element === "number" && element >= 10) {
              const index = element - 10
              if (index !== this.globalPathListIndex) this.$store.commit("direction/setGlobalPathListIndex", index)
              this.$EventBus.$emit("scrollDirectionPanel", "t")
              this.adjustMapPosition("direction")
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
            const { x: px, y: py } = this.getCanvasToImagePoint(this.getTouchPoint({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }))
            if ((px >= 0 && px <= this.imgWidth) && (py >= 0 && py <= this.imgHeight)) {
              this.touchstartActivated = true
              this.setSelectedPlace({
                ...this.markerObj,
                location: {
                  x: Math.floor(px),
                  y: Math.floor(py)
                },
                buildingId: parseInt(this.$route.params.buildingId),
                floorId: parseInt(this.$route.params.floorId)
              })
              return
            }
          }
          if (!this.$isEmptyObject(this.selectedPlace)) {
            this.setSelectedPlace()
          }
        }
      }
    },

    setSelectedPlace(place = {}) {
      // null => a cV lX rV
      // a => a    cX lX rX
      // a => b    cV lV rV
      // a => null cX lV rV
      if (this.selectedPlace.id !== place.id || this.selectedPlace.placeType !== place.placeType || this.selectedPlace.x !== place.location?.x || this.selectedPlace.y !== place.location?.y) {
        // click on another place or no place clicked before or click on nothing
        this.selectedPlace = !this.$isEmptyObject(place) ? {
          id: place.id,
          placeType: place.placeType,
          areaCoords: place.areaCoords,
          name: place.name,
          iconType: place.iconType,
          iconLevel: place.iconLevel,
          ...place.location
        } : place
        return false
      } else {
        // console.log("same place")
        return true
      }
    },

    adjustMapPosition(type, posX = 0, posY = 0, scale = 1, areaCoords) {
      if (type === "middle" || type === "direction") {
        if (type === "direction") {
          const pathPointList = []
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
          if (this.fromDirectionMarker.areaCoords?.[0]?.length >= 3) areaPointList = areaPointList.concat(this.fromDirectionMarker.areaCoords[0])
          if (this.toDirectionMarker.areaCoords?.[0]?.length >= 3) areaPointList = areaPointList.concat(this.toDirectionMarker.areaCoords[0])

          const markerList = []
          if (this.fromDirectionMarker.x != null && this.fromDirectionMarker.y != null) markerList.push({ x: this.fromDirectionMarker.x, y: this.fromDirectionMarker.y})
          if (this.toDirectionMarker.x != null && this.toDirectionMarker.y != null) markerList.push({ x: this.toDirectionMarker.x, y: this.toDirectionMarker.y})

          const getGroupSize = (currentScale = this.scale.x) => {
            let pointList = []
            const markerSize = this.iconSize * 2 / (currentScale * this.scaleAdaption)
            const margin = 30

            markerList.forEach(({ x: markerX, y: markerY }) => {
              let markerPointList
              if (this.rotate) {
                markerPointList = [
                  {x: markerX - markerSize, y: markerY + markerSize / 2},
                  {x: markerX - markerSize, y: markerY - markerSize / 2},
                  {x: markerX, y: markerY - markerSize / 2},
                  {x: markerX, y: markerY + markerSize / 2}
                ]
              } else {
                markerPointList = [
                  {x: markerX - markerSize / 2, y: markerY - markerSize},
                  {x: markerX + markerSize / 2, y: markerY - markerSize},
                  {x: markerX + markerSize / 2, y: markerY},
                  {x: markerX - markerSize / 2, y: markerY}
                ]
              } 
              pointList = pointList.concat(markerPointList)
            })

            pointList = pointList.concat(pathPointList).concat(areaPointList)

            const minX = pointList.reduce((min, p) => p.x < min ? p.x : min, pointList[0].x)
            const maxX = pointList.reduce((max, p) => p.x > max ? p.x : max, pointList[0].x)
            const minY = pointList.reduce((min, p) => p.y < min ? p.y : min, pointList[0].y)
            const maxY = pointList.reduce((max, p) => p.y > max ? p.y : max, pointList[0].y)

            return {
              width: Math.ceil((maxX - minX) * currentScale * this.scaleAdaption) + margin * 2,
              height: Math.ceil((maxY - minY) * currentScale * this.scaleAdaption) + margin * 2,
              x: parseInt((maxX + minX) / 2),
              y: parseInt((maxY + minY) / 2)
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

          ({ x: posX, y: posY } = getGroupSize(currentScale));
          scale = currentScale
        }
        
        const { x: placeX, y: placeY } = this.getImageToCanvasPoint({ x: posX, y: posY })
        const { x: centerX, y: centerY }  = this.getTouchPoint({ x: (this.rotate ? this.canvasHeight : this.canvasWidth) / 2, y: (this.rotate ? this.canvasWidth : this.canvasHeight) / 2 })
        this.mapAnimation = {
          x: posX,
          y: posY,
          deltaX: parseInt(centerX - placeX),
          deltaY: parseInt(centerY - placeY),
          deltaScale: parseInt((scale - this.scale.x) * 10000) / 10000,
          timer: 0,
          duration: 0.5
        }
      } else if (type === "include") {
        const { x: placeX, y: placeY } = this.getImageToCanvasPoint({ x: posX, y: posY })
        let deltaX = 0
        let deltaY = 0
        const markerSize = this.iconSize * 2
        
        let pointList
        if (this.rotate) {
          pointList = [
            {x: placeX - markerSize, y: placeY + markerSize / 2},
            {x: placeX - markerSize, y: placeY - markerSize / 2},
            {x: placeX, y: placeY - markerSize / 2},
            {x: placeX, y: placeY + markerSize / 2},
          ]
        } else {
          pointList = [
            {x: placeX - markerSize / 2, y: placeY - markerSize},
            {x: placeX + markerSize / 2, y: placeY - markerSize},
            {x: placeX + markerSize / 2, y: placeY},
            {x: placeX - markerSize / 2, y: placeY}
          ]
        } 
        if (areaCoords?.[0]?.length >= 3) pointList = pointList.concat(areaCoords[0].map(point => this.getImageToCanvasPoint(point)))

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
          x: null,
          y: null,
          deltaX: deltaX,
          deltaY: deltaY,
          deltaScale: 0,
          timer: 0,
          duration: 0.1
        }
      }
    },

    resizeWindow() {
      const clientWidth = this.clientWidth - 2
      const clientHeight = this.clientHeight - 2 - this.clientWidth * 0.2

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
          this.$store.commit("setImageRotation", false)
        } else { // imgWidth > imgHeight  
          if (clientWidth > clientHeight) { 
            // img: landscape  screen: landscape
            this.canvasWidth = clientWidth  
            this.canvasHeight = clientHeight
            this.$store.commit("setImageRotation", false)
          } else { // clientWidth <= clientHeight  
            //img: landscape  screen: portrait
            this.canvasWidth = clientHeight
            this.canvasHeight = clientWidth
            this.$store.commit("setImageRotation", true)
          }
          this.scaleAdaption = this.canvasWidth / this.imgWidth
          if (this.imgHeight * this.scaleAdaption > this.canvasHeight) this.scaleAdaption = this.canvasHeight / this.imgHeight
        }
        
        this.positionAdaption = {
          x: parseInt(this.canvasWidth - this.imgWidth * this.scaleAdaption) / 2,
          y: parseInt(this.canvasHeight - this.imgHeight * this.scaleAdaption) / 2
        }
  
        this.iconSize = Math.max(clientWidth, clientHeight) || 0
        this.iconSize = parseInt(this.iconSize * 0.05)
  
        this.virtualButton.size = parseInt(this.clientWidth * 0.09)
      }
    },

    setLocationUrl() {
      if (this.tmove) return
      if (!this.canvasWidth || !this.canvasHeight || !this.imgWidth || !this.imgHeight) return
      if (!this.scale.x || !this.scale.y || this.position.x == null || this.position.y == null) return

      const { x: centerX, y: centerY } = this.getCanvasToImagePoint(this.getTouchPoint({ x: (this.rotate ? this.canvasHeight : this.canvasWidth) / 2, y: (this.rotate ? this.canvasWidth : this.canvasHeight) / 2 }))
      const zoom = Math.floor(this.scale.x * 100) / 100
      const currentLocationInfo = `${Math.floor(centerX)},${Math.floor(centerY)},${zoom}z`

      const re = /^([+-]?\d+),([+-]?\d+),(\d+(\.\d*)?)z$/
      const matchArr = this.$route.params.locationInfo?.match(re)
      if (matchArr?.[0] === currentLocationInfo) return

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
      let followMap = false
      if (!this.$route.params.locationInfo) followMap = true
      else {
        const re = /^([+-]?\d+),([+-]?\d+),(\d+(\.\d*)?)z$/
        const matchArr = this.$route.params.locationInfo?.match(re)
        if (!matchArr) followMap = true
        else {
          const centerX = parseInt(matchArr[1])
          const centerY = parseInt(matchArr[2])
          const zoom = Math.floor(parseFloat(matchArr[3]) * 100) / 100

          this.validateScale(zoom)

          const { x: mapCenterX, y: mapCenterY } = this.getTouchPoint({ x: (this.rotate ? this.canvasHeight : this.canvasWidth) / 2, y: (this.rotate ? this.canvasWidth : this.canvasHeight) / 2 })

          const newOriginX = mapCenterX - centerX * this.scale.x * this.scaleAdaption - this.positionAdaption.x
          const newOriginY = mapCenterY - centerY * this.scale.y * this.scaleAdaption - this.positionAdaption.y
          this.validatePosition(newOriginX, newOriginY)
        }
      }

      if (followMap) {
        if (this.locationUrlTimeout) clearTimeout(this.locationUrlTimeout)
        this.locationUrlTimeout = setTimeout(() => this.setLocationUrl(), 300)
      }
    }
  },

  beforeCreate() {
    this.$store.commit("setImageRotation", false)
  },

  mounted() {
    this.$EventBus.$on("displayPath", () => this.adjustMapPosition("direction"))

    this.canvas = this.$refs.canvas
    this.context = this.canvas.getContext("2d")

    // this.checkRequestAnimationFrame()
    requestAnimationFrame(this.animate)

    // window.confetti.start(10000, 100, 200)
  },

  watch: {
    selectedPlace(val, oldVal) {
      // null => a cV lX rV
      // a => a    cX lX rX
      // a => b    cV lV rV
      // a => null cX lV rV
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
          if (this.$route.params.adjustPosition) this.adjustMapPosition("middle", this.selectedPlace.x, this.selectedPlace.y, this.selectedPlace.iconLevel)
          else this.adjustMapPosition("include", this.selectedPlace.x, this.selectedPlace.y, null, this.selectedPlace.areaCoords)
          this.touchstartActivated = false
        }

        let query = {}
        if (val.id) {
          query["id"] = `${val.id}`
        } else {
          query["location"] = `${val.x},${val.y}`
        }

        if (!(this.$route.name === "Place" && JSON.stringify(this.$route.query, Object.keys(this.$route.query).sort()) === JSON.stringify(query, Object.keys(query).sort()))) {
          this.$router.push({
            name: "Place",
            params: {
              buildingId: this.$route.params.buildingId,
              floorId: this.$route.params.floorId,
              locationInfo: this.$route.params.locationInfo
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
              buildingId: this.$route.params.buildingId,
              floorId: this.$route.params.floorId,
              locationInfo: this.$route.params.locationInfo
            }
          })
        }
      }
    },
    placeList: {
      immediate: true,
      handler: function (val) {
        if (!val?.length) return
        if (this.$route.name === "Place") {
          let place
          if (this.$route.query.id) {
            place = this.placeList.find(e => e.id === parseInt(this.$route.query.id))
          } else if (this.$route.query.location?.match(/^(\d+),(\d+)$/i)) {
            place = {
              ...this.markerObj,
              location: {
                x: parseInt(RegExp.$1),
                y: parseInt(RegExp.$2)
              }
            }
          }
          
          if (place) this.setSelectedPlace(place)
          else this.$router.push({name: "PageNotFound"})
        } else if (this.$route.name === "Direction") {
          if (!this.fromDirectionMarkerComplete.map) this.fromDirectionMarkerComplete.map = true
          if (!this.toDirectionMarkerComplete.map) this.toDirectionMarkerComplete.map = true
        }
      }
    },
    fromDirectionMarkerComplete: {
      immediate: true,
      deep: true,
      handler: function (val) {
        if (!(val.map && val.direction)) return
        if (!this.$isEmptyObject(this.globalFromObj) && this.$isEmptyObject(this.fromDirectionMarker)) {
          const { id, placeType, location } = this.globalFromObj
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
        }
      }
    },
    toDirectionMarkerComplete: {
      immediate: true,
      deep: true,
      handler: function (val) {
        if (!val.map || !val.direction) return
        if (!this.$isEmptyObject(this.globalToObj) && this.$isEmptyObject(this.toDirectionMarker)) {
          const { id, placeType, location } = this.globalToObj
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
        }
      }
    },
    pathListComplete: {
      immediate: true,
      deep: true,
      handler: function (val) {
        if (val.map && val.direction) this.adjustMapPosition("direction")
      }
    },
    displayVirtualButton(val) {
      if (!val) return
      const canvasWidth = this.rotate ? this.canvasHeight : this.canvasWidth
      const canvasHeight = this.rotate ? this.canvasWidth : this.canvasHeight
      this.virtualButton.position.x = parseInt(canvasWidth * 0.98 - this.virtualButton.size)
      this.virtualButton.position.y = parseInt((canvasHeight - this.virtualButton.size) / 2)
    },
    gateActivated (val) {
      if (val) {
        this.gateIntervalId = setInterval(() => {
          const targetTimezone = -8
          let currentTime = new Date()
          const east8time = currentTime.getTime() + currentTime.getTimezoneOffset() * 60 * 1000 - (targetTimezone * 60 * 60 * 1000)
          currentTime = new Date(east8time)
          console.log(currentTime)
          this.currentHour = currentTime.getHours() + currentTime.getMinutes() / 60
        }, 1000 * 60)
      } else {
        if (this.gateIntervalId) clearInterval(this.gateIntervalId)
      }
    },
    geolocation: {
      deep: true,
      handler: function (val, oldVal) {
        if (!(val.lon && val.lat)) return
        const firstcall = !oldVal.lon && !oldVal.lat
        // const { x, y } = this.getGeoToImagePoint({ longitude: val.lon, latitude: val.lat })
        const { x, y } =  { x: this.imgWidth / 2, y: this.imgHeight / 2}
        if ((x >= 0 && x <= this.imgWidth) && (y >= 0 && y <= this.imgHeight)) {
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
      }
    },
    globalFromObj: {
      immediate: true,
      deep: true,
      handler: function (val) {
        if (!this.$isEmptyObject(val)) {
          if (!this.fromDirectionMarkerComplete.direction) this.fromDirectionMarkerComplete.direction = true
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
      handler: function (val) {
        if (!this.$isEmptyObject(val)) {
          if (!this.toDirectionMarkerComplete.direction) this.toDirectionMarkerComplete.direction = true
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
    globalPathList(val) {
      if (!val.length) return
      if (this.scaleAdaption != null && this.positionAdaption.x != null && this.positionAdaption.y != null) {
        if (this.pathListComplete.direction) this.adjustMapPosition("direction")
      }
      if (!this.pathListComplete.direction) this.pathListComplete.direction = true
    },
    scale: {
      deep: true,
      handler: function (val) {
        if (!(val.x && val.y)) return
        if (this.locationUrlTimeout) clearTimeout(this.locationUrlTimeout)
        this.locationUrlTimeout = setTimeout(() => this.setLocationUrl(), 300)
      }
    },
    position: {
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
        if (to && from) {
          if (this.checkRouterChange(to.fullPath, from.fullPath)) {
            const fromBuildingId = from.params.buildingId || ""
            const fromFloorId = from.params.floorId || ""
            const toBuildingId = to.params.buildingId || ""
            const toFloorId = to.params.floorId || ""
            
            if (`b${fromBuildingId}f${fromFloorId}` === `b${toBuildingId}f${toFloorId}`) {
              if (to.name !== 'Place') this.setSelectedPlace()
              if (to.name === "Place") {
                let place
                if (to.query.id) {
                  place = this.placeList.find(e => e.id === parseInt(to.query.id))
                } else if (to.query.location?.match(/^(\d+),(\d+)$/i)) {
                  const px = parseInt(RegExp.$1)
                  const py = parseInt(RegExp.$2)
                  if ((px >= 0 && px <= this.imgWidth) && (py >= 0 && py <= this.imgHeight)) {
                    place = {
                      ...this.markerObj,
                      location: {
                        x: px,
                        y: py
                      }
                    }
                  }
                }
                if (place) {
                  if (this.occupationActivated) this.$store.commit("button/setOccupationActivated", false)
                  if (to.params.adjustPosition) this.touchstartActivated = true
                  this.setSelectedPlace(place)
                } else {
                  this.$router.push({name: "PageNotFound"})
                }
              } else if (to.name === "Direction") {
                this.lastMarkerAnimation = {
                  ...this.lastMarkerAnimation,
                  timer: this.markerAnimationDuration + 0.01
                }
              }
            } 
          }
        }
        this.setLocationUrl()
      }
    }
  }
}
</script>

<style style="scss">
#canvas {
  margin: 0 auto;
  border: 1px black solid;
  display: block;
}
</style>
