<template>
  <div class="page" style="overflow: hidden;">
    <canvas ref="indoormap" id="indoormap" class="indoormap" 
      @touchstart.stop="ontouchstart"
      @touchmove.stop="ontouchmove"
      @touchend.stop="ontouchend"
      @guesturestart.stop @guesturechange.stop @guestureend.stop>[Your browser is too old!]</canvas>
    <button-group
      v-show="!virtualButton.display"
      :button-list="buttonList"
      :current-floor="selectedFloor"
      :floor-list="floorList"
      :building-code="buildingCode"
      :occupation-time="occupationTime"
      :occupation-requesting="occupationRequesting"
      :gate-requesting="gateRequesting"
      :loading="loading"
      @hideButtonGroup="displayVirtualButton"></button-group>
    <search-panel :current-floor-id="selectedFloor.id" ref="searchPanel"></search-panel>
    <place-panel ref="placePanel"></place-panel>
    <datetime 
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
      :has-error="loadingError"
      class="canvas-map-loading-panel"
      @refresh="$router.go(0)">
    </loading-panel>
  </div>
</template>

<script>
import SearchPanel from 'components/SearchPanel'
import PlacePanel from 'components/PlacePanel'
import ButtonGroup from 'components/ButtonGroup'
import LoadingPanel from 'components/LoadingPanel'

import iconSpriteInfo from "assets/json/iconSpriteInfo.json"
import markerSpriteInfo from "assets/json/markerSpriteInfo.json"
import arrowSpriteInfo from "assets/json/arrowSpriteInfo.json"
import { easeOutBack, easeOutCirc, arrowAnimation, locationAnimation } from 'utils/utilFunctions.js'
import campusLocationList from "assets/json/campusLocation.json"
import weekInfo from 'assets/json/week.json'
import { DateTime, Interval } from 'luxon'

import { mapState } from 'vuex'

