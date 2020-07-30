<template>
  <canvas ref="canvas" id="canvas" 
    @touchstart="ontouchstart"
    @touchmove="ontouchmove"
    @touchend="ontouchend"
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
    mapUrl: String,
    mapLevel: Number,
    occupiedRoomList: {
      type: Array,
      default: () => []
    },
    gateList: {
      type: Array,
      default: () => []
    },
    geolocation: {
      type: Object,
      default: () => {}
    }
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
      imageMap: {},
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
        y: null,
        direction: null,
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
      placeList: state => state.placeList,
      displayVirtualButton: state => state.button.displayVirtualButton,
      gateActivated: state => state.button.gateActivated,
      occupationActivated: state => state.button.occupationActivated,
      locationActivated: state => state.button.locationActivated,
      globalFromId: state => state.direction.globalFromId,
      globalToId: state => state.direction.globalToId,
      globalPathList: state => state.direction.globalPathList,
    })
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

      this.drawImage(this.imageMap['map'], 0, 0, this.imgWidth, this.imgHeight, 0, 0, false, false)

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
          this.drawImage(this.imageMap["arrowSprite"], e.location.x, e.location.y, size, size, size/2, 0, true, false, 
          (arrowSpriteInfo[e.arrow]["column"] - 1) * arrowSpriteInfo[e.arrow]["width"], (arrowSpriteInfo[e.arrow]["row"] - 1) * arrowSpriteInfo[e.arrow]["height"], arrowSpriteInfo[e.arrow]["width"], arrowSpriteInfo[e.arrow]["height"],
          e.direction, 0, (this.currentHour >= e.startTime && this.currentHour < e.endTime) ? augY : 0)
        })
        this.arrowAnimation.timer = (this.arrowAnimation.timer + 0.016 > arrowDuration) ? 0 : this.arrowAnimation.timer + 0.016
      }

      if (!this.occupationActivated) {
        if (this.$route.name !== "Direction") {
          if (JSON.stringify(this.selectedPlace) !== "{}")  this.drawPolygon(this.selectedPlace.areaPointList)
        } else {
          if (JSON.stringify(this.fromDirectionMarker) !== "{}") this.drawPolygon(this.fromDirectionMarker.areaPointList)
          if (JSON.stringify(this.toDirectionMarker) !== "{}") this.drawPolygon(this.toDirectionMarker.areaPointList)
        }

        if (this.globalPathList?.length) {
          ctx.lineWidth = 16
          this.globalPathList.forEach(path => {
            const pointList = path.pointList || []
            ctx.strokeStyle = "#5298FF"
            if (path.startLevel !== this.mapLevel || path.endLevel !== this.mapLevel) {
              if (path.startLevel > this.mapLevel || path.endLevel > this.mapLevel) {
                ctx.strokeStyle = "green"
              } else if (path.startLevel < this.mapLevel || path.endLevel < this.mapLevel) {
                ctx.strokeStyle = "brown"
              }
            } 
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.beginPath()
            pointList.forEach((point, j) => {
              const { x, y } = this.getImageToCanvasPoint(point)
              if (j === 0) ctx.moveTo(x, y)
              else ctx.lineTo(x, y)
            })
            ctx.stroke()
          })
          ctx.lineWidth = 1
        }

        if (this.placeList.length) {
          this.placeList.forEach(place => {
            // selected place
            if (JSON.stringify(this.selectedPlace) !== "{}" && this.selectedPlace.id === place.id && this.selectedPlace.placeType === place.placeType) return
            // place not to display
            if (!place.iconLevel || (this.scale.x < place.iconLevel || this.scale.y < place.iconLevel)) return
            const size = this.iconSize
            this.drawImage(this.imageMap["facilitySprite"], place.location.x, place.location.y, size, size, size/2, size/2, true, true, 
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

          if (JSON.stringify(this.selectedPlace) !== "{}") {
            const t = this.currentMarkerAnimation.timer
            const size = t < this.markerAnimationDuration ? easeOutBack(t, this.iconSize*2/3, this.iconSize*2*2/3, this.markerAnimationDuration) : this.iconSize*2
            this.drawMarker(this.currentMarkerAnimation.x, this.currentMarkerAnimation.y, size, this.currentMarkerAnimation.markerType)
            if (t <= this.markerAnimationDuration) this.currentMarkerAnimation.timer += 0.016
          } 
        } else {
          if (JSON.stringify(this.fromDirectionMarker) !== "{}") this.drawMarker(this.fromDirectionMarker.x, this.fromDirectionMarker.y, this.iconSize * 2, "fromDir")
          if (JSON.stringify(this.toDirectionMarker) !== "{}") this.drawMarker(this.toDirectionMarker.x, this.toDirectionMarker.y, this.iconSize * 2, "toDir")
        }
      }

      if (this.occupationActivated && this.occupiedRoomList) {
        const size = this.iconSize;
        this.occupiedRoomList.forEach(room => {
          const centroid = room.location
          this.drawImage(this.imageMap['group'], centroid.x, centroid.y, size, size, size/2, size/2, false, true)
        })
      }

      if (this.locationActivated && this.location.x != null && this.location.y != null) {
        const size = parseInt(this.iconSize * 1.2)
        if (this.location.direction != null)
          this.drawImage(this.imageMap["locationProbe"], this.location.x, this.location.y, size, size, size/2, size/2, true, false, parseInt(this.location.direction))
        this.drawImage(this.imageMap["locationMarker"], this.location.x, this.location.y, size, size, size/2, size/2, true, false)
        const aniSize = parseInt(size * 0.3 + locationAnimation(this.location.timer, size * 0.15, this.locationAnimation.duration))
        this.drawImage(this.imageMap["locationCircle"], this.location.x, this.location.y, aniSize, aniSize, aniSize/2, aniSize/2, true, false)
        this.location.timer = (this.location.timer + 0.016 > this.locationAnimation.duration) ? 0 : this.location.timer + 0.016
      }

      if (this.displayVirtualButton) {
        ctx.restore()
        const size = this.virtualButton.size
        ctx.shadowBlur = 10
        ctx.shadowColor = "#555555"
        ctx.fillStyle = "#f8f9fa"
        ctx.fillRect(this.virtualButton.position.x, this.virtualButton.position.y, size, size)
        ctx.shadowBlur = 0
        ctx.drawImage(this.imageMap['eye'], this.virtualButton.position.x, this.virtualButton.position.y, size, size)
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
      if (!this.rotate || !selfRotate) {
        if (!fixSize) {
          const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint({ x: x - imgOffsetX, y: y - imgOffsetY })
          if (arguments.length >= 13) ctx.drawImage(image, sx, sy, sWidth, sHeight, parseInt(canvasX), parseInt(canvasY), sizeX * scaleX, sizeY * scaleY)
          else ctx.drawImage(image, parseInt(canvasX), parseInt(canvasY), sizeX * scaleX, sizeY * scaleY)
        } else {
          const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint({ x, y })
          if (arguments.length >= 13) ctx.drawImage(image, sx, sy, sWidth, sHeight, parseInt(canvasX - imgOffsetX), parseInt(canvasY - imgOffsetY), sizeX, sizeY)
          else ctx.drawImage(image, parseInt(canvasX - imgOffsetX), parseInt(canvasY - imgOffsetY), sizeX, sizeY)
        }
      } else {
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
      }
      if (degree != null) ctx.restore()
    },

    drawPolygon (pointList) {
      if (pointList) {
        const ctx = this.context
        ctx.globalAlpha = 0.2
        ctx.fillStyle = 'red'
        ctx.strokeStyle = 'rgb(255, 0, 0)'
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        pointList.forEach((e, index) => {
          const { x, y } = this.getImageToCanvasPoint(e)
          if (index == 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.closePath()
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.stroke()
        ctx.lineWidth = 1
      }
    },

    drawMarker (x, y, size, iconType = "default") {
      const ctx = this.context
      ctx.shadowBlur = 10
      ctx.shadowColor = "#ffffff"
      this.drawImage(this.imageMap['markers'], x, y, size, size, size/2, size, true, true,
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
    
    loadImage(url) {
      return new Promise(function(resolve, reject) {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = (e) => reject(e)
        image.crossOrigin = ''
        image.src = url
      })
    },

    isPointinItem(pointX, pointY) {
      const ctx = this.context
      let { x: px, y: py } = this.getTouchPoint({ x: pointX, y: pointY }, false)

      // tap on virtual button
      if (this.displayVirtualButton) {
        this.context.beginPath();
        this.context.rect(this.virtualButton.position.x, this.virtualButton.position.y, this.virtualButton.size, this.virtualButton.size)
        if (this.context.isPointInPath(px, py)) return 4
      }

      // tap on markers
      const size = this.iconSize * 2
      const selfRotate = false
      if (JSON.stringify(this.selectedPlace) !== "{}") {
        if (this.selectedPlace.areaPointList) {
          ctx.beginPath()
          this.selectedPlace.areaPointList.forEach((e, index) => {
            const { x, y } = this.getImageToCanvasPoint(e)
            if (index == 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          })
          if (ctx.isPointInPath(px, py)) return 1
        }

        const { x: canvasX, y: canvasY } = this.getImageToCanvasPoint({ x: this.currentMarkerAnimation.x, y: this.currentMarkerAnimation.y })
        ctx.beginPath()
        if (!this.rotate || selfRotate) ctx.rect(parseInt(canvasX - size/2), parseInt(canvasY - size), size, size)
        else ctx.rect(parseInt(this.canvasHeight - (canvasY + size/2)), parseInt(canvasX - size), size, size)
        if (ctx.isPointInPath(px, py)) return 1
      }

      // tap on places
      ({ x: px, y: py } = this.getTouchPoint({ x: pointX, y: pointY }))
      return this.placeList.find(place => {
        if (!place.areaPointList) {
          if (!place.iconLevel || (this.scale.x < place.iconLevel || this.scale.y < place.iconLevel)) return
          const { x, y } = this.getImageToCanvasPoint(place.location)
          ctx.beginPath()
          ctx.rect(parseInt(x - this.iconSize / 2), parseInt(y - this.iconSize / 2), this.iconSize, this.iconSize)
        } else {
          ctx.beginPath()
          const pointList = place.areaPointList || []
          pointList.forEach((e, index) => {
            const { x, y } = this.getImageToCanvasPoint(e)
            if (index == 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          })
        }
        if (ctx.isPointInPath(px, py)) return true
      })
    },

    ontouchstart (e) {
      // console.log("touchstart")
      this.lastX = null
      this.lastY = null
      this.lastZoomScale = null
      this.tmove = false
      
      if (this.displayVirtualButton) {
        this.virtualButton.tselected = false
        const element = this.isPointinItem(e.targetTouches[0].clientX, e.targetTouches[0].clientY)
        if (element && typeof element === "number" && element === 4) this.virtualButton.tselected = true
      }
    },

    ontouchmove (e) {
      // e.preventDefault()
      // console.log("touchmove")
      this.tmove = true
      if (this.canvas && e.target == this.canvas) {
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
      }
    },

    ontouchend (e) {
      // console.log("touchend")
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
  
    chooseItem (e) {
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
          if (typeof element === "number" && element === 1) {
            this.adjustMapPosition("include", this.selectedPlace.x, this.selectedPlace.y, null, this.selectedPlace.areaPointList)
          } else if (typeof element === "object") {
            if (this.$route.name !== "Direction") {
              this.touchstartActivated = true
              this.setSelectedPlace(element)
            } else {
              if (JSON.stringify(this.fromDirectionMarker) !== "{}" && JSON.stringify(this.toDirectionMarker) !== "{}") {
                // Exit Direction
                console.log("third point")
                this.touchstartActivated = true
                this.$store.commit("direction/setCachedPlaceParams", null)
                this.setSelectedPlace(element)
              }
            }
          }
          return
        }

        // click on nothing
        if (JSON.stringify(this.selectedPlace) !== "{}") {
          this.setSelectedPlace()
        }
      }
    },

    setSelectedPlace(place = {}) {
      // null => a cV lX rV
      // a => a    cX lX rX
      // a => b    cV lV rV
      // a => null cX lV rV
      if (this.selectedPlace.placeType !== place.placeType || this.selectedPlace.id !== place.id) {
        // click on another place or no place clicked before or click on nothing
        this.selectedPlace = JSON.stringify(place) !== "{}" ? {
          id: place.id,
          placeType: place.placeType,
          areaPointList: place.areaPointList,
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

    adjustMapPosition(type, posX = 0, posY = 0, scale = 1, areaPointList) {
      if (type === "middle" || type === "direction") {
        if (type === "direction") {
          const pathPointList = []
          this.globalPathList.forEach((path, i) => {
            const pointList = path.pointList || []
            pointList.forEach((point, j) => {
              if (i === 0 && j === 0) pathPointList.push(point)
              if (j > 0) pathPointList.push(point)
            })
          })

          let areaPointList = []
          if (this.fromDirectionMarker.areaPointList?.length >= 3) areaPointList = areaPointList.concat(this.fromDirectionMarker.areaPointList)
          if (this.toDirectionMarker.areaPointList?.length >= 3) areaPointList = areaPointList.concat(this.toDirectionMarker.areaPointList)

          const markerList = []
          if (this.fromDirectionMarker.x != null && this.fromDirectionMarker.y != null) markerList.push({ x: this.fromDirectionMarker.x, y: this.fromDirectionMarker.y})
          if (this.toDirectionMarker.x != null && this.toDirectionMarker.y != null) markerList.push({ x: this.toDirectionMarker.x, y: this.toDirectionMarker.y})

          const getGroupSize = (currentScale = this.scale.x) => {
            let pointList = []
            const markerSize = this.iconSize * 2 / (currentScale * this.scaleAdaption)
            const margin = 30 / (currentScale * this.scaleAdaption)

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
              width: Math.ceil(maxX - minX + margin * 2) * currentScale * this.scaleAdaption,
              height: Math.ceil(maxY - minY + margin * 2) * currentScale * this.scaleAdaption,
              x: parseInt((maxX + minX) / 2),
              y: parseInt((maxY + minY) / 2)
            }
          }

          let currentScale = this.scale.x
          let { width: groupWidth, height: groupHeight } = getGroupSize(currentScale)
          if (this.canvasWidth < groupWidth || this.canvasHeight < groupHeight) {
            currentScale = Math.floor(this.scale.x * 2) / 2;
            ({ width: groupWidth, height: groupHeight } = getGroupSize(currentScale));
            while ((this.canvasWidth < groupWidth || this.canvasHeight < groupHeight) && currentScale > 1) {
              currentScale = (currentScale - 0.5 < 1) ? 1 : (currentScale - 0.5);
              ({ width: groupWidth, height: groupHeight } = getGroupSize(currentScale));
            }
          } else if (this.canvasWidth > groupWidth && this.canvasHeight > groupHeight) {
            currentScale = Math.ceil(this.scale.x * 2) / 2;
            ({ width: groupWidth, height: groupHeight } = getGroupSize((currentScale + 0.5 > 4) ? 4 : (currentScale + 0.5)));
            while ((this.canvasWidth > groupWidth && this.canvasHeight > groupHeight) && currentScale < 4) {
              currentScale = (currentScale + 0.5 > 4) ? 4 : (currentScale + 0.5);
              ({ width: groupWidth, height: groupHeight } = getGroupSize((currentScale + 0.5 > 4) ? 4 : (currentScale + 0.5)));
            }
          }

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
        if (areaPointList?.length >= 3) pointList = pointList.concat(areaPointList.map(point => this.getImageToCanvasPoint(point)))

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
      if (matchArr?.[1] && matchArr?.[2] && matchArr?.[3]) {
        const routerX = parseInt(matchArr[1])
        const routerY = parseInt(matchArr[2])
        const routerZoom = Math.floor(parseFloat(matchArr[3]) * 100) / 100
        const standardRouterLocationInfo = `${routerX},${routerY},${routerZoom}z`
        // If router location info is the same as current location info, no need to change
        if (currentLocationInfo === standardRouterLocationInfo) return
      }

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

  mounted () {
    this.canvas = this.$refs.canvas
    this.context = this.canvas.getContext("2d")

    this.loadImage(require("assets/images/sprite/marker-sprite.png")).then(image => this.imageMap["markers"] = image)
    this.loadImage(require("assets/images/icon/eye.png")).then(image => this.imageMap["eye"] = image)
    this.loadImage(require("assets/images/sprite/icon-sprite.png")).then(image => this.imageMap["facilitySprite"] = image)
    if (this.$route.params.buildingId) {   
      this.loadImage(require("assets/images/icon/group.png")).then(image => this.imageMap["group"] = image)
      this.loadImage(require("assets/images/sprite/arrow-sprite.png")).then(image => this.imageMap["arrowSprite"] = image)
    } else {
      this.loadImage(require("assets/images/icon/location-marker.png")).then(image => this.imageMap["locationMarker"] = image)
      this.loadImage(require("assets/images/icon/location-probe.png")).then(image => this.imageMap["locationProbe"] = image)
      this.loadImage(require("assets/images/icon/location-circle.png")).then(image => this.imageMap["locationCircle"] = image)
    }
    
    // this.checkRequestAnimationFrame()
    requestAnimationFrame(this.animate)

    // window.confetti.start(10000, 100, 200)
  },

  beforeDestroy() {
    this.$store.commit("setImageMap", {})
  },

  watch: {
    imageMap: {
      immediate: true,
      deep: true,
      handler: function(val) {
        this.$store.commit("setImageMap", val)
      }
    },
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
      if (val) {
        if (JSON.stringify(val) !== "{}") {
          this.currentMarkerAnimation = {
            timer: 0,
            x: val.x,
            y: val.y,
            markerType: val.iconType || "default"
          }
          if (this.touchstartActivated) {
            if (this.$route.params.adjustPosition) this.adjustMapPosition("middle", this.selectedPlace.x, this.selectedPlace.y, this.selectedPlace.iconLevel)
            else this.adjustMapPosition("include", this.selectedPlace.x, this.selectedPlace.y, null, this.selectedPlace.areaPointList)
            this.touchstartActivated = false
          }
          if (!(this.$route.name === "Place" && this.$route.params.type == val.placeType && this.$route.params.id == val.id)) {
            this.$router.push({
              name: 'Place',
              params: {
                buildingId: this.$route.params.buildingId,
                floorId: this.$route.params.floorId,
                type: val.placeType,
                id: val.id,
                locationInfo: this.$route.params.locationInfo
              }
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
      }
    },
    mapUrl(val) {
      if (val) {
        this.loadImage(val).then(image => {
          this.imageMap["map"] = image
          
          this.imgWidth = parseInt(this.imageMap["map"].width)
          this.imgHeight = parseInt(this.imageMap["map"].height)
          console.log(this.imgWidth, this.imgHeight)
  
          this.context.drawImage(this.imageMap["map"], 0, 0, this.imgWidth, this.imgHeight)
          const pixel = this.context.getImageData(2, 2, 1, 1).data
          this.mapMarginColor = (!pixel?.length) ? null : `rgb(${pixel.join(",")})`
        
          this.resizeWindow()
          this.setInitialMapLocation()
          this.$emit("mapLoadingComplete")

          this.setLocationUrl()

          if (!this.pathListComplete.map) this.pathListComplete.map = true
        }).catch(e => {
          console.log(e)
          this.$emit("mapLoadingError")
        })
      }
    },
    placeList: {
      immediate: true,
      handler: function(val) {
        if (val?.length) {
          if (this.$route.name === "Place") {
            const place = this.placeList.find(e => e.id === parseInt(this.$route.params.id) && e.placeType === this.$route.params.type)
            if (place) this.setSelectedPlace(place)
            else this.$router.push({name: "PageNotFound"})
          } else if (this.$route.name === "Direction") {
            if (!this.fromDirectionMarkerComplete.map) this.fromDirectionMarkerComplete.map = true
            if (!this.toDirectionMarkerComplete.map) this.toDirectionMarkerComplete.map = true
          }
        }
      }
    },
    fromDirectionMarkerComplete: {
      immediate: true,
      deep: true,
      handler: function(val) {
        if (val.map && val.direction) {
          if (this.globalFromId && JSON.stringify(this.fromDirectionMarker) === "{}") {
            const [id, placeType] = this.globalFromId.split("|")
            const place = this.placeList.find(e => e.id === parseInt(id) && e.placeType === placeType)
            if (place && JSON.stringify(place) !== "{}") {
              this.fromDirectionMarker = {
                x: place.location?.x,
                y: place.location?.y,
                areaPointList: place.areaPointList,
                type: place.placeType,
                id: place.id,
                name: place.name
              }
            }
          }
        }
      }
    },
    toDirectionMarkerComplete: {
      immediate: true,
      deep: true,
      handler: function(val) {
        if (val.map && val.direction) {
          if (this.globalToId && JSON.stringify(this.toDirectionMarker) === "{}") {
            const [id, placeType] = this.globalToId.split("|")
            const place = this.placeList.find(e => e.id === parseInt(id) && e.placeType === placeType)
            if (place && JSON.stringify(place) !== "{}")
              this.toDirectionMarker = {
                x: place.location?.x,
                y: place.location?.y,
                areaPointList: place.areaPointList,
                type: place.placeType,
                id: place.id,
                name: place.name
              }
          }
        }
      }
    },
    pathListComplete: {
      immediate: true,
      deep: true,
      handler: function(val) {
        if (val.map && val.direction) this.adjustMapPosition("direction")
      }
    },
    displayVirtualButton(val) {
      if (val) {
        const canvasWidth = this.rotate ? this.canvasHeight : this.canvasWidth
        const canvasHeight = this.rotate ? this.canvasWidth : this.canvasHeight
        this.virtualButton.position.x = parseInt(canvasWidth * 0.98 - this.virtualButton.size)
        this.virtualButton.position.y = parseInt((canvasHeight - this.virtualButton.size) / 2)
      }
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
      handler: function(val, oldVal) {
        this.location.direction = val.direction
        if (val.lon && val.lat) {
          const firstcall = !oldVal.lon && !oldVal.lat
          const { x, y } = this.getGeoToImagePoint({ longitude: val.lon, latitude: val.lat })
          if ((x >= 0 && x <= this.imgWidth) && (y >= 0 && y <= this.imgHeight)) {
            this.location = {
              ...this.location,
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
      }
    },
    globalFromId: {
      immediate: true,
      handler: function(val) {
        if (val) {
          if (!this.fromDirectionMarkerComplete.direction) this.fromDirectionMarkerComplete.direction = true
          const [id, placeType] = val.split("|")
          const place = this.placeList.find(e => e.id === parseInt(id) && e.placeType === placeType)
          if (place && JSON.stringify(place) !== "{}")
            this.fromDirectionMarker = {
              x: place.location?.x,
              y: place.location?.y,
              areaPointList: place.areaPointList,
              id: place.id,
              type: place.placeType,
              name: place.name
            }
        } else 
          this.fromDirectionMarker = {}
      }
    },
    globalToId: {
      immediate: true,
      handler: function(val) {
        if (val) {
          if (!this.toDirectionMarkerComplete.direction) this.toDirectionMarkerComplete.direction = true
          const [id, placeType] = val.split("|")
          const place = this.placeList.find(e => e.id === parseInt(id) && e.placeType === placeType)
          if (place && JSON.stringify(place) !== "{}")
            this.toDirectionMarker = {
              x: place.location?.x,
              y: place.location?.y,
              areaPointList: place.areaPointList,
              id: place.id,
              type: place.placeType,
              name: place.name
            }
        } else 
          this.toDirectionMarker = {}
      }
    },
    globalPathList(val, oldVal) {
      if (val.length) {
        if (this.scaleAdaption != null && this.positionAdaption.x != null && this.positionAdaption.y != null) {
          if (this.pathListComplete.direction) this.adjustMapPosition("direction")
        }
        if (!this.pathListComplete.direction) this.pathListComplete.direction = true
      }
    },
    scale: {
      deep: true,
      handler: function(val) {
        if (val.x && val.y) {
          if (this.locationUrlTimeout) clearTimeout(this.locationUrlTimeout)
          this.locationUrlTimeout = setTimeout(() => this.setLocationUrl(), 300)
        }
      }
    },
    position: {
      deep: true,
      handler: function(val) {
        if (val.x != null && val.y != null) {
          if (this.locationUrlTimeout) clearTimeout(this.locationUrlTimeout)
          this.locationUrlTimeout = setTimeout(() => this.setLocationUrl(), 300)
        }
      }
    },
    $route: {
      immediate: true,
      handler: function(to, from) {
        if (to && from) {
          if (this.checkRouterChange(to.fullPath, from.fullPath)) {
            const fromBuildingId = from.params.buildingId || ""
            const fromFloorId = from.params.floorId || ""
            const toBuildingId = to.params.buildingId || ""
            const toFloorId = to.params.floorId || ""
            
            if (`b${fromBuildingId}f${fromFloorId}` === `b${toBuildingId}f${toFloorId}`) {
              if (to.name !== 'Place') this.setSelectedPlace()
              if (to.name === "Place") {
                const place = this.placeList.find(e => e.id === parseInt(to.params.id) && e.placeType === to.params.type)
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
