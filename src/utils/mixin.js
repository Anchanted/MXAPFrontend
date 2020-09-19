import translationFields from "assets/json/searchTranslationFields.json"
import campusLocationList from "assets/json/campusLocation.json"
import i18n from "locales"
import { mapState } from "vuex"

const mixin = {
  data() {
    return {
      urlLocationReg: /@.*?(\?|$)/,
      markerObj: {
        id: 0,
        placeType: "place",
        name: i18n.t("place.marker.place"),
        type: ["marker"],
        iconType: "pin",
        iconLevel: 1
      },
      globalObjKeyArr: ["location", "id", "placeType", "name", "buildingId", "floorId", "level"],
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
    selectItem(item) {
      if (!item.dataType) return
      this.$store.dispatch("search/saveHistoryList", { item, "unifySearchItem": this.unifySearchItem })
      if (item.dataType === 'query') {
        this.$router.push({
          name: 'Search',
          query: {
            q: encodeURIComponent(item.content)
          },
          params: {
            buildingId: this.$route.params.buildingId,
            floorId: this.$route.params.floorId,
            locationInfo: this.$route.params.locationInfo
          }
        })
      } else {
        const buildingId = item.building ? item.buildingId : item.building_id
        const floorId = item.floor ? item.floorId : item.floor_id
        let params = {
          buildingId,
          floorId
        }
        if (`b${this.$route.params.buildingId || ""}f${this.$route.params.floorId || ""}` === `b${buildingId || ""}f${floorId || ""}`) {
          params = {
            ...params,
            locationInfo: this.$route.params.locationInfo,
            adjustPosition: true
          }
        }
        this.$router.push({
          name: "Place",
          params,
          query: {
            id: `${item.id}`,
            type: item.dataType
          }
        })
      }
    },

    stopBubble(e) { 
      if ( e?.stopPropagation ) e.stopPropagation()
      else window.event.cancelBubble = true
    },

    stopDefault(e) { 
      if ( e?.preventDefault ) e.preventDefault()
      else window.event.returnValue = false
      return false
    },

    unifySearchItem(itemList) {
      const fallbackLocale = i18n.fallbackLocale || "en"
      let currentLocale = i18n.locale || "en"
      currentLocale = new RegExp(/^(en|zh|es)$/).test(currentLocale) ? currentLocale : fallbackLocale
      return itemList.map(e => {
        const item = JSON.parse(JSON.stringify(e || {}))
        if (new RegExp(/^(building|facility|room)$/).test(item.dataType || item.placeType)) {
          if (!item.dataType) item["dataType"] = item.placeType
          const fieldList = translationFields[item.dataType] || []
          fieldList.forEach(field => {
            // if (item[field]) return
            if (item.languageCode) currentLocale = item.languageCode
            item[field] = item[field + "_" + currentLocale] ? item[field + "_" + currentLocale] : item[field + "_" + fallbackLocale]
          })
        }
        return item
      })
    },

    
    getImageToCanvasPoint({ x = 0, y = 0 }) {
      return {
        x: x * this.scale.x * this.scaleAdaption + this.position.x + this.positionAdaption.x,
        y: y * this.scale.y * this.scaleAdaption + this.position.y + this.positionAdaption.y
      }
    },

    getCanvasToImagePoint({ x = 0, y = 0 }) {
      return {
        x: (x - this.positionAdaption.x - this.position.x) / (this.scale.x * this.scaleAdaption),
        y: (y - this.positionAdaption.y - this.position.y) / (this.scale.y * this.scaleAdaption)
      }
    },

    getGeoToImagePoint ({ longitude, latitude }) {
      const p1 = campusLocationList[0]
      const p2 = campusLocationList[1]
      const ratio = {
        x: (p2["geo"]["longitude"] - p1["geo"]["longitude"]) / (p2["image"]["x"] - p1["image"]["x"]),
        y: (p2["geo"]["latitude"] - p1["geo"]["latitude"]) / (p2["image"]["y"] - p1["image"]["y"])
      }
      return {
        x: Math.floor((longitude - p1["geo"]["longitude"]) / ratio.x) + p1["image"]["x"],
        y: Math.floor((latitude - p1["geo"]["latitude"]) / ratio.y) + p1["image"]["y"]
      }
    },

    checkRouterChange(toPath = "", fromPath = "") {
      return decodeURIComponent(toPath.split(this.urlLocationReg).join("")) !== decodeURIComponent(fromPath.split(this.urlLocationReg).join(""))
    }
  }
}

export default mixin
