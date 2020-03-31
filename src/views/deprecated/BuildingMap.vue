<template>
  <div class="page" style="overflow: hidden; transition: opacity 0.5s" :style="{ opacity: displayPage ? 1 : 0 }">
    <!-- {{scale.x}} - {{test}} -->
    <!-- {{position.x}} - {{position.y}} -->
    <!-- hello - {{test}} - {{markerAnimation.triggered}} -->
    <!-- <div style="width: 100vw; height: 800px; background: red"></div>
    <div style="width: 100vw; height: 400px; background: green"></div> -->
    <canvas ref="indoormap" id="indoormap" class="indoormap" 
      @touchstart.stop="ontouchstart"
      @touchmove.stop="ontouchmove"
      @touchend.stop="ontouchend"
      @guesturestart.stop @guesturechange.stop @guestureend.stop>[Your browser is too old!]</canvas>
    <button-group
      :button-list="['floor','home','occupy']"
      :current-floor="selectedFloor"
      :floor-list="floorList"
      @clickOccupiedBtn="showOccupiedRoom"
      ref="occupiedButton"></button-group>
    <search-panel :current-floor-id="selectedFloor.id" @getItemInfo="getItemFromSearch"></search-panel>
    <modal ref="modal"></modal>
    <!-- <div style="height: 1000px"></div> -->
  </div>
</template>

<script>
import SearchPanel from 'components/SearchPanel'
import Modal from 'components/Modal'
import ButtonGroup from 'components/ButtonGroup'
import iconPath from 'assets/js/facilityIconPath.js'

