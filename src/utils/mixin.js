import campusLocationList from "assets/json/campusLocation.json"
import iconSpriteInfo from "assets/json/iconSpriteInfo.json"
import i18n from "locales"
import { mapState } from "vuex"

const mixin = {
  data() {
    return {
      urlLocationReg: /@.*?(\?|$)/,
      markerObj: {
        id: 0,
        placeType: "marker",
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
      console.log(item)
      if (!item.dataType) return
      this.$store.dispatch("search/saveHistoryList", { item, "unifySearchItem": this.unifySearchItem })
      if (item.dataType === 'query') {
        this.$router.push({
          name: "Search",
          params: {
            buildingId: this.$route.params.buildingId,
            floorId: this.$route.params.floorId,
            locationInfo: this.$route.params.locationInfo
          },
          query: {
            q: encodeURIComponent(item.name)
          }
        })
      } else {
        const buildingId = item.building ? item.buildingId : item.building_id
        const floorId = item.floor ? item.floorId : item.floor_id
        console.log(params)
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
            id: `${item.id}`
          }
        })
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
        if (item.type) item["type"] = item.type.capitalize()
        return item
      })
    },

    
    getImageToCanvasPoint({ x = 0, y = 0 }) {
      return {
        x: x * this.scale.x * this.scaleAdaption.x + this.translate.x + this.translateAdaption.x,
        y: y * this.scale.y * this.scaleAdaption.y + this.translate.y + this.translateAdaption.y
      }
    },

    getCanvasToImagePoint({ x = 0, y = 0 }) {
      return {
        x: (x - this.translateAdaption.x - this.translate.x) / (this.scale.x * this.scaleAdaption.x),
        y: (y - this.translateAdaption.y - this.translate.y) / (this.scale.y * this.scaleAdaption.y)
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
    }
  }
}

export default mixin
