<template>
  <div class="page" style="overflow: hidden; transition: opacity 0.5s" :style="{ opacity: displayPage ? 1 : 0 }">
    <canvas ref="indoormap" id="indoormap" class="indoormap" 
      @touchstart.stop="ontouchstart"
      @touchmove.stop="ontouchmove"
      @touchend.stop="ontouchend"
      @guesturestart.stop @guesturechange.stop @guestureend.stop>[Your browser is too old!]</canvas>
    <button-group
      :button-list="buttonList"
      :current-floor="selectedFloor"
      :floor-list="floorList"
      @clickOccupiedBtn="showOccupiedRoom"
      ref="occupiedButton"></button-group>
    <search-panel :current-floor-id="selectedFloor.id" ref="searchPanel"></search-panel>
    <place-panel :selected-item="selectedItem" ref="placePanel"></place-panel>
    <!-- <div style="height: 1000px"></div> -->
    <div v-show="placePanelCollapse && searchPanelDeltaY < 0" class="shade" :style="searchShadeStyle" 
      @touchstart.stop="ontouchstartshade($event, 'search')"
      @touchmove.stop="ontouchmoveshade($event, 'search')"
      @touchend.prevent.stop="ontouchendshade($event, 'search')"></div>
    <div v-show="placePanelDeltaY < 0" class="shade" :style="placeShadeStyle"
      @touchstart.stop="ontouchstartshade($event, 'place')"
      @touchmove.stop="ontouchmoveshade($event, 'place')"
      @touchend.prevent.stop="ontouchendshade($event, 'place')"></div>
    <datetime 
      type="datetime" 
      v-model="datetime" 
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
      @close="datetimeClose"></datetime>
  </div>
</template>

<script>
import SearchPanel from 'components/SearchPanel'
import PlacePanel from 'components/PlacePanel'
import ButtonGroup from 'components/ButtonGroup'

import iconPath from 'utils/facilityIconPath.js'
import { easeOutBack, easeOutCirc } from 'utils/easingFunction.js'
import weekInfo from 'utils/week.json'
import { DateTime, Interval } from 'luxon'

import { mapState } from 'vuex'