export default {
  components: {
    SearchPanel,
    Modal,
    ButtonGroup
  },
  data() {
    return {
      clientWidth: 0,
      clientHeight: 0,
      displayPage: false,
      baseUrl: process.env.VUE_APP_BASE_API + 'static',
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
      zoom: false,
      lastTapTime: null,
      lastDoubleTap: false,
      selectedFloor: {},
      selectedItem: {},
      roomList: [],
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

      // console.log(0 * scaleX + offsetX, 0 * scaleY + offsetY)
      this.drawImage(0 * scaleX + offsetX, 0 * scaleY + offsetY, this.imgWidth * scaleX, this.imgHeight * scaleY, this.imageMap['map'])

      if (this.facilityList.length && (scaleX / scaleAdaption >= 2 || scaleY / scaleAdaption >= 2)) {
        const size = 14
        this.facilityList.forEach(facility => {
          if (JSON.stringify(this.selectedItem) !== "{}" && this.selectedItem.id === facility.id && this.selectedItem.type === 'facility') return
          // if (!this.rotate) {
            ctx.beginPath()
            ctx.arc(parseInt(facility.location.x) * scaleX + offsetX, parseInt(facility.location.y) * scaleY + offsetY, 11 * scaleX, 0, 2*Math.PI)
            ctx.fillStyle="blue"
            ctx.fill()
            this.drawImage((parseInt(facility.location.x) - size/2) * scaleX + offsetX, (parseInt(facility.location.y) - size/2) * scaleY + offsetY, size * scaleX, size * scaleY, this.imageMap[facility.type])
          // } else {
          //   ctx.restore()
          //   ctx.beginPath()
          //   ctx.arc(this.canvasHeight - (parseInt(facility.location.y) * scaleY + offsetY), parseInt(facility.location.x) * scaleX + offsetX, 11 * scaleX, 0, 2*Math.PI)
          //   ctx.fillStyle="blue"
          //   ctx.fill()
          //   this.drawImage(this.canvasHeight - ((parseInt(facility.location.y) + size/2) * scaleY + offsetY), (parseInt(facility.location.x) - size/2) * scaleX + offsetX, size * scaleY, size * scaleX, this.imageMap[facility.type])
          //   ctx.save()
          //   ctx.translate(this.canvasHeight, 0)
          //   ctx.rotate(Math.PI / 2)
          // }
        })
      }

      if (JSON.stringify(this.selectedItem) !== "{}") {
        if (this.selectedItem.type === 'room') {
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
          size = this.easeOutBack(t, 20, 40, 0.5)
          this.currentMarkerAnimation.duration += 0.016
        } else {
          size = 60
          this.currentMarkerAnimation.triggered = false
        }

        if (!this.rotate) {
          this.drawImage(parseInt(this.currentMarkerAnimation.x - size/2) * scaleX + offsetX, parseInt(this.currentMarkerAnimation.y - size) * scaleY + offsetY, size * scaleX, size * scaleY, this.imageMap['marker'])
        } else {
          ctx.restore()
          this.drawImage(this.canvasHeight - (parseInt(this.currentMarkerAnimation.y + size/2) * scaleY + offsetY), parseInt(this.currentMarkerAnimation.x - size) * scaleX + offsetX, size * scaleY, size * scaleX, this.imageMap['marker'])
          ctx.save()
          ctx.translate(this.canvasHeight, 0)
          ctx.rotate(Math.PI / 2)
        }
      }

      if (this.lastMarkerAnimation.triggered) {
        const t = this.lastMarkerAnimation.duration
        let size
        if (t < 0.5) {
          size = this.easeOutCirc(t, 60, -60, 0.5)
          this.lastMarkerAnimation.duration += 0.016
        } else {
          size = 0
          this.lastMarkerAnimation.triggered = false
        }

        if (!this.rotate) {
          this.drawImage(parseInt(this.lastMarkerAnimation.x - size/2) * scaleX + offsetX, parseInt(this.lastMarkerAnimation.y - size) * scaleY + offsetY, size * scaleX, size * scaleY, this.imageMap['marker'])
        } else {
          ctx.restore()
          this.drawImage(this.canvasHeight - (parseInt(this.lastMarkerAnimation.y + size/2) * scaleY + offsetY), parseInt(this.lastMarkerAnimation.x - size) * scaleX + offsetX, size * scaleY, size * scaleX, this.imageMap['marker'])
          ctx.save()
          ctx.translate(this.canvasHeight, 0)
          ctx.rotate(Math.PI / 2)
        }
      }

      if (this.occupiedRoomList.length) {
        const size = 60;
        this.occupiedRoomList.forEach(room => {
          const centroid = room.location
          if (!this.rotate) {
            this.drawImage(parseInt(centroid.x - size/2) * scaleX + offsetX, parseInt(centroid.y - size/2) * scaleY + offsetY, size * scaleX, size * scaleY, this.imageMap['group']);
          } else {
            ctx.restore()
            this.drawImage(this.canvasHeight - (parseInt(centroid.y + size/2) * scaleY + offsetY), parseInt(centroid.x - size/2) * scaleX + offsetX, size * scaleY, size * scaleX, this.imageMap['group'])
            ctx.save()
            ctx.translate(this.canvasHeight, 0)
            ctx.rotate(Math.PI / 2)
          }
          
        })
      }

      ctx.restore()
    },

    drawImage: function (x, y, width, height, image) {
      if (!!image) {
        // console.log(x,y)
        this.context.drawImage(image, x, y, width, height)
        // this.context.fillRect(x, y, width, height)
        // this.context.strokeRect(x, y, width, height)
      }
    },

    gesturePinchZoom (event) {
      let zoom = false;
      if (event.touches.length >= 2) {
        // const p1 = event.touches[0];
        // const p2 = event.touches[1];
        let p1, p2

        if (!this.rotate) {
          p1 = {
            clientX: event.touches[0].clientX - this.canvas.getBoundingClientRect().left,
            clientY: event.touches[0].clientY - this.canvas.getBoundingClientRect().top,
          }

          p2 = {
            clientX: event.touches[1].clientX - this.canvas.getBoundingClientRect().left,
            clientY: event.touches[1].clientY - this.canvas.getBoundingClientRect().top,
          }
        } else {
          p1 = {
            clientX: event.touches[0].clientY - this.canvas.getBoundingClientRect().top,
            clientY: this.canvas.getBoundingClientRect().right - event.touches[0].clientX,
          }

          p2 = {
            clientX: event.touches[1].clientY - this.canvas.getBoundingClientRect().top,
            clientY: this.canvas.getBoundingClientRect().right - event.touches[1].clientX,
          }
        }

        this.focusPointer.x = (p1.clientX + p2.clientX) / 2;
        this.focusPointer.y = (p1.clientY + p2.clientY) / 2;
        const zoomScale = Math.sqrt(Math.pow(p2.clientX - p1.clientX, 2) + Math.pow(p2.clientY - p1.clientY, 2)); // euclidian
        if (this.lastZoomScale) {
          this.zoom = true
          zoom = zoomScale - this.lastZoomScale;
        }
        this.lastZoomScale = zoomScale;
      }
    // this.zoom = zoom
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
      let newPosX = this.focusPointer.x - (this.focusPointer.x - this.position.x) * newScale / this.scale.x;
      let newPosY = this.focusPointer.y - (this.focusPointer.y - this.position.y) * newScale / this.scale.y;
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
        let relativeX, relativeY
        if (!this.rotate) {
          relativeX = e.touches[0].clientX - this.canvas.getBoundingClientRect().left
          relativeY = e.touches[0].clientY - this.canvas.getBoundingClientRect().top
        } else {
          relativeX = e.touches[0].clientY - this.canvas.getBoundingClientRect().top
          relativeY = this.canvas.getBoundingClientRect().right - e.touches[0].clientX
        }
            
        this.doMove(relativeX, relativeY)
      }
    },

    ontouchend: function (e) {
      // console.log(e)
      if (!this.tmove && !this.currentMarkerAnimation.triggered && !this.lastMarkerAnimation.triggered) { // simple tap event
        const currentTime = Date.now()
        if (this.lastTapTime && currentTime - this.lastTapTime < 500) {
          if (!this.lastDoubleTap) {
            if (!this.rotate) {
              this.focusPointer.x = e.changedTouches[0].clientX - this.canvas.getBoundingClientRect().left
              this.focusPointer.y = e.changedTouches[0].clientY - this.canvas.getBoundingClientRect().top
            } else {
              this.focusPointer.x = e.changedTouches[0].clientY - this.canvas.getBoundingClientRect().top
              this.focusPointer.y = this.canvas.getBoundingClientRect().right - e.changedTouches[0].clientX
            }
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
        
        let relativeX, relativeY
        if (!this.rotate) {
          relativeX = e.changedTouches[0].clientX - this.canvas.getBoundingClientRect().left
          relativeY = e.changedTouches[0].clientY - this.canvas.getBoundingClientRect().top
        } else {
          relativeX = e.changedTouches[0].clientY - this.canvas.getBoundingClientRect().top
          relativeY = this.canvas.getBoundingClientRect().right - e.changedTouches[0].clientX
        }
        
        const ctx = this.context
        let sameItem = false
        let found = this.roomList.some(element => {
          // ctx.fillStyle = '#000';
          ctx.beginPath()
          const areaCoordsArr = element.areaCoords.split(',')
          for (let i = 0; i < areaCoordsArr.length; i += 2) {
            if (i == 0) ctx.moveTo(AdaptScaleX(areaCoordsArr[i]), AdaptScaleY(areaCoordsArr[i+1]))
            else ctx.lineTo(AdaptScaleX(areaCoordsArr[i]), AdaptScaleY(areaCoordsArr[i+1]))
          }
          // ctx.fillStyle="blue"
          // ctx.fill()
          if(ctx.isPointInPath(relativeX, relativeY)){
            // console.log('selected')
            sameItem = this.setSelectedItem('room', element)
            return true
          }
        })

        if (!found) {
          found = this.facilityList.some(element => {
            // ctx.fillStyle = '#000';
            ctx.beginPath()
            ctx.arc(parseInt(AdaptScaleX(element.location.x)), parseInt(AdaptScaleY(element.location.y)), 11 * this.scale.x * this.scaleAdaption, 0, 2*Math.PI)
            // ctx.fillStyle="blue"
            // ctx.fill()
            if(ctx.isPointInPath(relativeX, relativeY)){
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
        if (!found && !sameItem && JSON.stringify(this.selectedItem) !== "{}" && !this.lastDoubleTap) {
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
        this.$refs.modal.getItemInfo(type, element.id, element.name)
      } else {
        sameItem = true
        this.$refs.modal.showModal()
      }
      return sameItem
    },

    getItemFromSearch (type, id) {
      // let found = false
      // let sameItem = false
      let item
      if (type === 'room') item = this.roomList.find(element => element.id === id)
      else if (type === 'facility') item = this.facilityList.find(element => element.id === id)

      if (item) {
        // sameItem = this.setSelectedItem(type, item)
        // found = true
        this.setSelectedItem(type, item)
        if (this.occupiedRoomList.length) {
          this.occupiedRoomList = []
          this.$refs.occupiedButton.hideOccupiedRoom()
        }
      } 
      // if (found && this.occupiedRoomList.length) {
      //   this.occupiedRoomList = []
      //   this.$refs.occupiedButton.hideOccupiedRoom()
      // }
      // if (!found && !sameItem && JSON.stringify(this.selectedItem) !== "{}" && !this.lastDoubleTap) {
      //   this.lastMarkerAnimation = { 
      //     triggered: true,
      //     duration: 0,
      //     x: this.selectedItem.x,
      //     y: this.selectedItem.y
      //   }
      //   this.selectedItem = {}
      // }
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

    easeOutBack (t, b, c, d, s) {
      if (s == undefined) s = 1.70158;
      return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
    },

    easeOutElastic (t, b, c, d) {
      var s=1.70158;var p=0;var a=c;
      if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
      if (a < Math.abs(c)) { a=c; var s=p/4; }
      else var s = p/(2*Math.PI) * Math.asin (c/a);
      return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
    },

    easeOutCirc (t, b, c, d) {
      return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
    },
  },
  async mounted () {
    try {
      const data = await this.$api.floor.getFloorInfo(this.$route.query.buildingId, this.$route.query.floorId);
      console.log(data)
      this.selectedFloor = data.selectedFloor;
      this.floorList = data.floorList;
      this.roomList = data.roomList;
      this.facilityList = data.facilityList;
    } catch (error) {
      console.log('please refresh')
      // console.log(error)
      throw error
    }

    this.clientWidth = document.documentElement.clientWidth
    this.clientHeight = document.documentElement.clientHeight

    this.canvas = this.$refs.indoormap
    this.context = this.canvas.getContext('2d');
    const clientWidth = document.documentElement.clientWidth - 2
    const clientHeight = document.documentElement.clientHeight - 2 - document.documentElement.clientWidth * 0.2
    this.canvas.width = clientWidth
    this.canvas.height = clientHeight
    // const clientWidth = document.documentElement.clientWidth * 2
    // const clientHeight = document.documentElement.clientHeight * 2
    // this.canvas.style.width = document.documentElement.clientWidth - 2
    // this.canvas.style.height = document.documentElement.clientHeight - 2
    // this.canvas.width = clientWidth
    // this.canvas.height = clientHeight

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

    const imgWidth = parseInt(this.imageMap['map'].width)
    const imgHeight = parseInt(this.imageMap['map'].height)

    console.log(imgWidth, imgHeight)

    this.imgWidth = imgWidth
    this.imgHeight = imgHeight

    if (imgWidth <= imgHeight) {
      this.canvasWidth = clientWidth
      this.canvasHeight = clientHeight
      this.scaleAdaption = this.canvasHeight / imgHeight
      if (imgWidth * this.scaleAdaption > this.canvasWidth) this.scaleAdaption = this.canvasWidth / imgWidth
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
      this.scaleAdaption = this.canvasWidth / imgWidth
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
      const { roomId, facilityId } = this.$route.query
      if (roomId) {
        this.getItemFromSearch('room', parseInt(roomId))
      } else if (facilityId) {
        this.getItemFromSearch('facility', parseInt(facilityId))
      }
    })
  },

  beforeRouteUpdate (to, from, next) {
    next()
    this.$router.go(0)
  },
}
</script>

<style style="scss" scoped>
.page
{
  width: 100vw;
  height: 100%;
}

.indoormap
{
  margin: 0 auto;
  border: 1px black solid;
  display: block;
}

</style>
