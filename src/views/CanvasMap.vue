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
      @hideButtonGroup="displayVirtualButton"
      ref="occupiedButton"></button-group>
    <search-panel :current-floor-id="selectedFloor.id" ref="searchPanel"></search-panel>
    <place-panel :selected-item="selectedItem" ref="placePanel"></place-panel>
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
    <div v-if="loading" class="loading-panel" :style="{ height: `${clientHeight}px` }">
      <loading style="background: #FFFFFF;"></loading>
      <error-panel v-if="errorRefresh" style="width: 94vw; background: #FFFFFF;"
        @refresh="$router.go(0)"></error-panel>
    </div>
  </div>
</template>

<script>
import SearchPanel from 'components/SearchPanel'
import PlacePanel from 'components/PlacePanel'
import ButtonGroup from 'components/ButtonGroup'
import Loading from 'components/Loading'
import ErrorPanel from 'components/ErrorPanel'

import iconPath from 'utils/facilityIconPath.js'
import { easeOutBack, easeOutCirc, arrowAnimation } from 'utils/utilFunctions.js'
import weekInfo from 'utils/week.json'
import { DateTime, Interval } from 'luxon'

import { mapState } from 'vuex'

export default {
  components: {
    SearchPanel,
    PlacePanel,
    ButtonGroup,
    Loading,
    ErrorPanel
  },
  data() {
    return {
      displayPage: false,
      baseUrl: process.env.VUE_APP_BASE_API + 'static',
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
      selectedItem: {},
      occupiedRoomList: [],
      itemList: [],
      floorList: [],
      gateList: null,
      currentHour: 0,
      lastMarkerAnimation: {
        x: 0,
        y: 0,
        triggered: false,
        duration: 0
      },
      currentMarkerAnimation: {
        x: 0,
        y: 0,
        triggered: false,
        duration: 0
      },
      zoomAnimation: {
        triggered: false,
        times: 0,
        totalZoom: 0,
      },
      occupationTime: null,
      iconSize: null,
      mapMarginColor: null,
      loading: true,
      errorRefresh: false,
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
      gateActivated: state => state.button.gateActivated,
      occupationActivated: state => state.button.occupationActivated
    }),
    buttonList () {
      const buttonList = this.mapType === "floor" ? ["floor","home","occupy"] : ["location"]
      if (this.mapType === "floor" && this.selectedFloor.hasGate) buttonList.push("gate")
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
        const size = 60
        this.gateList.forEach((e) => {
          this.drawRotateImage(this.imageMap[e.arrow], e.location.x, e.location.y, size, size, size/2, 0, true, false, e.direction, 0, (this.currentHour >= e.startTime && this.currentHour < e.endTime) ? augY : 0)
          // this.drawImage(this.imageMap["iconBackground"], e.location.x, e.location.y, 10, 10, 5, 5, false, false)
        })
        this.arrowTimer = (this.arrowTimer + 0.016 > arrowDuration) ? 0 : this.arrowTimer + 0.016
      }

      if (!this.occupationActivated) {
        if (JSON.stringify(this.selectedItem) !== "{}") {
          if (this.selectedItem.areaCoords && this.selectedItem.areaCoords !== '') {
            const areaCoordsArr = this.selectedItem.areaCoords.split(',')
            ctx.globalAlpha = 0.2
            ctx.fillStyle = 'red'
            ctx.strokeStyle = 'rgb(255, 0, 0)'
            ctx.lineWidth = 3
            ctx.beginPath()
            for (let i = 0; i < areaCoordsArr.length; i += 2) {
              const { x, y } = this.getTransformedPoint({ x: areaCoordsArr[i], y: areaCoordsArr[i+1] })
              if (i == 0) ctx.moveTo(x, y)
              else ctx.lineTo(x, y)
            }
            ctx.closePath()
            ctx.fill()
            ctx.globalAlpha = 1
            ctx.stroke()
            ctx.lineWidth = 1
          }
        }

        if (this.itemList.length) {
          const size = parseInt(this.iconSize * 0.6)
          this.itemList.forEach(item => {
            // selected item
            if (JSON.stringify(this.selectedItem) !== "{}" && this.selectedItem.id === item.id && this.selectedItem.type === item.itemType) return
            // item not to display
            if (!item.iconLevel || (this.scale.x < item.iconLevel || this.scale.y < item.iconLevel)) return
            this.drawImage(this.imageMap["iconBackground"], item.location.x, item.location.y, this.iconSize, this.iconSize, this.iconSize/2, this.iconSize/2, true, false)
            this.drawImage(this.imageMap[item.iconType], item.location.x, item.location.y, size, size, size/2, size/2, true, false)
          })
        }

        if (this.lastMarkerAnimation.triggered) {
          const t = this.lastMarkerAnimation.duration
          let size
          if (t < 0.5) {
            size = easeOutCirc(t, this.iconSize*3, -this.iconSize*3, 0.5)
            this.lastMarkerAnimation.duration += 0.016
          } else {
            size = 0
            this.lastMarkerAnimation.triggered = false
          }

          this.drawImage(this.imageMap['marker'], this.lastMarkerAnimation.x, this.lastMarkerAnimation.y, size, size, size/2, size, true, true)
        }

        if (JSON.stringify(this.selectedItem) !== "{}") {
          const t = this.currentMarkerAnimation.duration
          let size

          if (t < 0.5) {
            size = easeOutBack(t, this.iconSize*3/3, this.iconSize*3*2/3, 0.5)
            this.currentMarkerAnimation.duration += 0.016
          } else {
            size = this.iconSize*3
            this.currentMarkerAnimation.triggered = false
          }

          this.drawImage(this.imageMap['marker'], this.currentMarkerAnimation.x, this.currentMarkerAnimation.y, size, size, size/2, size, true, true)
        }
      }

      if (this.occupationActivated && this.occupiedRoomList) {
        const size = 60;
        this.occupiedRoomList.forEach(room => {
          const centroid = room.location
          this.drawImage(this.imageMap['group'], centroid.x, centroid.y, size, size, size/2, size/2, false, true)
        })
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

    drawImage (image, x, y, sizeX, sizeY, imgOffsetX, imgOffsetY, fixSize, selfRotate) {
      const scaleX = this.scale.x * this.scaleAdaption 
      const scaleY = this.scale.y * this.scaleAdaption
      const offsetX = this.position.x + this.positionAdaption.x
      const offsetY = this.position.y + this.positionAdaption.y

      if (!this.rotate || !selfRotate) {
        if (!fixSize) this.context.drawImage(image, parseInt((x - imgOffsetX) * scaleX + offsetX), parseInt((y - imgOffsetY) * scaleY + offsetY), sizeX * scaleX, sizeY * scaleY)
        else this.context.drawImage(image, parseInt(x * scaleX + offsetX - imgOffsetX), parseInt(y * scaleY + offsetY - imgOffsetY), sizeX, sizeY)
      } else {
        this.context.restore()
        if (!fixSize) this.context.drawImage(image, parseInt(this.canvasHeight - ((y + imgOffsetX) * scaleY + offsetY)), parseInt((x - imgOffsetY) * scaleX + offsetX), sizeX * scaleY, sizeY * scaleX)
        else this.context.drawImage(image, parseInt(this.canvasHeight - (y * scaleY + offsetY + imgOffsetX)), parseInt(x * scaleX + offsetX - imgOffsetY), sizeX, sizeY)
        this.context.save()
        this.context.translate(this.canvasHeight, 0)
        this.context.rotate(Math.PI / 2)
      }
    },

    drawRotateImage (image, x, y, sizeX, sizeY, imgOffsetX, imgOffsetY, fixSize, selfRotate, degree, translateX, translateY) {
      const scaleX = this.scale.x * this.scaleAdaption 
      const scaleY = this.scale.y * this.scaleAdaption
      const offsetX = this.position.x + this.positionAdaption.x
      const offsetY = this.position.y + this.positionAdaption.y

      const ctx = this.context
      ctx.save();
      ctx.translate(x * scaleX + offsetX, y * scaleY + offsetY);
      ctx.rotate(degree * Math.PI / 180);
      ctx.translate(-(x * scaleX + offsetX), -(y * scaleY + offsetY));
      ctx.translate(translateX, translateY);
      this.drawImage(image, x, y, sizeX, sizeY, imgOffsetX, imgOffsetY, fixSize, selfRotate)
      ctx.restore();
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
        if (JSON.stringify(this.selectedItem) !== "{}") {
          const scaleX = this.scale.x * this.scaleAdaption 
          const scaleY = this.scale.y * this.scaleAdaption
          const offsetX = this.position.x + this.positionAdaption.x
          const offsetY = this.position.y + this.positionAdaption.y
          const size = this.iconSize * 3
          const selfRotate = false
          const { x: px, y: py } = this.getTouchPoint({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }, false)

          ctx.beginPath()
          if (!this.rotate || selfRotate) ctx.rect(parseInt(this.currentMarkerAnimation.x * scaleX + offsetX - size/2), parseInt(this.currentMarkerAnimation.y * scaleY + offsetY - size), size, size)
          else ctx.rect(parseInt(this.canvasHeight - (this.currentMarkerAnimation.y * scaleY + offsetY + size/2)), parseInt(this.currentMarkerAnimation.x * scaleX + offsetX - size), size, size)

          if (ctx.isPointInPath(px, py)) {
            this.adjustMapPosition('include')
            return
          }
        }
        
        // tap on item
        const { x: px, y: py } = this.getTouchPoint({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY })

        let sameItem = false
        const found = this.itemList.some(element => {
          if (!element.areaCoords) {
            // icon not display in current zoom
            if (!element.iconLevel || (this.scale.x < element.iconLevel || this.scale.y < element.iconLevel)) return
            const { x, y } = this.getTransformedPoint(element.location)
            ctx.beginPath()
            ctx.rect(parseInt(x), parseInt(y), this.iconSize/2, this.iconSize/2)
          } else {
            ctx.beginPath()
            const areaCoordsArr = element.areaCoords.split(',')
            for (let i = 0; i < areaCoordsArr.length; i += 2) {
              const { x, y } = this.getTransformedPoint({ x: areaCoordsArr[i], y: areaCoordsArr[i+1] })
              if (i == 0) ctx.moveTo(x, y)
              else ctx.lineTo(x, y)
            }
          }
          if(ctx.isPointInPath(px, py)) {
            // console.log('selected')
            sameItem = this.setSelectedItem(element)
            this.adjustMapPosition('include')
            return true
          }
        })

        if (!found && !sameItem && JSON.stringify(this.selectedItem) !== "{}") {
          // click on nothing
          if (!this.placePanelCollapse) this.$store.commit('place/setCollapse', true)
        }
        // console.log(found)
      }
    },

    setSelectedItem (element) {
      let sameItem = true
      if (this.selectedItem.type !== element.itemType || this.selectedItem.id !== element.id) {
        // click on another item or no item clicked before
        sameItem = false
        if (!!this.selectedItem.x) {
          this.lastMarkerAnimation = { 
            triggered: true,
            duration: 0,
            x: this.selectedItem.x,
            y: this.selectedItem.y
          }
        }
        this.selectedItem = {
          type: element.itemType,
          id: element.id,
          name: element.name,
          areaCoords: element.areaCoords,
          ...element.location
        }
      } 
      return sameItem
    },

    async datetimeInput (dateStr) {
      // console.log('datetime', dateStr)
      if (!!dateStr && dateStr != '') {
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
                  // this.selectedItem = {}
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

    adjustMapPosition (type) {
      if (JSON.stringify(this.selectedItem) !== '{}' && !!this.selectedItem.x) {
        if (type === 'middle') {
          this.scale.x = 3
          this.scale.y = 3
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
          newPosX = this.position.x + parseInt(this.canvasWidth / 2 - (this.selectedItem.x * scaleX + offsetX))
          newPosY = this.position.y + parseInt(this.canvasHeight / 2 - (this.selectedItem.y * scaleY + offsetY))
        } else if (type === 'include') {
          const imgSize = 60 * 2.5

          const left = parseInt(this.selectedItem.x * scaleX + offsetX - imgSize / 2)
          const right = parseInt(this.selectedItem.x * scaleX + offsetX + imgSize / 2)
          const top = parseInt(this.selectedItem.y * scaleY + offsetY - imgSize)
          const bottom = parseInt(this.selectedItem.y * scaleY + offsetY)
          
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

    displayVirtualButton () {
      this.virtualButton.display = true
      const canvasWidth = this.rotate ? this.canvasHeight : this.canvasWidth
      const canvasHeight = this.rotate ? this.canvasWidth : this.canvasHeight
      this.virtualButton.position.x = canvasWidth * 0.98 - this.virtualButton.size
      this.virtualButton.position.y = (canvasHeight - this.virtualButton.size) / 2 
    }
  },
  async mounted () {
    try {
      this.mapType = !!this.$route.params.buildingId ? 'floor' : 'campus'

      let data
      if (this.mapType === 'floor') {
        const buildingId = parseInt(this.$route.params.buildingId)
        const floorId = parseInt(this.$route.params.floorId)
        data = await this.$api.floor.getFloorInfo(buildingId, floorId)
        console.log(data)
        this.selectedFloor = data.selectedFloor || {}
        this.floorList = data.floorList || []
        this.buildingCode = data.building && data.building.code
        
        console.log("start to load image")
        this.imageMap['map'] = await this.loadImage(this.baseUrl + this.selectedFloor.imgUrl)
        this.imageMap['group'] = await this.loadImage(require('assets/images/icon/group.png'))
        this.imageMap['arrowRed'] = await this.loadImage(require('assets/images/icon/arrow-red.png'))
        this.imageMap['arrowYellow'] = await this.loadImage(require('assets/images/icon/arrow-yellow.png'))
        this.imageMap['arrowGreen'] = await this.loadImage(require('assets/images/icon/arrow-green.png'))
        this.imageMap['arrowBlack'] = await this.loadImage(require('assets/images/icon/arrow-black.png'))
      } else {
        data = await this.$api.floor.getCampusInfo()
        console.log(data)

        this.imageMap['map'] = await this.loadImage(require('assets/images/map/campus/campus-map.png'))
      }
      this.imageMap['marker'] = await this.loadImage(require('assets/images/icon/marker.png'))
      this.imageMap["eye"] = await this.loadImage(require('assets/images/icon/eye.png'))
      this.imageMap["iconBackground"] = await this.loadImage(require('assets/images/icon/icon-background.png'))

      console.log("end to load image")
      const areaList = (this.mapType === 'campus' ? data.buildingList : data.roomList) || []
      const facilityList = data.facilityList || []
      areaList.forEach(item => item['itemType'] = this.mapType === 'campus' ? 'building' : 'room')
      facilityList.forEach(item => item['itemType'] = 'facility')
      this.itemList = this.itemList.concat(facilityList, areaList)
      
      const iconSet = new Set()
      this.itemList.forEach(item => {
        if (item.iconType && item.iconLevel) iconSet.add(item.iconType)
      })
      if (iconSet.size) for (let e of iconSet) this.imageMap[e] = await this.loadImage(iconPath[e])

      this.canvas = this.$refs.indoormap
      this.context = this.canvas.getContext('2d');
      this.context.lineJoin = 'round'

      const clientWidth = this.clientWidth - 2
      const clientHeight = this.clientHeight - 2 - this.clientWidth * 0.2
      this.canvas.width = clientWidth
      this.canvas.height = clientHeight

      this.iconSize = Math.max(clientWidth, clientHeight) || 0
      this.iconSize = parseInt(this.iconSize * 0.05)

      this.imgWidth = parseInt(this.imageMap['map'].width)
      this.imgHeight = parseInt(this.imageMap['map'].height)
      console.log(this.imgWidth, this.imgHeight)

      this.context.drawImage(this.imageMap['map'], 0, 0, this.imgWidth, this.imgHeight)
      const pixel = this.context.getImageData(2, 2, 1, 1).data
      this.mapMarginColor = (!pixel && !pixel.length) ? null : `rgb(${pixel.join(',')})`

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

      this.virtualButton.size = parseInt(this.clientWidth * 0.09)
      
      // this.checkRequestAnimationFrame()
      requestAnimationFrame(this.animate)

      this.$nextTick(() => {
        this.loading = false
        this.displayPage = true
        if (this.$route.name === 'Place') {
          const item = this.itemList.find((e) => e.id === parseInt(this.$route.params.id) && e.itemType === this.$route.params.type)
          if (item) {
            this.setSelectedItem(item)
            this.adjustMapPosition('middle')
          }
        }
      })
    } catch (error) {
      console.log(error)
      this.errorRefresh = true
      // this.loading = false
    }
  },

  watch: {
    selectedItem (newVal, oldVal) {
      if (newVal && JSON.stringify(this.selectedItem) !== "{}") {
        const element = newVal
        this.$router.push({
          name: 'Place',
          params: {
            buildingId: this.$route.params.buildingId,
            floorId: this.$route.params.floorId,
            type: element.type,
            id: element.id,
            itemName: element.name
          }
        })
        this.currentMarkerAnimation = {
          triggered: true,
          duration: 0,
          x: element.x,
          y: element.y
        }
      }
    },
    placePanelCollapse (val) {
      if (val && JSON.stringify(this.selectedItem) !== "{}") {
        this.lastMarkerAnimation = { 
          triggered: true,
          duration: 0,
          x: this.selectedItem.x,
          y: this.selectedItem.y
        }
        this.selectedItem = {}
      }
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
            this.gateList = gateList.map((e) => {
              let color
              switch (e.endTime - e.startTime) {
                case 24:
                  color = "Green"
                  break;
                case 16:
                  color = "Yellow"
                  break;
                case 10.5:
                  color = "Red"
                  break;
                default:
                  color = "Black"
                  break;
              }
              return {
                ...e,
                arrow: `arrow${color}`
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
    }
  },

  beforeRouteUpdate (to, from, next) {
    const fromBuildingId = from.params.buildingId || ''
    const fromFloorId = from.params.floorId || ''
    const toBuildingId = to.params.buildingId || ''
    const toFloorId = to.params.floorId || ''
    
    if (`b${fromBuildingId}f${fromFloorId}` === `b${toBuildingId}f${toFloorId}`) {
      if (to.name === 'Place') {
        this.$refs.searchPanel.touchShade()
      }
    } else {
      this.loading = false
      this.errorRefresh = false
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

.loading-panel {
  width: 100vw; 
  padding: 0 3vw; 
  position: absolute; 
  top: 0; 
  background-color: #FFFFFF; 
  z-index: 302;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading {
  position: absolute;
  top: 0;
}

.refresh {
  position: absolute;
  top: 0;
  z-index: 302;
  background: #ffffff;
}

</style>
