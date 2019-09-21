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
  </div>
</template>

<script>
import SearchPanel from 'components/SearchPanel'
import PlacePanel from 'components/PlacePanel'
import ButtonGroup from 'components/ButtonGroup'

import iconPath from 'utils/facilityIconPath.js'
import { easeOutBack, easeOutCirc } from 'utils/easingFunction.js'

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
      areaList: [],
      occupiedRoomList: [],
      facilityList: [],
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
      moveInSearchShade: false
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
      this.drawMapInfo(this.scale.x * this.scaleAdaption, this.scale.y * this.scaleAdaption, this.position.x + this.positionAdaption.x, this.position.y + this.positionAdaption.y, this.scaleAdaption);
      requestAnimationFrame(this.animate)
    },

    drawMapInfo (scaleX, scaleY, offsetX, offsetY, scaleAdaption) {
      const ctx = this.context
      ctx.save()
      if (this.rotate) {
        this.context.translate(this.canvasHeight, 0)
        this.context.rotate(Math.PI / 2)
      } 

      ctx.drawImage(this.imageMap['map'], 0 * scaleX + offsetX, 0 * scaleY + offsetY, this.imgWidth * scaleX, this.imgHeight * scaleY)

      if (this.mapType === 'floor') {
        if (this.facilityList.length && (scaleX / scaleAdaption >= 2 || scaleY / scaleAdaption >= 2)) {
          const size = 14
          this.facilityList.forEach(facility => {
            if (JSON.stringify(this.selectedItem) !== "{}" && this.selectedItem.id === facility.id && this.selectedItem.type === 'facility') return
              ctx.beginPath()
              ctx.arc(parseInt(facility.location.x) * scaleX + offsetX, parseInt(facility.location.y) * scaleY + offsetY, 11 * scaleX, 0, 2*Math.PI)
              ctx.fillStyle="blue"
              ctx.fill()
              ctx.drawImage(this.imageMap[facility.type], (parseInt(facility.location.x) - size/2) * scaleX + offsetX, (parseInt(facility.location.y) - size/2) * scaleY + offsetY, size * scaleX, size * scaleY)
          })
        }
      }

      if (JSON.stringify(this.selectedItem) !== "{}") {
        if (this.selectedItem.type === 'room' || this.selectedItem.type === 'building') {
          const AdaptScaleX = ox => ox * this.scale.x * this.scaleAdaption + this.position.x + this.positionAdaption.x
          const AdaptScaleY = oy => oy * this.scale.y * this.scaleAdaption + this.position.y + this.positionAdaption.y
          const areaCoordsArr = this.selectedItem.areaCoords.split(',')
          ctx.globalAlpha = 0.2
          ctx.fillStyle = 'red'
          ctx.beginPath()
          for (let i = 0; i < areaCoordsArr.length; i += 2) {
            if (i == 0) ctx.moveTo(AdaptScaleX(areaCoordsArr[i]), AdaptScaleY(areaCoordsArr[i+1]))
            else ctx.lineTo(AdaptScaleX(areaCoordsArr[i]), AdaptScaleY(areaCoordsArr[i+1]))
          }
          ctx.fill()
          ctx.globalAlpha = 1
        }

        const t = this.currentMarkerAnimation.duration
        let size
        if (t < 0.5) {
          size = easeOutBack(t, 20, 40, 0.5)
          this.currentMarkerAnimation.duration += 0.016
        } else {
          size = 60
          this.currentMarkerAnimation.triggered = false
        }

        this.drawImage(this.imageMap['marker'], this.currentMarkerAnimation.x, this.currentMarkerAnimation.y, size/2, size, size, size, scaleX, scaleY, offsetX, offsetY)
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

        this.drawImage(this.imageMap['marker'], this.lastMarkerAnimation.x, this.lastMarkerAnimation.y, size/2, size, size, size, scaleX, scaleY, offsetX, offsetY)
      }

      if (this.mapType === 'floor') {
        if (this.occupiedRoomList.length) {
          const size = 60;
          this.occupiedRoomList.forEach(room => {
            const centroid = room.location
            this.drawImage(this.imageMap['group'], centroid.x, centroid.y, size/2, size/2, size, size, scaleX, scaleY, offsetX, offsetY)
          })
        }
      }

      ctx.restore()
    },

    drawImage (image, x, y, imgOffsetX, imgOffsetY, sizeX, sizeY, scaleX, scaleY, offsetX, offsetY) {
      if (!this.rotate) {
        this.context.drawImage(image, parseInt((x - imgOffsetX) * scaleX + offsetX), parseInt((y - imgOffsetY) * scaleY + offsetY), sizeX * scaleX, sizeY * scaleY)
      } else {
        this.context.restore()
        this.context.drawImage(image, parseInt(this.canvasHeight - ((y + imgOffsetX) * scaleY + offsetY)), parseInt((x - imgOffsetY) * scaleX + offsetX), sizeX * scaleY, sizeY * scaleX)
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
      // edges cases
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
        const deltaX = relativeX - this.lastX;
        const deltaY = relativeY - this.lastY;

        const currentWidth = (this.imgWidth * this.scaleAdaption * this.scale.x);
        const currentHeight = (this.imgHeight * this.scaleAdaption * this.scale.y);

        this.position.x += deltaX;
        this.position.y += deltaY;

        // edge cases
        if (this.position.x > 0) this.position.x = 0
        else if (this.position.x + currentWidth + this.positionAdaption.x < this.canvasWidth - this.positionAdaption.x)
          this.position.x = this.canvasWidth - 2 * this.positionAdaption.x - currentWidth
          
        if (this.position.y > 0) this.position.y = 0
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
        const AdaptScaleX = ox => ox * this.scale.x * this.scaleAdaption + this.position.x + this.positionAdaption.x
        const AdaptScaleY = oy => oy * this.scale.y * this.scaleAdaption + this.position.y + this.positionAdaption.y
        
        const { x, y } = this.pointPosition({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY })
        
        const ctx = this.context
        let sameItem = false
        let found = this.areaList.some(element => {
          // ctx.fillStyle = '#000';
          ctx.beginPath()
          const areaCoordsArr = element.areaCoords.split(',')
          for (let i = 0; i < areaCoordsArr.length; i += 2) {
            if (i == 0) ctx.moveTo(AdaptScaleX(areaCoordsArr[i]), AdaptScaleY(areaCoordsArr[i+1]))
            else ctx.lineTo(AdaptScaleX(areaCoordsArr[i]), AdaptScaleY(areaCoordsArr[i+1]))
          }
          // console.log(AdaptScaleX(element.location.x), AdaptScaleY(element.location.y), x, y)
          // ctx.fillStyle="blue"
          // ctx.fill()
          if(ctx.isPointInPath(x, y)){
            // console.log('selected')
            sameItem = this.setSelectedItem(this.mapType === 'floor' ? 'room' : 'building', element)
            return true
          }
        })

        if (this.mapType === 'floor') {
          if (!found) {
            found = this.facilityList.some(element => {
              // ctx.fillStyle = '#000';
              ctx.beginPath()
              ctx.arc(parseInt(AdaptScaleX(element.location.x)), parseInt(AdaptScaleY(element.location.y)), 11 * this.scale.x * this.scaleAdaption, 0, 2*Math.PI)
              // ctx.fillStyle="blue"
              // ctx.fill()
              if(ctx.isPointInPath(x, y)){
                // console.log('selected')
                sameItem = this.setSelectedItem('facility', element)
                return true
              }
            })
          }

          if (found && this.occupiedRoomList.length) {
            this.occupiedRoomList = []
            this.$refs.occupiedButton.hideOccupiedRoom()
          }
        }

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

    setSelectedItem (type, element) {
      let sameItem = false
      if (this.selectedItem.type !== type || this.selectedItem.id !== element.id) {
        if (!!this.selectedItem.x) {
          this.lastMarkerAnimation = { 
            triggered: true,
            duration: 0,
            x: this.selectedItem.x,
            y: this.selectedItem.y
          }
        }
        this.selectedItem = {
          type,
          id: element.id,
          name: element.name,
          ...element.location
        }
        if (type === 'room' || type === 'building')
          this.selectedItem = {
            ...this.selectedItem,
            areaCoords: element.areaCoords
          }
        this.currentMarkerAnimation = {
          triggered: true,
          duration: 0,
          ...element.location
        }
        this.$router.push({
          name: 'Place',
          params: {
            buildingId: element.buildingId,
            floorId: element.floorId,
            type,
            id: element.id,
            itemName: element.name
          }
        })
      } else {
        sameItem = true
        this.$store.commit('place/setCollapse', false)
      }
      return sameItem
    },

    async showOccupiedRoom (flag) {
      try {
        if (flag) {
          const data = await this.$api.room.getOccupiedRoom(this.selectedFloor.id)
          this.occupiedRoomList = data.occupiedRoomList
          this.selectedItem = {}
        } else {
          this.occupiedRoomList = []
        }
      } catch (err) {
        this.$toast({
          message: 'Faild to get occupied rooms.\nPlease try again.',
          time: 3000
        })
        this.occupiedRoomList = []
        throw err
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

      if (this.mapType === 'floor') {
        let buildingId = parseInt(this.$route.params.buildingId)
        let floorId = parseInt(this.$route.params.floorId)
        const data = await this.$api.floor.getFloorInfo(buildingId, floorId)
        console.log(data)
        this.selectedFloor = data.selectedFloor;
        this.floorList = data.floorList;
        this.areaList = data.roomList;
        this.facilityList = data.facilityList;

        const iconList = []
        this.facilityList.forEach(facility => {
          iconList.push(facility.type)
        })
        iconList.sort()

        if (iconList.length) {
          const result = [iconList[0]]
          for (let i=1, len=iconList.length; i<len; i++) iconList[i] !== iconList[i-1] && result.push(iconList[i])
          for (let i = 0; i < result.length; i++) this.imageMap[result[i]] = await this.loadImage(iconPath[result[i]])
        }
        
        this.imageMap['map'] = await this.loadImage(this.baseUrl + this.selectedFloor.imgUrl)
        this.imageMap['marker'] = await this.loadImage(require('assets/images/icon/marker.png'))
        this.imageMap['group'] = await this.loadImage(require('assets/images/icon/group.png'))
      } else {
        const data = await this.$api.building.getBuildings()
        console.log(data)
        this.areaList = data.buildingList

        this.imageMap['map'] = await this.loadImage(require('assets/images/map/campus/campus-map.png'))
        this.imageMap['marker'] = await this.loadImage(require('assets/images/icon/marker.png'))
      }
    

      this.canvas = this.$refs.indoormap
      this.context = this.canvas.getContext('2d');
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
          const itemList = this.$route.params.type === 'facility' ? this.facilityList : this.areaList
          const item = itemList.find((item) => item.id === parseInt(this.$route.params.id))
          this.setSelectedItem(this.$route.params.type, item)
        }
      })
    } catch (error) {
      this.$store.commit('setErrorRefresh', true)
      // this.$store.dispatch('hideLoading')
      // this.$toast({
      //   message: 'Fail to load data.\nPlease try again.',
      //   time: 3000
      // })
      throw error
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

        const itemList = to.params.type === 'facility' ? this.facilityList : this.areaList
        const item = itemList.find((facility) => facility.id === to.params.id)
        this.setSelectedItem(to.params.type, item)
      }
    } else {
      this.$store.dispatch('displayLoading')
      this.$store.commit('setErrorRefresh', false)
    }
    next()
  },
}
</script>

<style style="scss" scoped>
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