export default {
  components: {
    SearchPanel,
    PlacePanel,
    ButtonGroup
  },
  data() {
    return {
      displayPage: false,
      baseUrl: process.env.VUE_APP_BASE_API + 'static',
      mapType: null,
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
      rotate: false,
      aniTimeoutId: 0,
      tapTimeoutId: 0,
      lastTapTime: null,
      lastDoubleTap: false,
      selectedFloor: {},
      selectedItem: {},
      occupiedRoomList: [],
      itemList: [],
      floorList: [],
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
      moveInPlaceShade: false,
      moveInSearchShade: false,
      datetime: null
    }
  },
  computed: {
    ...mapState({
      clientHeight: state => state.clientHeight,
      clientWidth: state => state.clientWidth,
      placePanelCollapse: state => state.place.collapse,
      placePanelDeltaY: state => state.place.deltaY,
      placePanelMaxHeight: state => state.place.maxHeight,
      searchPanelDeltaY: state => state.search.deltaY,
      searchPanelMaxHeight: state => state.search.maxHeight
    }),
    buttonList () {
      return this.mapType === 'floor' ? ['floor','home','occupy'] : []
    },
    searchShadeStyle () {
      return {
        opacity: 1 / (-this.searchPanelMaxHeight * 3) * this.searchPanelDeltaY
      }
    },
    placeShadeStyle () {
      return {
        // transition: this.bounce ? 'opacity .5s' : '',
        opacity: 1 / (-this.placePanelMaxHeight * 3) * this.placePanelDeltaY
      }
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

      if (!this.currentMarkerAnimation.triggered && !this.lastMarkerAnimation.triggered && this.zoomAnimation.triggered) {
        const totalZoom = this.zoomAnimation.totalZoom
        const zoom = totalZoom / Math.abs(totalZoom) * 20
        this.doZoom(zoom)
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
      this.drawMapInfo(this.scale.x * this.scaleAdaption, this.scale.y * this.scaleAdaption, this.position.x + this.positionAdaption.x, this.position.y + this.positionAdaption.y);
      requestAnimationFrame(this.animate)
    },

    drawMapInfo (scaleX, scaleY, offsetX, offsetY) {
      const ctx = this.context
      ctx.save()
      if (this.rotate) {
        this.context.translate(this.canvasHeight, 0)
        this.context.rotate(Math.PI / 2)
      } 

      ctx.drawImage(this.imageMap['map'], 0 * scaleX + offsetX, 0 * scaleY + offsetY, this.imgWidth * scaleX, this.imgHeight * scaleY)

      if (JSON.stringify(this.selectedItem) !== "{}") {
        if (this.selectedItem.areaCoords && this.selectedItem.areaCoords !== '') {
          const AdaptScaleX = ox => ox * this.scale.x * this.scaleAdaption + this.position.x + this.positionAdaption.x
          const AdaptScaleY = oy => oy * this.scale.y * this.scaleAdaption + this.position.y + this.positionAdaption.y
          const areaCoordsArr = this.selectedItem.areaCoords.split(',')
          ctx.globalAlpha = 0.2
          ctx.fillStyle = 'red'
          ctx.strokeStyle = 'rgb(255, 0, 0)'
          ctx.lineWidth = 3
          ctx.beginPath()
          for (let i = 0; i < areaCoordsArr.length; i += 2) {
            if (i == 0) ctx.moveTo(AdaptScaleX(areaCoordsArr[i]), AdaptScaleY(areaCoordsArr[i+1]))
            else ctx.lineTo(AdaptScaleX(areaCoordsArr[i]), AdaptScaleY(areaCoordsArr[i+1]))
          }
          ctx.closePath()
          ctx.fill()
          ctx.globalAlpha = 1
          ctx.stroke()
          ctx.lineWidth = 1
        }
      }

      if (this.itemList.length) {
        const size = 28
        this.itemList.forEach(item => {
          // selected item
          if (JSON.stringify(this.selectedItem) !== "{}" && this.selectedItem.id === item.id && this.selectedItem.type === item.itemType) return
          // item not to display
          if (!item.iconLevel || (this.scale.x < item.iconLevel || this.scale.y < item.iconLevel)) return
          ctx.beginPath()
          ctx.arc(item.location.x * scaleX + offsetX, item.location.y * scaleY + offsetY, 24, 0, 2*Math.PI)
          ctx.fillStyle="blue"
          ctx.fill()
          this.drawImage(this.imageMap[item.iconType], item.location.x, item.location.y, size/2, size/2, size, size, true, true)
        })
      }

      if (this.lastMarkerAnimation.triggered) {
        const t = this.lastMarkerAnimation.duration
        let size
        if (t < 0.5) {
          size = easeOutCirc(t, 60, -60, 0.5)
          this.lastMarkerAnimation.duration += 0.016
        } else {
          size = 0
          this.lastMarkerAnimation.triggered = false
        }

        this.drawImage(this.imageMap['marker'], this.lastMarkerAnimation.x, this.lastMarkerAnimation.y, size/2, size, size, size, true, false)
      }

      if (JSON.stringify(this.selectedItem) !== "{}") {
        const t = this.currentMarkerAnimation.duration
        let size
        if (t < 0.5) {
          size = easeOutBack(t, 20, 40, 0.5)
          this.currentMarkerAnimation.duration += 0.016
        } else {
          size = 60
          this.currentMarkerAnimation.triggered = false
        }

        size *= 2.5

        this.drawImage(this.imageMap['marker'], this.currentMarkerAnimation.x, this.currentMarkerAnimation.y, size/2, size, size, size, true, false)
      }

      if (this.mapType === 'floor') {
        if (this.$refs.occupiedButton && this.$refs.occupiedButton.occupiedActivated && this.occupiedRoomList.length) {
          const size = 60;
          this.occupiedRoomList.forEach(room => {
            const centroid = room.location
            this.drawImage(this.imageMap['group'], centroid.x, centroid.y, size/2, size/2, size, size, false, true)
          })
        }
      }

      ctx.restore()
    },

    drawImage (image, x, y, imgOffsetX, imgOffsetY, sizeX, sizeY, fixSize, selfRotate) {
      const scaleX = this.scale.x * this.scaleAdaption 
      const scaleY = this.scale.y * this.scaleAdaption
      const offsetX = this.position.x + this.positionAdaption.x
      const offsetY = this.position.y + this.positionAdaption.y

      if (!this.rotate || selfRotate) {
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

    pointPosition (p) {
      if (!this.rotate) 
        return {
          x: p.x - this.canvas.getBoundingClientRect().left,
          y: p.y - this.canvas.getBoundingClientRect().top
        } 
      else 
        return {
          x: p.y - this.canvas.getBoundingClientRect().top,
          y: this.canvas.getBoundingClientRect().right - p.x
        }
    },

    gesturePinchZoom (event) {
      let zoom = false;
      if (event.touches.length >= 2) {
        const p1 = this.pointPosition({ x: event.touches[0].clientX, y: event.touches[0].clientY })
        const p2 = this.pointPosition({ x: event.touches[1].clientX, y: event.touches[1].clientY })

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

    doZoom: function (zoom) {
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

    doMove (relativeX, relativeY) { 
      if (this.lastX && this.lastY) {
        const deltaX = relativeX - this.lastX
        const deltaY = relativeY - this.lastY

        const currentWidth = (this.imgWidth * this.scaleAdaption * this.scale.x)
        const currentHeight = (this.imgHeight * this.scaleAdaption * this.scale.y)

        let newPosX = this.position.x + deltaX
        let newPosY = this.position.y + deltaY

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
      this.lastX = relativeX;
      this.lastY = relativeY;
    },
    
    loadImage: function (url) {
      return new Promise(function(resolve, reject) {
        const image = new Image()

        image.onload = () => resolve(image)

        image.onerror = (e) => reject(e)

        image.src = url
      })
    },

    ontouchstart: function (e) {
      // console.log(e)
      this.lastX = null
      this.lastY = null
      this.lastZoomScale = null
      this.tmove = false
    },

    ontouchmove: function (e) {
      this.tmove = true
      // e.preventDefault()
     // console.log(e)
      if (e.touches.length == 2) { // pinch
        this.doZoom(this.gesturePinchZoom(e))
      } else if (e.touches.length == 1) {// move
        const { x, y } = this.pointPosition({ x: e.touches[0].clientX, y: e.touches[0].clientY})   
        this.doMove(x, y)
      }
    },

    ontouchend: function (e) {
      // console.log(e)
      if (!this.tmove && !this.currentMarkerAnimation.triggered && !this.lastMarkerAnimation.triggered) { // simple tap event
        const currentTime = Date.now()
        if (this.lastTapTime && currentTime - this.lastTapTime < 500) {
          if (!this.lastDoubleTap) {
            const { x, y } = this.pointPosition({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY })
            this.focusPointer.x = x
            this.focusPointer.y = y
            this.doZoom(200)
            
            this.lastTapTime = currentTime
            this.lastDoubleTap = true
            clearTimeout(this.tapTimeoutId)
            return
          }
        }
        this.tapTimeoutId = setTimeout(() => this.choose(e), 500)
        this.lastTapTime = currentTime
        this.lastDoubleTap = false
      }
    },
  
    choose (e) {
      if (!this.lastDoubleTap && !this.currentMarkerAnimation.triggered && !this.lastMarkerAnimation.triggered) {
        if (this.$refs.occupiedButton.occupiedActivated) {
          this.$toast({
            message: 'To do other operations, please quit room occupation mode first.',
            time: 3000
          })
          return
        }

        const AdaptScaleX = ox => ox * this.scale.x * this.scaleAdaption + this.position.x + this.positionAdaption.x
        const AdaptScaleY = oy => oy * this.scale.y * this.scaleAdaption + this.position.y + this.positionAdaption.y
        
        const { x, y } = this.pointPosition({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY })

        const ctx = this.context
        let sameItem = false
        const found = this.itemList.some(element => {
          if (element.itemType === 'facility') {
            ctx.beginPath()
            ctx.arc(parseInt(AdaptScaleX(element.location.x)), parseInt(AdaptScaleY(element.location.y)), 11 * this.scale.x * this.scaleAdaption, 0, 2*Math.PI)
          } else {
            ctx.beginPath()
            const areaCoordsArr = element.areaCoords.split(',')
            for (let i = 0; i < areaCoordsArr.length; i += 2) {
              if (i == 0) ctx.moveTo(AdaptScaleX(areaCoordsArr[i]), AdaptScaleY(areaCoordsArr[i+1]))
              else ctx.lineTo(AdaptScaleX(areaCoordsArr[i]), AdaptScaleY(areaCoordsArr[i+1]))
            }
          }
          if(ctx.isPointInPath(x, y)) {
            // console.log('selected')
            sameItem = this.visualizeSelectedItem(element)
            if (!sameItem) {
              this.adjustMapPosition('include')
              this.$router.push({
                name: 'Place',
                params: {
                  buildingId: this.$route.params.buildingId,
                  floorId: this.$route.params.floorId,
                  type: element.itemType,
                  id: element.id,
                  itemName: element.name
                }
              })
            }
            return true
          }
        })

        // if (this.mapType === 'floor') {
        //   if (found && this.occupiedRoomList.length) {
        //     this.occupiedRoomList = []
        //     this.$refs.occupiedButton.hideOccupiedRoom()
        //   }
        // }

        if (!found && !sameItem && JSON.stringify(this.selectedItem) !== "{}" && !this.lastDoubleTap) {
          if (!this.placePanelCollapse) this.$store.commit('place/setCollapse', true)
          this.lastMarkerAnimation = { 
            triggered: true,
            duration: 0,
            x: this.selectedItem.x,
            y: this.selectedItem.y
          }
          this.selectedItem = {}
        }
        // console.log(found)
      }
    },

    visualizeSelectedItem (element) {
      let sameItem = false
      if (this.selectedItem.type !== element.itemType || this.selectedItem.id !== element.id) {
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
          ...element.location
        }
        if (element.itemType === 'room' || element.itemType === 'building')
          this.selectedItem = {
            ...this.selectedItem,
            areaCoords: element.areaCoords
          }
        this.currentMarkerAnimation = {
          triggered: true,
          duration: 0,
          ...element.location
        }
      } else {
        sameItem = true
        this.$store.commit('place/setCollapse', false)
      }
      return sameItem
    },

    async showOccupiedRoom (flag) {
      if (flag) {
        this.$refs.dt.datetime = null
        const input = document.querySelector('#datetime')
        input.click()
      } else {
        this.occupiedRoomList = []
      }
      // try {
      //   if (flag) {
      //     const data = await this.$api.room.getOccupiedRoom(this.selectedFloor.id)
      //     this.occupiedRoomList = data.occupiedRoomList
      //     this.selectedItem = {}
      //   } else {
      //     this.occupiedRoomList = []
      //   }
      // } catch (err) {
      //   console.log(err)
      //   this.$toast({
      //     message: 'Faild to get occupied rooms.\nPlease try again.',
      //     time: 3000
      //   })
      //   this.occupiedRoomList = []
      //   this.$refs.occupiedButton.hideOccupiedRoom()
      // }
      
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
            const weekObj = weekInfo["weeks"][weekIndex]
            let noEmptyRoom = !!weekObj["number"]
            if (noEmptyRoom) {
              try {
                this.$toast({
                  message: 'Requesting...',
                  time: 10000
                })
                const data = await this.$api.room.getOccupiedRoom(this.selectedFloor.id, {
                  week: weekObj["number"],
                  day: date.weekday,
                  hour: date.minute >= 30 ? date.hour + 0.5 : date.hour
                })
                this.$toast({
                  message: `Successfully get occupied rooms at ${date.weekdayShort}, ${date.monthShort} ${date.day} ${date.year}, ${date.hour}:${date.minute}`,
                  time: 3000
                })
                if (!data.occupiedRoomList || data.occupiedRoomList.length === 0) {
                  noEmptyRoom = false
                } else {
                  this.occupiedRoomList = data.occupiedRoomList
                  this.selectedItem = {}
                }
              } catch (err) {
                console.log(err)
                this.$toast({
                  message: 'Failed to get occupied rooms.\nPlease try again.',
                  time: 3000
                })
                this.occupiedRoomList = []
                this.$refs.occupiedButton.hideOccupiedRoom()
              }
            } 
            
            if (!noEmptyRoom) {
              this.$toast({
                message: `No room occupied at ${date.weekdayShort}, ${date.monthShort} ${date.day} ${date.year}, ${date.hour}:${date.minute}`,
                time: 3000
              })
              this.occupiedRoomList = []
              this.$refs.occupiedButton.hideOccupiedRoom()
            }
          }
        }
      }
    },

    datetimeClose () {
      if (!this.$refs.dt.datetime) this.$refs.occupiedButton.hideOccupiedRoom()
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

    getCentroid (coordsStr) {
      const coordsArr = coordsStr.split(",");
      const coordsArrLength = coordsArr.length;
      const vertexArr = [];

      for (let i=0; i<coordsArrLength; i=i+2) {
        if (coordsArr[i]!=""&&coordsArr[i+1]!="") {
          vertexArr.push({
            x: parseInt(coordsArr[i]),
            y: parseInt(coordsArr[i+1]),
          });
        }
      }

      const vertexArrLength = vertexArr.length;
      let subAreaSum = 0;
      let subCentroidXSum = 0;
      let subCentroidYSum = 0;

      for(let i=2; i<vertexArrLength; i++){
        const p0 = vertexArr[0];
        const p1 = vertexArr[i-1];
        const p2 = vertexArr[i];
        const subArea = (p0.x*p1.y + p1.x*p2.y + p2.x*p0.y - p1.x*p0.y - p2.x*p1.y - p0.x*p2.y)/2;
        const subCentroidX = (p0.x+p1.x+p2.x)/3;
        const subCentroidY = (p0.y+p1.y+p2.y)/3;

        subAreaSum += subArea;
        subCentroidXSum += subCentroidX*subArea;
        subCentroidYSum += subCentroidY*subArea;
      }

      return {
        x: subCentroidXSum/subAreaSum,
        y: subCentroidYSum/subAreaSum,
      }
    },

    ontouchstartshade (e, type) {
      if (type === 'place') this.moveInPlaceShade = false
      else this.moveInSearchShade = false
    },

    ontouchmoveshade (e, type) {
      if (type === 'place') this.moveInPlaceShade = true
      else this.moveInSearchShade = true
    },

    ontouchendshade (e, type) {
      if (type === 'place' &&!this.moveInPlaceShade) {
        this.$refs.placePanel.touchShade()
      } else if (type === 'search' &&!this.moveInSearchShade) {
        this.$refs.searchPanel.touchShade()
      }
    },
  },
  async mounted () {
    try {
      this.mapType = !!this.$route.params.buildingId ? 'floor' : 'campus'

      let data
      if (this.mapType === 'floor') {
        let buildingId = parseInt(this.$route.params.buildingId)
        let floorId = parseInt(this.$route.params.floorId)
        data = await this.$api.floor.getFloorInfo(buildingId, floorId)
        console.log(data)
        this.selectedFloor = data.selectedFloor
        this.floorList = data.floorList || []
        
        this.imageMap['map'] = await this.loadImage(this.baseUrl + this.selectedFloor.imgUrl)
        this.imageMap['marker'] = await this.loadImage(require('assets/images/icon/marker.png'))
        this.imageMap['group'] = await this.loadImage(require('assets/images/icon/group.png'))
      } else {
        data = await this.$api.floor.getCampusInfo()
        console.log(data)

        this.imageMap['map'] = await this.loadImage(require('assets/images/map/campus/campus-map.png'))
        this.imageMap['marker'] = await this.loadImage(require('assets/images/icon/marker.png'))
      }

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

      this.imgWidth = parseInt(this.imageMap['map'].width)
      this.imgHeight = parseInt(this.imageMap['map'].height)

      console.log(this.imgWidth, this.imgHeight)

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
      
      // this.checkRequestAnimationFrame()
      requestAnimationFrame(this.animate)

      this.$nextTick(() => {
        this.$store.dispatch('hideLoading')
        this.displayPage = true
        if (this.$route.name === 'Place') {
          const item = this.itemList.find((e) => e.id === parseInt(this.$route.params.id) && e.itemType === this.$route.params.type)
          if (item) {
            this.visualizeSelectedItem(item)
            this.adjustMapPosition('middle')
          }
        }
      })
    } catch (error) {
      console.log(error)
      this.$store.commit('setErrorRefresh', true)
      // this.$store.dispatch('hideLoading')
      // this.$toast({
      //   message: 'Fail to load data.\nPlease try again.',
      //   time: 3000
      // })
    }
  },

  watch: {
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
    }
  },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.$store.dispatch('displayLoading')
      vm.$store.commit('setErrorRefresh', false)
    })
  },

  beforeRouteUpdate (to, from, next) {
    const fromBuildingId = from.params.buildingId || ''
    const fromFloorId = from.params.floorId || ''
    const toBuildingId = to.params.buildingId || ''
    const toFloorId = to.params.floorId || ''
    
    if (`b${fromBuildingId}f${fromFloorId}` === `b${toBuildingId}f${toFloorId}`) {
      if (to.name === 'Place') {
        this.$refs.searchPanel.touchShade()

        const item = this.itemList.find((e) => e.id === to.params.id && e.itemType === to.params.type)
        if (item) this.visualizeSelectedItem(item)
      }
    } else {
      this.$store.dispatch('displayLoading')
      this.$store.commit('setErrorRefresh', false)
    }
    next()
  },
}
</script>

<style style="scss">
.shade {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #000000;
  z-index: 100;
}

.page {
  width: 100vw;
  height: 100%;
}

.indoormap {
  margin: 0 auto;
  border: 1px black solid;
  display: block;
}
</style>
