import campusLocationList from "assets/json/campusLocation.json"
import iconSpriteInfo from "assets/json/iconSpriteInfo.json"
import i18n from "locales"
import { wktToGeoJSON } from "@terraformer/wkt"
import { mapState } from "vuex"

const mixin = {
  data() {
    return {
      urlLocationReg: /@.*?(\?|$)/,
      placeIdReg: /^(\d+)(,f(\d+))?$/i,
      locationUrlReg: /^(-?\d+),(-?\d+),(\d+(\.\d*)?)z$/,
      defaultPlaceObj: {
        id: 0,
        name: i18n.t("placeType.place"),
        iconType: "default",
        iconLevel: 1
      },
      markedPlaceObj: {
        id: 0,
        placeType: "marker",
        name: i18n.t("place.marker.place"),
        type: ["marker"],
        iconType: "pin",
        iconLevel: 1
      },
      globalObjKeyArr: ["id", "placeType", "name", "floorId", "level", "buildingId", "location", "areaCoords"],
      transportList: [
        {
          iconName: "walk", 
          travelMode: "walking"
        },
        {
          iconName: "car", 
          travelMode: "driving"
        }
      ]
    }
  },
  computed: {
    ...mapState({
      clientWidth: "clientWidth", 
      clientHeight: "clientHeight"
    })
  },
  methods: {
    loadImage(url) {
      return new Promise(function (resolve, reject) {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = (e) => reject(e)
        image.crossOrigin = ''
        image.src = url
      })
    },

    selectItem(item) {
      console.log(item)
      if (!item.dataType) return
      this.$store.dispatch("search/saveHistoryList", { item, "unifySearchItem": this.unifySearchItem })
      if (item.dataType === 'query') {
        this.$router.push({
          name: "Search",
          params: {
            locationInfo: this.$route.params.locationInfo,
            floorId: this.$route.params.floorId
          },
          query: {
            q: encodeURIComponent(item.name)
          }
        })
      } else {
        if (typeof item.location === "string") {
          try {
            const locationObj = wktToGeoJSON(item.location)
            item["location"] = {
              x: locationObj.coordinates[0],
              y: locationObj.coordinates[1]
            }
          } catch (error) {
            console.log(error)
            item["location"] = null
          }
        }
        if (typeof item.areaCoords === "string") {
          try {
            const areaCoordsObj = wktToGeoJSON(item.areaCoords)
            item["areaCoords"] = areaCoordsObj.coordinates.map(polygon => {
              return polygon.map(pointList => {
                return pointList.map(pointArr => {
                  return {
                    x: pointArr[0],
                    y: pointArr[1]
                  }
                })
              })
            })
          } catch (error) {
            console.log(error)
            item["areaCoords"] = null
          }
        }
        this.$EventBus.$emit("setSelectedPlace", item, true)
      }
    },

    stopBubble(e) { 
      if (e?.stopPropagation) e.stopPropagation()
      else window.event.cancelBubble = true
    },

    stopDefault(e) { 
      if (e?.preventDefault) e.preventDefault()
      else window.event.returnValue = false
      return false
    },

    unifySearchItem(itemList, checkLocale = true) {
      const translationFields = [
        "name",
        "type",
        "department",
        "zone",
        "buildingName",
        "buildingDepartment"
      ]
      const fallbackLocale = i18n.fallbackLocale || "en"
      let currentLocale = i18n.locale || "en"
      currentLocale = new RegExp(/^(en|zh|es)$/).test(currentLocale) ? currentLocale : fallbackLocale
      return itemList.map(e => {
        const item = JSON.parse(JSON.stringify(e || {}))
        let keys = Object.keys(item)
        keys.forEach(key => {
          const re = /_[a-z]{3,}/g
          if (key.match(re)) {
            const newKey = key.replace(re, function($1) {
              return `${$1.charAt(1).toUpperCase()}${$1.substring(2)}`
            })
            item[newKey] = item[key]
            delete item[key]
          }
        })
        if (!item.dataType) item["dataType"] = item.placeType
        if (iconSpriteInfo[item.iconType]) {
          item["color"] = iconSpriteInfo[item.iconType]?.["color"]
          item["icon"] = iconSpriteInfo[item.iconType]?.["icon"]
        } else if (item["dataType"] === "query") {
          item["color"] = "secondary"
          item["icon"] = "search"
        } else if (item["dataType"] === "marker") {
          item["color"] = "danger"
          item["icon"] = item["iconType"]
        }
        if (checkLocale) {
          translationFields.forEach(key => {
            // if (item[key]) return
            if (item.languageCode) currentLocale = item.languageCode
            const value = item[key + "_" + currentLocale] ? item[key + "_" + currentLocale] : item[key + "_" + fallbackLocale]
            if (value != null) item[key] = value
          })
        }
        if (item.type && typeof item.type == "string") item["type"] = item.type.capitalize()
        return item
      })
    },

    getSearchLocation() {
      if (this.$store.state.locationActivated && this.$store.state.geolocation?.lon && this.$store.state.geolocation?.lat) {
        const { x, y } = this.getGeoToImagePoint(this.$store.state.geolocation?.lon, this.$store.state.geolocation?.lat)
        if ((x >= 0 && x <= this.$store.state.imageWidth) && (y >= 0 && y <= this.$store.state.imageHeight)) {
          return `${this.$store.state.geolocation.lat},${this.$store.state.geolocation.lon}`
        }
      }
      if (this.$store.state.centerLocation?.lon && this.$store.state.centerLocation?.lat) {
        return `${this.$store.state.centerLocation.lat},${this.$store.state.centerLocation.lon}`
      }
      return null
    },

    transformPoint(oldX = 0, oldY = 0, rotate = false, reverse = false) {
      if (rotate) {
        return {
          x: reverse ? oldY : this.imageWidth - oldY,
          y: reverse ? this.imageWidth - oldX : oldX
        }
      } else {
        return {
          x: oldX,
          y: oldY
        }
      }
    },

    getImageToCanvasPoint(x = 0, y = 0, rotate = this.rotate) {
      const point = this.transformPoint(x, y, rotate, false)
      point.x = point.x * this.zoom + this.translate.x + this.translateAdaption.x,
      point.y = point.y * this.zoom + this.translate.y + this.translateAdaption.y
      return point
    },

    getCanvasToImagePoint(x = 0, y = 0, rotate = this.rotate) {
      const newX = (x - this.translate.x - this.translateAdaption.x) / this.zoom
      const newY = (y - this.translate.y - this.translateAdaption.y) / this.zoom
      return this.transformPoint(newX, newY, rotate, true)
    },

    getGeoToImagePoint (longitude = 0, latitude = 0) {
      const p1 = campusLocationList[0]
      const p2 = campusLocationList[1]
      const ratioX = (p2["geo"]["lon"] - p1["geo"]["lon"]) / (p2["img"]["x"] - p1["img"]["x"])
      const ratioY = (p2["geo"]["lat"] - p1["geo"]["lat"]) / (p2["img"]["y"] - p1["img"]["y"])
      return {
        x: Math.floor((longitude - p1["geo"]["lon"]) / ratioX) + p1["img"]["x"],
        y: Math.floor((latitude - p1["geo"]["lat"]) / ratioY) + p1["img"]["y"]
      }
    },

    getImageToGeoPoint(x = 0, y = 0) {
      const p1 = campusLocationList[0]
      const p2 = campusLocationList[1]
      const ratioX = (p2["geo"]["lon"] - p1["geo"]["lon"]) / (p2["img"]["x"] - p1["img"]["x"])
      const ratioY = (p2["geo"]["lat"] - p1["geo"]["lat"]) / (p2["img"]["y"] - p1["img"]["y"])
      return {
        lon: p1["geo"]["lon"] + (x - p1["img"]["x"]) * ratioX,
        lat: p1["geo"]["lat"] + (y - p1["img"]["y"]) * ratioY
      }
    },

    checkRouterChange(toPath = "", fromPath = "") {
      return decodeURIComponent(toPath.split(this.urlLocationReg).join("")) !== decodeURIComponent(fromPath.split(this.urlLocationReg).join(""))
    },

    copyText(value) {
      const tag = document.createElement('input');
      tag.setAttribute('id', 'cp_hgz_input');
      tag.value = value;
      document.getElementsByTagName('body')[0].appendChild(tag);
      document.getElementById('cp_hgz_input').select();
      document.execCommand('copy');
      document.getElementById('cp_hgz_input').remove();

      this.$toast({
        message: "Link successfully added to the clipboard!",
        time: 3000
      })
    },

    getDegree(x11, y11, x12, y12, x21, y21, x22, y22) {
      // let a1 = (Math.floor(Math.atan((y11 - y12) / (x11 - x12)) * 180 / Math.PI) + 180) % 180
      // let a2 = (Math.floor(Math.atan((y21 - y22) / (x21 - x22)) * 180 / Math.PI) + 180) % 180
      let a1 = Math.atan((y11 - y12) / (x11 - x12))
      let a2 = Math.atan((y21 - y22) / (x21 - x22))
      // console.log(a1, a2)
      // console.log(a1 * 180 / Math.PI, a2 * 180 / Math.PI)
      // // if (a1 < 0) a1 += Math.PI
      // // if (a2 < 0) a2 += Math.PI
      // console.log(Math.abs(a1 - a2))
      // console.log(Math.abs(a1 - a2) * 180 / Math.PI)
      // console.log((a1 - a2))
      // console.log((a1 - a2) * 180 / Math.PI)
      return a1 - a2
    },

    getDistance(x1, y1, x2, y2) {
      return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1))
    },

    /**
     * @param {Number} degree Rotation degree of a counter-clockwise rotation 
     */
    getRotatedPoint(x = 0, y = 0, degree = 0) {
      return {
        x: x * Math.cos(degree) - y * Math.sin(degree),
        y: x * Math.sin(degree) + y * Math.cos(degree)
      }
    },

    getIdString(e = {}) {
      return `${e.id}${e.floorId == null ? "" : (",f" + e.floorId)}`
    },

    getLocationString(e = {}) {
      let locationStr = `${e.location.x},${e.location.y}`
      if (e.floorId != null) {
        locationStr += `,f${e.floorId}`
      } else if (e.level != null) {
        locationStr += `,${e.level}`
      }
      return locationStr
    },

    isSamePlace(o1 = {}, o2 = {}) {
      return o1.id === o2.id
        && o1.name === o2.name
        && o1.floorId === o2.floorId
        && o1.level === o2.level
        && o1.buildingId === o2.buildingId
        && Math.round((o1.location?.x || 0) * 10) / 10 === Math.round((o2.location?.x || 0) * 10) / 10 
        && Math.round((o1.location?.y || 0) * 10) / 10 === Math.round((o2.location?.y || 0) * 10) / 10
    }
  }
}

export default mixin