export default {
  components: {
    SearchPanel,
    PlacePanel,
    ButtonGroup,
    LoadingPanel
  },
  data() {
    return {
      mapType: null,
      rotate: false,
      canvas: null,
      context: null,
      desktop: true,
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
      focusPointer: {
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
      buildingCode: null,
      selectedFloor: {},
      selectedPlace: {},
      occupiedRoomList: [],
      placeList: [],
      floorList: [],
      gateList: null,
      currentHour: 0,
      lastMarkerAnimation: {
        x: 0,
        y: 0,
        markerType: "default",
        triggered: false,
        duration: 0
      },
      currentMarkerAnimation: {
        x: 0,
        y: 0,
        markerType: "default",
        triggered: false,
        duration: 0
      },
      zoomAnimation: {
        triggered: false,
        times: 0,
        totalZoom: 0,
      },
      location: {
        x: null,
        y: null,
        direction: null,
        timer: 0
      },
      geoWatchId: null,
      occupationTime: null,
      iconSize: null,
      markerSize: null,
      mapMarginColor: null,
      loading: true,
      loadingError: false,
      occupationRequesting: false,
      gateRequesting: false,
      virtualButton: {
        display: false,
        position: {
          x: 100,
          y: 100
        },
        size: 0,
        tstarted: false
      },
      arrowTimer: 0,
    }
  },
  computed: {
    ...mapState({
      clientHeight: 'clientHeight',
      clientWidth: 'clientWidth',
      placePanelCollapse: state => state.place.collapse,
      globalPathList: state => state.direction.globalPathList,
      gateActivated: state => state.button.gateActivated,
      occupationActivated: state => state.button.occupationActivated,
      locationActivated: state => state.button.locationActivated
    }),
    buttonList () {
      const buttonList = this.mapType === "floor" ? ["floor","home"] : ["location"]
      if (this.mapType === "floor") {
        if (this.selectedFloor.hasGate) buttonList.push("gate")
        if (this.selectedFloor.hasOccupation) buttonList.push("occupation")
      } 
      return buttonList
    },
    datetimeStyle () {
      return {
        width: '30vw',
        height: '9vw'
      }
    }
  },
  methods: {
    animate: function () {
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

      // if (!this.currentMarkerAnimation.triggered && !this.lastMarkerAnimation.triggered && this.zoomAnimation.triggered) {
      if (this.zoomAnimation.triggered) {
        const totalZoom = this.zoomAnimation.totalZoom
        const zoom = totalZoom / Math.abs(totalZoom) * 20
        this.zoomMap(zoom)
        this.zoomAnimation.times++
        if (this.zoomAnimation.times * Math.abs(zoom) >= Math.abs(totalZoom)) this.zoomAnimation.triggered = false
      }

      if (this.scale.x <= 1 && (this.position.x !== 0 || this.position.y !== 0)) this.position.x = this.position.y = 0
      const currentWidth = (this.imgWidth * this.scaleAdaption * this.scale.x );
      const currentHeight = (this.imgHeight * this.scaleAdaption * this.scale.y);
      if (this.position.x + currentWidth + this.positionAdaption.x < this.canvasWidth - this.positionAdaption.x) this.position.x = this.canvasWidth - 2 * this.positionAdaption.x - currentWidth
      if (this.position.y + currentHeight + this.positionAdaption.y < this.canvasHeight - this.positionAdaption.y) this.position.y = this.canvasHeight - 2 * this.positionAdaption.y - currentHeight;

      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      // indoor map drawing function
      this.drawMapInfo();
      requestAnimationFrame(this.animate)
    },

    drawMapInfo () {
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
        const augY = arrowAnimation(this.arrowTimer, -20, arrowDuration)
        const size = parseInt(this.iconSize * 1.5)
        this.gateList.forEach((e) => {
          this.drawImage(this.imageMap["arrowSprite"], e.location.x, e.location.y, size, size, size/2, 0, true, false, 
          (arrowSpriteInfo[e.arrow]["column"] - 1) * arrowSpriteInfo[e.arrow]["width"], (arrowSpriteInfo[e.arrow]["row"] - 1) * arrowSpriteInfo[e.arrow]["height"], arrowSpriteInfo[e.arrow]["width"], arrowSpriteInfo[e.arrow]["height"],
          e.direction, 0, (this.currentHour >= e.startTime && this.currentHour < e.endTime) ? augY : 0)
        })
        this.arrowTimer = (this.arrowTimer + 0.016 > arrowDuration) ? 0 : this.arrowTimer + 0.016
      }

      if (!this.occupationActivated) {
        if (JSON.stringify(this.selectedPlace) !== "{}")  this.drawPolygon(this.selectedPlace.areaPointList)

        if (this.globalPathList?.length) {
          ctx.lineWidth = 8
          this.globalPathList.forEach(path => {
            const pointList = path.pointList || []
            ctx.strokeStyle = (!path.type) ? "brown" : "#5298FF"
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.beginPath()
            pointList.forEach((point, j) => {
              const { x, y } = this.getTransformedPoint(point)
              if (j === 0) ctx.moveTo(x, y)
              else ctx.lineTo(x, y)
            })
            ctx.stroke()
          })
          ctx.lineWidth = 1

          // ctx.fillStyle = "white"
          // this.globalPathList.forEach((path, i) => {
          //   if (i > 0) {
          //     const pointList = path.pointList || []
          //     const point = pointList.length ? pointList[0] : null
          //     const { x, y } = this.getTransformedPoint(point)
          //     ctx.beginPath()
          //     ctx.arc(x, y, 2, 0, 2*Math.PI)
          //     ctx.fill()
          //   }
          // })
        }

        if (this.placeList.length) {
          this.placeList.forEach(item => {
            // selected item
            if (JSON.stringify(this.selectedPlace) !== "{}" && this.selectedPlace.id === item.id && this.selectedPlace.placeType === item.placeType) return
            // item not to display
            if (!item.iconLevel || (this.scale.x < item.iconLevel || this.scale.y < item.iconLevel)) return
            const size = this.iconSize
            this.drawImage(this.imageMap["facilitySprite"], item.location.x, item.location.y, size, size, size/2, size/2, true, true, 
              (iconSpriteInfo[item.iconType]["column"] - 1) * iconSpriteInfo[item.iconType]["width"], (iconSpriteInfo[item.iconType]["row"] - 1) * iconSpriteInfo[item.iconType]["height"], iconSpriteInfo[item.iconType]["width"], iconSpriteInfo[item.iconType]["height"])
          })
        }

        if (this.lastMarkerAnimation.triggered) {
          const t = this.lastMarkerAnimation.duration
          let size
          if (t < 0.5) {
            size = easeOutCirc(t, this.markerSize, -this.markerSize*0.95, 0.5)
            this.lastMarkerAnimation.duration += 0.016
          } else {
            size = 0
            this.lastMarkerAnimation.triggered = false
          }

          this.drawMarker(this.lastMarkerAnimation.x, this.lastMarkerAnimation.y, size, this.lastMarkerAnimation.markerType)
        }

        if (JSON.stringify(this.selectedPlace) !== "{}") {
          const t = this.currentMarkerAnimation.duration
          let size

          if (t < 0.5) {
            size = easeOutBack(t, this.markerSize/3, this.markerSize*2/3, 0.5)
            this.currentMarkerAnimation.duration += 0.016
          } else {
            size = this.markerSize
            this.currentMarkerAnimation.triggered = false
          }

          this.drawMarker(this.currentMarkerAnimation.x, this.currentMarkerAnimation.y, size, this.currentMarkerAnimation.markerType)
        }
      }

      if (this.occupationActivated && this.occupiedRoomList) {
        const size = this.iconSize;
        this.occupiedRoomList.forEach(room => {
          const centroid = room.location
          this.drawImage(this.imageMap['group'], centroid.x, centroid.y, size, size, size/2, size/2, false, true)
        })
      }

      if (this.locationActivated && this.location.x && this.location.y) {
        const size = parseInt(this.iconSize * 1.2)
        if (this.location.direction != null && typeof(this.location.direction) != undefined)
          this.drawImage(this.imageMap["locationProbe"], this.location.x, this.location.y, size, size, size/2, size/2, true, false, parseInt(this.location.direction))
        this.drawImage(this.imageMap["locationMarker"], this.location.x, this.location.y, size, size, size/2, size/2, true, false)
        const locationDuration = 2
        const aniSize = parseInt(size * 0.3 + locationAnimation(this.location.timer, size * 0.15, locationDuration))
        this.drawImage(this.imageMap["locationCircle"], this.location.x, this.location.y, aniSize, aniSize, aniSize/2, aniSize/2, true, false)
        this.location.timer = (this.location.timer + 0.016 > locationDuration) ? 0 : this.location.timer + 0.016
      }

      if (this.virtualButton.display) {
        ctx.restore()
        const size = this.virtualButton.size
        ctx.shadowBlur = 10
        ctx.shadowColor = "#555555"
        ctx.fillStyle = "#f8f9fa"
        ctx.fillRect(this.virtualButton.position.x, this.virtualButton.position.y, size, size)
        // ctx.strokeRect(100, 100, width, width)
        ctx.shadowBlur = 0
        ctx.drawImage(this.imageMap['eye'], this.virtualButton.position.x, this.virtualButton.position.y, size, size)
        ctx.save()
      }

      ctx.restore()
    },

    drawImage () {
      if (!(arguments.length === 9 
        || arguments.length === 10 
        || arguments.length === 12 
        || arguments.length === 13 
        || arguments.length === 14 
        || arguments.length === 16)) throw new Error("Invalid argument number.")

      const scaleX = this.scale.x * this.scaleAdaption
      const scaleY = this.scale.y * this.scaleAdaption
      const offsetX = this.position.x + this.positionAdaption.x
      const offsetY = this.position.y + this.positionAdaption.y

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
      if (degree != null && typeof(degree) != undefined) {
        ctx.save();
        ctx.translate(x * scaleX + offsetX, y * scaleY + offsetY);
        ctx.rotate(degree * Math.PI / 180);
        ctx.translate(-(x * scaleX + offsetX), -(y * scaleY + offsetY));
        ctx.translate(translateX, translateY);
      }
      if (!this.rotate || !selfRotate) {
        if (!fixSize) {
          if (arguments.length >= 13) ctx.drawImage(image, sx, sy, sWidth, sHeight, parseInt((x - imgOffsetX) * scaleX + offsetX), parseInt((y - imgOffsetY) * scaleY + offsetY), sizeX * scaleX, sizeY * scaleY)
          else ctx.drawImage(image, parseInt((x - imgOffsetX) * scaleX + offsetX), parseInt((y - imgOffsetY) * scaleY + offsetY), sizeX * scaleX, sizeY * scaleY)
        } else {
          if (arguments.length >= 13) ctx.drawImage(image, sx, sy, sWidth, sHeight, parseInt(x * scaleX + offsetX - imgOffsetX), parseInt(y * scaleY + offsetY - imgOffsetY), sizeX, sizeY)
          else ctx.drawImage(image, parseInt(x * scaleX + offsetX - imgOffsetX), parseInt(y * scaleY + offsetY - imgOffsetY), sizeX, sizeY)
        }
      } else {
        ctx.restore()
        if (!fixSize) {
          if (arguments.length >= 13) ctx.drawImage(image, sx, sy, sWidth, sHeight, parseInt(this.canvasHeight - ((y + imgOffsetX) * scaleY + offsetY)), parseInt((x - imgOffsetY) * scaleX + offsetX), sizeX * scaleY, sizeY * scaleX)
          else ctx.drawImage(image, parseInt(this.canvasHeight - ((y + imgOffsetX) * scaleY + offsetY)), parseInt((x - imgOffsetY) * scaleX + offsetX), sizeX * scaleY, sizeY * scaleX)
        }
        else {
          if (arguments.length >= 13) ctx.drawImage(image, sx, sy, sWidth, sHeight, parseInt(this.canvasHeight - (y * scaleY + offsetY + imgOffsetX)), parseInt(x * scaleX + offsetX - imgOffsetY), sizeX, sizeY)
          else ctx.drawImage(image, parseInt(this.canvasHeight - (y * scaleY + offsetY + imgOffsetX)), parseInt(x * scaleX + offsetX - imgOffsetY), sizeX, sizeY)
        }
        ctx.save()
        ctx.translate(this.canvasHeight, 0)
        ctx.rotate(Math.PI / 2)
      }
      if (degree != null && typeof(degree) != undefined) ctx.restore();
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
          const { x, y } = this.getTransformedPoint(e)
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

    getTransformedPoint ({ x, y }) {
      return {
        x: x * this.scale.x * this.scaleAdaption + this.position.x + this.positionAdaption.x, 
        y: y * this.scale.y * this.scaleAdaption + this.position.y + this.positionAdaption.y
      }
    },

    getTouchPoint ({ x, y }, followRotation = true) {
      return {
        x: (!this.rotate || !followRotation) ? x - this.canvas.getBoundingClientRect().left : y - this.canvas.getBoundingClientRect().top,
        y: (!this.rotate || !followRotation) ? y - this.canvas.getBoundingClientRect().top : this.canvas.getBoundingClientRect().right - x
      } 
    },

    gesturePinchZoom (event) {
      let zoom = false;
      if (event.touches.length >= 2) {
        const p1 = this.getTouchPoint({ x: event.touches[0].clientX, y: event.touches[0].clientY })
        const p2 = this.getTouchPoint({ x: event.touches[1].clientX, y: event.touches[1].clientY })

        this.focusPointer.x = (p1.x + p2.x) / 2;
        this.focusPointer.y = (p1.y + p2.y) / 2;
        const zoomScale = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)); // euclidian
        if (this.lastZoomScale) {
          zoom = zoomScale - this.lastZoomScale;
        }
        this.lastZoomScale = zoomScale;
      }
      return zoom;
    },

    zoomMap: function (zoom) {
      // console.log(zoom)
      if (!zoom) return

      if (Math.abs(zoom) >= 200) {
        this.zoomAnimation.triggered = true
        this.zoomAnimation.totalZoom = zoom
        this.zoomAnimation.times = 0
        return
      }

      // new scale
      let newScale = this.scale.x + zoom / 400;

      if (newScale > 1) {
        if (newScale > 4) {
          newScale = 4
          this.zoomAnimation.triggered = false
        } else {
          newScale = this.scale.x + zoom / 400
        }
      } else {
        newScale = 1
        this.zoomAnimation.triggered = false
      }
      let newPosX = this.focusPointer.x - this.positionAdaption.x - (this.focusPointer.x - this.positionAdaption.x - this.position.x) * newScale / this.scale.x;
      let newPosY = this.focusPointer.y - this.positionAdaption.y - (this.focusPointer.y - this.positionAdaption.y - this.position.y) * newScale / this.scale.y;
      // edge cases
      const newWidth = this.canvasWidth * newScale;
      const newHeight = this.canvasHeight * newScale;
      if (newWidth < this.canvasWidth) return
      if (newPosX > 0) newPosX = 0
      if (newPosX + newWidth < this.canvasWidth) newPosX = this.canvasWidth - newWidth

      if (newHeight < this.canvasHeight) return
      if (newPosY > 0) newPosY = 0
      if (newPosY + newHeight < this.canvasHeight) newPosY = this.canvasHeight - newHeight

      // final affectations
      this.scale.x = newScale;
      this.scale.y = newScale;
      this.position.x = newPosX;
      this.position.y = newPosY;
    },

    moveMap (relativeX, relativeY) { 
      if (this.lastX && this.lastY) {
        const deltaX = relativeX - this.lastX
        const deltaY = relativeY - this.lastY

        const currentWidth = (this.imgWidth * this.scaleAdaption * this.scale.x)
        const currentHeight = (this.imgHeight * this.scaleAdaption * this.scale.y)

        this.position.x += deltaX;
        this.position.y += deltaY;

        // edge cases
        if (this.position.x > 0) this.position.x = 0;
        else if (this.position.x + currentWidth + this.positionAdaption.x < this.canvasWidth - this.positionAdaption.x)
          this.position.x = this.canvasWidth - 2 * this.positionAdaption.x - currentWidth

        if (this.position.y > 0) this.position.y = 0;
        else if (this.position.y + currentHeight + this.positionAdaption.y < this.canvasHeight - this.positionAdaption.y)
					this.position.y = this.canvasHeight - 2 * this.positionAdaption.y - currentHeight
      }
      this.lastX = relativeX;
      this.lastY = relativeY;
    },
    
    loadImage: function (url) {
      return new Promise(function(resolve, reject) {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = (e) => reject(e)
        image.crossOrigin = ''
        image.src = url
      })
    },

    ontouchstart (e) {
      // console.log(e)
      this.lastX = null
      this.lastY = null
      this.lastZoomScale = null
      this.tmove = false
      
      if (this.virtualButton.display) {
        this.virtualButton.tstarted = false
        const { x: px, y: py } = this.getTouchPoint({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY }, false)
        this.context.beginPath();
        this.context.rect(this.virtualButton.position.x, this.virtualButton.position.y, this.virtualButton.size, this.virtualButton.size)
        if (this.context.isPointInPath(px, py)) {
          this.virtualButton.tstarted = true
          return
        }
      }
    },

    ontouchmove (e) {
      this.tmove = true
      // e.preventDefault()
      // console.log(e)
      if (e.touches.length == 2) { // pinch
        if (this.virtualButton.display && this.virtualButton.tstarted) this.virtualButton.tstarted = false
        this.zoomMap(this.gesturePinchZoom(e))
      } else if (e.touches.length == 1) {// move
        if (this.virtualButton.display && this.virtualButton.tstarted) {
          const { x: px, y: py } = this.getTouchPoint({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }, false)
          const canvasWidth = this.rotate ? this.canvasHeight : this.canvasWidth
          const canvasHeight = this.rotate ? this.canvasWidth : this.canvasHeight
          const offset = parseInt(this.virtualButton.size / 2)
          this.virtualButton.position.x = (px + offset > canvasWidth) ? canvasWidth - offset * 2 : px - offset
          this.virtualButton.position.y = (py + offset > canvasHeight) ? canvasHeight - offset * 2 : py - offset
          if (this.virtualButton.position.x < 0) this.virtualButton.position.x = 0
          if (this.virtualButton.position.y < 0) this.virtualButton.position.y = 0
          return
        }
        const { x, y } = this.getTouchPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY})   
        this.moveMap(x, y)
      }
    },

    ontouchend (e) {
      // console.log(e)
      if (!this.tmove) { // simple tap event
        if (this.virtualButton.display && this.virtualButton.tstarted) {
          // button group hidden mode 

          // let { x: px, y: py } = this.getTouchPoint({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }, false)
          // if (this.virtualButton.display) {
          //   console.log(this.virtualButton.tstarted, this.tmove)
          //   if (!this.tmove && this.virtualButton.tstarted) {
          //     this.virtualButton.tstarted = false
          //     ctx.beginPath()
          //     ctx.rect(this.virtualButton.position.x, this.virtualButton.position.y, this.virtualButton.size, this.virtualButton.size)
          //     if (ctx.isPointInPath(px, py)) {
          //       console.log("here")
          //       this.virtualButton.display = false
          //       return
          //     }
          //   }
          // } 
          setTimeout(() => {
            this.virtualButton.display = false
            this.virtualButton.tstarted = false
          }, 100)
          return
        }

        if (!this.currentMarkerAnimation.triggered && !this.lastMarkerAnimation.triggered) {
          const currentTime = Date.now()
          if (this.lastTapTime && currentTime - this.lastTapTime < 500) { // double tap
            if (!this.lastDoubleTap) { // second tap
              ({ x: this.focusPointer.x, y: this.focusPointer.y } = this.getTouchPoint({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }))
              this.zoomMap(200)
              
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
      }
    },
  
    chooseItem (e) {
      if (!this.lastDoubleTap && !this.currentMarkerAnimation.triggered && !this.lastMarkerAnimation.triggered) {
        // occupation mode
        if (this.occupationActivated) {
          this.$toast({
            message: 'To do other operations, please quit room occupation mode first.',
            time: 3000
          })
          return
        }

        const ctx = this.context

        // tap on marker
        if (JSON.stringify(this.selectedPlace) !== "{}") {
          const scaleX = this.scale.x * this.scaleAdaption 
          const scaleY = this.scale.y * this.scaleAdaption
          const offsetX = this.position.x + this.positionAdaption.x
          const offsetY = this.position.y + this.positionAdaption.y
          const size = this.markerSize
          const selfRotate = false
          const { x: px, y: py } = this.getTouchPoint({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }, false)

          ctx.beginPath()
          // if (!this.rotate || selfRotate) ctx.rect(parseInt(this.currentMarkerAnimation.x * scaleX + offsetX - size/2), parseInt(this.currentMarkerAnimation.y * scaleY + offsetY - size), size, size)
          // else ctx.rect(parseInt(this.canvasHeight - (this.currentMarkerAnimation.y * scaleY + offsetY + size/2)), parseInt(this.currentMarkerAnimation.x * scaleX + offsetX - size), size, size)
          if (!this.rotate || selfRotate) ctx.rect(parseInt(this.currentMarkerAnimation.x * scaleX + offsetX - size/2 * 0.8), parseInt(this.currentMarkerAnimation.y * scaleY + offsetY - size), size * 0.8, size)
          else ctx.rect(parseInt(this.canvasHeight - (this.currentMarkerAnimation.y * scaleY + offsetY + size/2 * 0.8)), parseInt(this.currentMarkerAnimation.x * scaleX + offsetX - size), size * 0.8, size)

          if (ctx.isPointInPath(px, py)) {
            this.adjustMapPosition({ posX: this.selectedPlace.x, posY: this.selectedPlace.y }, 'include')
            return
          }
        }
        
        // tap on item
        const { x: px, y: py } = this.getTouchPoint({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY })

        let sameItem = false
        const found = this.placeList.some(element => {
          if (!element.areaPointList) {
            // icon not display in current zoom
            if (!element.iconLevel || (this.scale.x < element.iconLevel || this.scale.y < element.iconLevel)) return
            const { x, y } = this.getTransformedPoint(element.location)
            const size = this.iconSize
            ctx.beginPath()
            ctx.rect(parseInt(x - size / 2), parseInt(y - size / 2), size, size)
          } else {
            ctx.beginPath()
            const pointList = element.areaPointList || []
            pointList.forEach((e, index) => {
              const { x, y } = this.getTransformedPoint(e)
              if (index == 0) ctx.moveTo(x, y)
              else ctx.lineTo(x, y)
            })
          }
          if(ctx.isPointInPath(px, py)) {
            // console.log('selected')
            sameItem = this.setSelectedPlace(element)
            this.adjustMapPosition({ posX: this.selectedPlace.x, posY: this.selectedPlace.y }, 'include')
            return true
          }
        })

        if (!found && !sameItem && JSON.stringify(this.selectedPlace) !== "{}") {
          // click on nothing
          if (!this.placePanelCollapse) this.$store.commit('place/setCollapse', true)
        }
        // console.log(found)
      }
    },

    setSelectedPlace (element = {}) {
      // null => a cV lX rV
      // a => a    cX lX rX
      // a => b    cV lV rV
      // a => null cX lV rV
      let sameItem = true
      if (this.selectedPlace.placeType !== element.placeType || this.selectedPlace.id !== element.id) {
        // click on another item or no item clicked before or click on nothing
        sameItem = false
        this.selectedPlace = JSON.stringify(element) !== "{}" ? {
          id: element.id,
          placeType: element.placeType,
          areaPointList: element.areaPointList,
          name: element.name,
          iconType: element.iconType,
          ...element.location
        } : element
      } 
      return sameItem
    },

    adjustMapPosition ({ posX, posY }, type, scale) {
      if ((posX != null && typeof(posX) != undefined) && (posY != null && typeof(posY) != undefined)) {
        if (type === 'middle' && scale) {
          this.scale.x = scale
          this.scale.y = scale
        }

        const scaleX = this.scale.x * this.scaleAdaption
        const scaleY = this.scale.y * this.scaleAdaption
        const offsetX = this.position.x + this.positionAdaption.x
        const offsetY = this.position.y + this.positionAdaption.y

        const currentWidth = this.imgWidth * this.scaleAdaption * this.scale.x
        const currentHeight = this.imgHeight * this.scaleAdaption * this.scale.y

        let newPosX = this.position.x
        let newPosY = this.position.y

        if (type === 'middle') {
          newPosX = this.position.x + parseInt(this.canvasWidth / 2 - (posX * scaleX + offsetX))
          newPosY = this.position.y + parseInt(this.canvasHeight / 2 - (posY * scaleY + offsetY))
        } else if (type === 'include') {
          const imgSize = this.markerSize

          const left = parseInt(posX * scaleX + offsetX - imgSize / 2)
          const right = parseInt(posX * scaleX + offsetX + imgSize / 2)
          const top = parseInt(posY * scaleY + offsetY - imgSize)
          const bottom = parseInt(posY * scaleY + offsetY)
          
          if (left < 0) newPosX = this.position.x - left // - (left - 0)
          if (right - this.canvasWidth > 0) newPosX = this.position.x - (right - this.canvasWidth)

          if (top < 0) newPosY = this.position.y - top // - (top - 0)
          if (bottom - this.canvasHeight > 0) newPosY = this.position.y - (bottom - this.canvasHeight)

        }

        // edge cases
        if (newPosX > 0) newPosX = 0
        else if (newPosX + currentWidth + this.positionAdaption.x < this.canvasWidth - this.positionAdaption.x)
          newPosX = this.canvasWidth - 2 * this.positionAdaption.x - currentWidth
          
        if (newPosY > 0) newPosY = 0
        else if (newPosY + currentHeight + this.positionAdaption.y < this.canvasHeight - this.positionAdaption.y) 
          newPosY = this.canvasHeight - 2 * this.positionAdaption.y - currentHeight

        this.position.x = newPosX
        this.position.y = newPosY
      }
    },

    async datetimeInput (dateStr) {
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
                const data = await this.$api.room.getOccupiedRoom(this.selectedFloor.id, {
                  week: weekObj["number"],
                  day: date.weekday,
                  hour: date.minute >= 30 ? date.hour + 0.5 : date.hour
                })
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
              } catch (err) {
                console.log(err)
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

    datetimeClose () {
      if (!this.$refs.dt.datetime) this.$store.commit("button/setOccupationActivated", false)
    },

    displayVirtualButton () {
      this.virtualButton.display = true
      const canvasWidth = this.rotate ? this.canvasHeight : this.canvasWidth
      const canvasHeight = this.rotate ? this.canvasWidth : this.canvasHeight
      this.virtualButton.position.x = canvasWidth * 0.98 - this.virtualButton.size
      this.virtualButton.position.y = (canvasHeight - this.virtualButton.size) / 2 
    },

    calculateMapLocation ({ longitude, latitude }) {
      const p1 = campusLocationList[0]
      const p2 = campusLocationList[1]
      const ratio = {
        x: (p2["geo"]["latitude"] - p1["geo"]["latitude"]) / (p2["image"]["x"] - p1["image"]["x"]),
        y: (p2["geo"]["longitude"] - p1["geo"]["longitude"]) / (p2["image"]["y"] - p1["image"]["y"])
      }
      const origin = {
        latitude: p1["geo"]["latitude"] - p1["image"]["x"] * ratio.x,
        longitude: p1["geo"]["longitude"] - p1["image"]["y"] * ratio.y
      }
      return {
        x: Math.floor((latitude - origin.latitude) / ratio.x),
        y: Math.floor((longitude - origin.longitude) / ratio.y)
      }
    },

    geolocationInfo (position) {
      const { longitude, latitude } = position?.coords
      console.log(position)

      this.$toast({
        message: `altitude: ${position.coords.altitude}
                  heading: ${position.coords.heading}
                  latitude: ${position.coords.latitude}
                  longitude: ${position.coords.longitude}
                  alpha: ${this.location.direction}`,
        time: 3000
      })

      if (longitude && latitude) {
        const firstcall = !this.location.x && !this.location.y
        const { x, y } = this.calculateMapLocation({ longitude, latitude })
        if ((x >= 0 && x <= this.imgWidth) && (y >= 0 && y <= this.imgHeight)) {
          this.location.x = x
          this.location.y = y
          if (firstcall) this.adjustMapPosition({ posX: this.location.x, posY: this.location.y }, "middle", 1)
        } else {
          this.$toast({
            message: "You are not in campus right now.",
            time: 3000,
            type: "warning"
          })
        }
      } else throw new Error("Error getting location.")
    },

    geolocationError (error) {
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
    
    deviceOrientationHandler (e) {
      if (e) {
        // this.$toast({
        //   message: `alpha: ${e.webkitCompassHeading || e.alpha}`,
        //   time: 3000
        // })
        this.location.direction = e.webkitCompassHeading || e.alpha
      }
    }
  },
  async mounted () {
    try {
      this.mapType = this.$route.params.buildingId ? 'floor' : 'campus'

      let data
      if (this.mapType === 'floor') {
        const buildingId = parseInt(this.$route.params.buildingId)
        const floorId = parseInt(this.$route.params.floorId)
        data = await this.$api.floor.getFloorInfo(buildingId, floorId)
        console.log(data)
        this.selectedFloor = data.selectedFloor || {}
        this.floorList = data.floorList || []
        this.buildingCode = data.building?.code
        
        this.imageMap['map'] = await this.loadImage(process.env.VUE_APP_BASE_API + this.selectedFloor.imgUrl)
        this.imageMap['group'] = await this.loadImage(require('assets/images/icon/group.png'))
        this.imageMap['arrowSprite'] = await this.loadImage(require('assets/images/sprite/arrow-sprite.png'))
      } else {
        data = await this.$api.floor.getCampusInfo()
        console.log(data)

        this.imageMap['map'] = await this.loadImage(require('assets/images/map/campus/map.png'))
        this.imageMap['locationMarker'] = await this.loadImage(require('assets/images/icon/location-marker.png'))
        this.imageMap['locationProbe'] = await this.loadImage(require('assets/images/icon/location-probe.png'))
        this.imageMap['locationCircle'] = await this.loadImage(require('assets/images/icon/location-circle.png'))
      }
      this.imageMap['markers'] = await this.loadImage(require('assets/images/sprite/marker-sprite.png'))
      this.imageMap["eye"] = await this.loadImage(require('assets/images/icon/eye.png'))
      this.imageMap["facilitySprite"] = await this.loadImage(require('assets/images/sprite/icon-sprite.png'))

      this.placeList = this.placeList.concat(data.facilityList || [], data.roomList || [], data.buildingList || [])

      // const directionData = await this.$api.direction.getPath("Foundation Building", "Design Building")
      // this.$store.commit("direction/setGlobalPathList", directionData.pathList || [])
      
      this.canvas = this.$refs.indoormap
      this.context = this.canvas.getContext('2d');

      this.imgWidth = parseInt(this.imageMap['map'].width)
      this.imgHeight = parseInt(this.imageMap['map'].height)
      console.log(this.imgWidth, this.imgHeight)

      this.context.drawImage(this.imageMap['map'], 0, 0, this.imgWidth, this.imgHeight)
      const pixel = this.context.getImageData(2, 2, 1, 1).data
      this.mapMarginColor = (!pixel?.length) ? null : `rgb(${pixel.join(',')})`

      const clientWidth = this.clientWidth - 2
      const clientHeight = this.clientHeight - 2 - this.clientWidth * 0.2
      this.canvas.width = clientWidth
      this.canvas.height = clientHeight

      if (this.imgWidth <= this.imgHeight) {
        this.canvasWidth = clientWidth
        this.canvasHeight = clientHeight
        this.scaleAdaption = this.canvasHeight / this.imgHeight
        if (this.imgWidth * this.scaleAdaption > this.canvasWidth) this.scaleAdaption = this.canvasWidth / this.imgWidth
      } else { // imgWidth > imgHeight  
        if (clientWidth > clientHeight) { 
          // img: landscape  screen: landscape
          this.canvasWidth = clientWidth  
          this.canvasHeight = clientHeight
        } else { // clientWidth <= clientHeight  
          //img: landscape  screen: portrait
          this.canvasWidth = clientHeight
          this.canvasHeight = clientWidth
          this.rotate = true;
        }
        this.scaleAdaption = this.canvasWidth / this.imgWidth
        if (this.imgHeight * this.scaleAdaption > this.canvasHeight) this.scaleAdaption = this.canvasHeight / this.imgHeight
      }
      
      this.positionAdaption = {
        x: (parseInt(this.canvasWidth) - parseInt(this.imgWidth * this.scaleAdaption)) / 2,
        y: (parseInt(this.canvasHeight) - parseInt(this.imgHeight * this.scaleAdaption)) / 2
      }

      this.iconSize = Math.max(clientWidth, clientHeight) || 0
      this.iconSize = parseInt(this.iconSize * 0.05)
      this.markerSize = parseInt(this.iconSize * 2)

      this.virtualButton.size = parseInt(this.clientWidth * 0.09)
      
      // this.checkRequestAnimationFrame()
      requestAnimationFrame(this.animate)

      if (!this.loadingError) this.loading = false
      this.$nextTick(() => {
        if (this.$route.name === 'Place') {
          const item = this.placeList.find(e => e.id === parseInt(this.$route.params.id) && e.placeType === this.$route.params.type)
          if (item) {
            this.setSelectedPlace(item)
            this.adjustMapPosition({ posX: this.selectedPlace.x, posY: this.selectedPlace.y }, 'middle', 3)
          } else {
            this.$router.push({name: 'PageNotFound'})
          }
        }
      })
    } catch (error) {
      console.log(error)
      // this.$toast({
      //   message: 'Failed to get data.\nPlease try again.',
      //   time: 3000
      // })
      this.loadingError = true
    }
  },

  watch: {
    selectedPlace (val, oldVal) {
      // null => a cV lX rV
      // a => a    cX lX rX
      // a => b    cV lV rV
      // a => null cX lV rV
      if (oldVal && oldVal.x && oldVal.y && this.$route.name !== "Direction") {
        this.lastMarkerAnimation = {
          triggered: true,
          duration: 0,
          x: oldVal.x,
          y: oldVal.y,
          markerType: oldVal.iconType || "default"
        }
      } 
      if (val) {
        if (JSON.stringify(val) !== "{}") {
          this.currentMarkerAnimation = {
            triggered: true,
            duration: 0,
            x: val.x,
            y: val.y,
            markerType: val.iconType || "default"
          }
          if (!(this.$route.name === "Place" && this.$route.params.type == val.placeType && this.$route.params.id == val.id)) {
            this.$router.push({
              name: 'Place',
              params: {
                buildingId: this.$route.params.buildingId,
                floorId: this.$route.params.floorId,
                type: val.placeType,
                id: val.id
              }
            })
          }
            
        }
        this.$store.commit("place/setHeaderName", val.name || "")
      }
    },
    placePanelCollapse (val) {
      if (val && JSON.stringify(this.selectedPlace) !== "{}") this.setSelectedPlace()
    },
    occupationActivated (val) {
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
    async gateActivated (val) {
      if (val) {
        if (!this.gateList) {
          try {
            this.$toast({
              message: 'Requesting...',
              time: 10000
            })
            this.gateRequesting = true
            const data = await this.$api.gate.getGateList(this.selectedFloor.id)
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
          } catch (err) {
            console.log(err)
            this.gateRequesting = false
            this.$toast({
              message: 'Failed to get gates.\nPlease try again.',
              time: 3000
            })
            this.gateList = null
            this.$store.commit("button/setGateActivated", false)
          }
        }

        const targetTimezone = -8
        let currentTime = new Date()
        const east8time = currentTime.getTime() + currentTime.getTimezoneOffset() * 60 * 1000 - (targetTimezone * 60 * 60 * 1000)
        currentTime = new Date(east8time)
        console.log(currentTime)
        this.currentHour = currentTime.getHours() + currentTime.getMinutes() / 60
      } else {
        if (this.gateRequesting) {
          this.$toast.close()
          this.gateRequesting = false
        }
      }
    },

    locationActivated (val) {
      try {
        if (val) {
          if (navigator.geolocation) {
            this.location.timer = 0

            this.geolocationInfo({
              coords: {
                longitude: 31.2712021, 
                latitude: 120.7430878
              }
            })

            const options = {
              enableHighAccuracy: true,
              timeout: 2000,
              maximumAge: 2000
            }
            // navigator.geolocation.getCurrentPosition(displayLocationInfo, handleLocationError, options);
            // this.geoWatchId = navigator.geolocation.watchPosition(this.geolocationInfo, this.geolocationError, options)
            if (window.DeviceOrientationEvent) {
              window.addEventListener('deviceorientation',this.deviceOrientationHandler,false);
            } else { 
              console.warn("DeviceOrientation is not supported in this device.");
            }
          } else {
            console.warn("Geolocation is not supported in this browser.");
            throw new Error("Geolocation is not supported in this browser.")
          }
        } else {
          navigator.geolocation.clearWatch(this.geoWatchId)
          this.geoWatchId = null
          window.removeEventListener('deviceorientation',this.deviceOrientationHandler,false);
          // this.$toast.close()
          
          this.location.x = null
          this.location.y = null
          this.location.direction = null
        }
      } catch (error) {
        console.log(error)
        this.$toast({
          // message: "Location Failure.",
          message: error.message,
          time: 3000
        })
        this.$store.commit("button/setLocationActivated", false)
      }
    },

  },

  beforeRouteUpdate (to, from, next) {
    const fromBuildingId = from.params.buildingId || ''
    const fromFloorId = from.params.floorId || ''
    const toBuildingId = to.params.buildingId || ''
    const toFloorId = to.params.floorId || ''
    
    if (`b${fromBuildingId}f${fromFloorId}` === `b${toBuildingId}f${toFloorId}`) {
      if (to.name === 'Place') {
        this.$refs.searchPanel.touchShade()
        const item = this.placeList.find(e => e.id === parseInt(to.params.id) && e.placeType === to.params.type)
        if (item) {
          if (this.occupationActivated) this.$store.commit("button/setOccupationActivated", false)
          this.setSelectedPlace(item)
          this.adjustMapPosition({ posX: this.selectedPlace.x, posY: this.selectedPlace.y }, 'include')
        } else {
          next({name: 'PageNotFound'})
          return
        }
      }
    } else {
      this.loading = false
      this.loadingError = false
    }
    next()
  },
}
</script>

<style style="scss">
.page {
  width: 100vw;
  height: 100%;
}

.indoormap {
  margin: 0 auto;
  border: 1px black solid;
  display: block;
}

.canvas-map-loading-panel {
  width: 100vw; 
  height: 100vh;
  position: fixed; 
  top: 0; 
  left: 0;
  background-color: #FFFFFF; 
  z-index: 5;
}

</style>
