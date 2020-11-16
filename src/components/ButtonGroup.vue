<template>
  <div class="button-group-container" :style="containerStyle">
    <div class="top-left-button-group">
      <!-- Home Button -->
      <div v-if="buttonList.includes('home')" class="home button-container">
        <button class="btn btn-light d-flex flex-column justify-content-around align-items-center home-button button iconfont icon-campus" @click="$router.push({ path: '/' })"></button>
      </div>
      
      <!-- Floor Dropdown -->
      <div v-if="buttonList.includes('floor') && !loading" class="floor">
        <div class="dropdown-building">{{currentBuilding.code}}</div>
        <button type="button" class="btn btn-secondary" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">{{floorName}}<br/><span class="iconfont icon-arrow-left"></span></button>
        <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
          <template v-for="(floor, index) in floorList" >
            <div :key="`d${floor.id}`" v-if="index !== 0" class="dropdown-divider" style="margin: 0"></div>
            <a :key="`a${floor.id}`" class="dropdown-item" href="javascript:void(0)" :class="{ active: floor.id === currentFloor.id }" @click="chooseOtherFloor($event,floor)">{{floor.name}}</a>
          </template>
        </div>
      </div>
    </div>

    <div class="top-right-button-group">
      <!-- Menu Dropdown -->
      <div class="menu button-container">
        <button type="button" class="btn btn-secondary menu-button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
          <div class="bar"></div>
        </button>
        <div class="dropdown-menu">
          <!-- Language Button -->
          <button class="dropdown-item language" type="button" @click="changeLanguage">{{langAbbr}}</button>
          <!-- Help Button -->
          <div class="dropdown-divider" style="margin: 0"></div>
          <button class="dropdown-item iconfont icon-help-outline" type="button" @click="helpButton"></button>
          <!-- Hide Button -->
          <template v-if="!loading">
            <div class="dropdown-divider" style="margin: 0"></div>
            <button class="dropdown-item iconfont icon-hide" type="button" @click="hideButton"></button>
          </template>
        </div>      
      </div>
    </div>

    <div class="bottom-button-group">
      <!-- Compass -->
      <div v-if="buttonList.includes('compass') && !loading" class="compass button-container">
        <img class="compass-img" :src="require('assets/images/icon/compass.svg')" alt="compass"
          :style="{ transform: `rotate(${(currentFloor.direction || 0) + (rotate ? 90 : 0)}deg)` }"
          @click="clickCompass">
        <!-- <img class="compass-img compass-probe" :src="require('assets/images/icon/compass-probe.svg')" alt="compass-probe"
          :style="{ transform: `rotate(${0}deg)` }"> -->
        <svg class="compass-img compass-probe" :style="{ transform: `rotate(${direction || 0}deg)` }"
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" version="1.1" width="200" height="200">
          <path d="M 512 10 l -80 502 l 80 50 l 80 -50 Z" :fill="compassActivated ? '#dddddd' : '#000000'" stroke="#dddddd" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      </div>
      
      <!-- Gate Button -->
      <div v-if="buttonList.includes('gate') && !loading" class="gate button-container" :style="{ 'z-index': gateRequesting ? 1 : null }">
        <button class="btn btn-light d-flex flex-column justify-content-around align-items-center gate-button button iconfont icon-entrance" :style="{ color : gateActivated ? '#007bff' : '#555555' }" @click="clickGate"></button>
      </div>

      <!-- Occupied Room Button -->
      <div v-if="buttonList.includes('occupation') && !loading" class="occupation" :style="{ 'z-index': occupationRequesting ? 1 : null }">
        <div v-if="occupationActivated && occupationTime" class="occupation-time">{{occupationTime}}</div>
        <div class="button-container">
          <button class="btn btn-light d-flex flex-column justify-content-around align-items-center occupation-button button iconfont icon-group" :style="{ color : occupationActivated ? '#007bff' : '#555555' }" @click="clickOccupation"></button>
        </div>
      </div>

      <!-- Location Button -->
      <div v-if="buttonList.includes('location') && !loading" class="location button-container">
        <button class="btn btn-light d-flex flex-column justify-content-around align-items-center location-button button iconfont icon-location" :style="{ color : locationActivated ? '#007bff' : '#555555' }" @click="clickLocation"></button>
      </div>

      <!-- Direction Button -->
      <div v-if="buttonList.includes('direction') && !loading" class="direction button-container">
        <button class="btn btn-light d-flex flex-column justify-content-around align-items-center direction-button button iconfont icon-direction text-primary" :disabled="$route.name === 'Direction'" @click="clickDirecton"></button>
      </div>

      <div v-if="occupationRequesting || gateRequesting" class="occupation-requesting-shade"></div>
    </div>
  </div>
  
</template>

<script>
import '@/../node_modules/bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

import { Settings } from 'luxon'

import { mapState } from 'vuex'

export default {
  props: {
    buttonList: {
      type: Array,
      default: () => []
    },
    currentFloor: Object,
    floorList: {
      type: Array,
      default: () => []
    },
    currentBuilding: {
      type: Object,
      default: () => {}
    },
    occupationTime: String,
    loading: Boolean,
    occupationRequesting: Boolean,
    gateRequesting: Boolean
  },
  data() {
    return {
    }
  },
  computed: {
    ...mapState({
      rotate: state => state.imageRotation,
      direction: state => state.userDirection,
      gateActivated: state => state.button.gateActivated,
      occupationActivated: state => state.button.occupationActivated,
      locationActivated: state => state.button.locationActivated,
      compassActivated: state => state.button.compassActivated
    }),
    containerStyle() {
      let z = 0
      if (this.loading) z = 6
      else if (this.occupationRequesting || this.gateRequesting) z = 3
      return {
        "z-index": z
      }
    },
    floorName() {
      if (!this.currentFloor) {
        if (!this.floorList) return ''
        if (this.floorList.find(floor => floor.index === 0)) {
          return this.floorList.find(floor => floor.name === 0)
        } else {
          return this.floorList.find(floor => floor.name === 1)
        }
      } else
        return this.currentFloor.name;
    },
    langAbbr() {
      const locale = this.$i18n.locale || 'en'
      let abbr
      if (locale.length >= 2) {
        switch (locale.substring(0, 2)) {
          case 'es': abbr = 'ES'; break;
          case 'zh': abbr = 'ZH'; break;
          default: abbr = 'EN'; break;
        }
        return abbr
      }
      return 'en'
    }
  },
  methods: {
    helpButton() {
      window.open("/static/html/guide.html", '_blank')
    },
    hideButton() {
      this.$store.commit("button/setDisplayVirtualButton", true)
    },
    clickGate() {
      this.$store.commit("button/reverseGateActivated")
    },
    clickOccupation() {
      this.$store.commit("button/reverseOccupationActivated")
    },
    clickCompass() {
      this.$store.commit("button/reverseCompassActivated")
    },
    chooseOtherFloor(e, floor) {
      const buildingId = parseInt(this.$route.params.buildingId || 0)
      const buildingIdList = floor.buildingId || []
      if (buildingIdList.find(e => e === buildingId) && floor.id !== this.currentFloor.id){
        this.$router.push({
          name: "Map",
          params: {
            buildingId: buildingId,
            floorId: floor.id,
          }
        })
        e.preventDefault();
        // this.$router.go(0);
      }
    },
    changeLanguage() {
      const langArr = ['EN', 'ZH', 'ES']
      const index = langArr.indexOf(this.langAbbr)
      if (index > -1) {
        this.$i18n.locale = langArr[(index+1)%3].toLowerCase()
        Settings.defaultLocale = this.$i18n.locale
        localStorage.setItem('language', this.$i18n.locale)
        this.$router.go(0)
      }
    },
    clickLocation() {
      this.$store.commit("button/reverseLocationActivated")
    },
    clickDirecton() {
      this.$router.push({
        name: "Direction",
        params: {
          buildingId: this.$route.params.buildingId,
          floorId: this.$route.params.floorId,
          locationInfo: this.$route.params.locationInfo
        },
        query: {
          mode: this.transportList[0].travelMode
        }
      })
    }
  },
  mounted() {
    this.$store.commit("button/setGateActivated", false)
    this.$store.commit("button/setOccupationActivated", false)
    this.$store.commit("button/setLocationActivated", false)
    this.$store.commit("button/setCompassActivated", false)
  },
  watch: {

  }
}
</script>

<style lang="scss" scoped>
// img {
//   height: 7vw;
//   width: 7vw;
// }

.button-group-container {
  // width: 100vw;
  position: relative;
  // top: 0;
  z-index: 0;
}

.top-left-button-group {
  position: fixed;
  height: auto;
  width: auto;
  top: 20px;
  left: 2vw;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;

  .button-container {
    margin-bottom: 2vw;
  }

  .floor {
    width: 9vw;
    height: auto;
    margin-bottom: 2vw;
    /* display: flex;
    justify-content: center; */
    display: inline-block;

    .dropdown-building {
      width: 9vw;
      height: 7vw;
      font-size: 4vw;
      line-height: 6.5vw;
      font-weight: bold;
      background-color: #ffffff;
      color: #6c757d;
      // vertical-align: middle;
      text-align: center;
      border: 0.5vw #6c757d solid;
      border-bottom: none;
      border-radius: 1vw;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }

    button {
      position: relative;
      width: 9vw;
      height: 10vw;
      padding: 0;
      font-size: 4vw;
      line-height: 1.0;
      border-radius: 1vw;
      border-top-left-radius: 0;
      border-top-right-radius: 0;
    }

    span {
      font-size: 2.5vw;
      transform: rotateZ(-90deg);
    }

    .dropdown-menu {
      width: auto;
      max-height: 60vw;
      padding: 0;
      overflow-x: hidden;
      min-width: 0;

      .dropdown-item {
        width: 9vw;
        height: 8vw;
        margin: 0;
        padding: 0;
        line-height: 8vw;
        font-size: 3.5vw;
        text-align: center;
      }
    }

    .dropdown-menu::-webkit-scrollbar {
      display: none;
    }
  }
}

.top-right-button-group {
  position: fixed;
  height: auto;
  width: auto;
  top: 20px;
  right: 2vw;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;

  .button-container {
    margin-bottom: 2vw;
  }

  .menu {
    &-button {
      position: relative;
      width: 9vw;
      height: 9vw;
      padding: 0;

      &:before,
      &:after {
        content: '';
        transform: rotate(0deg);
        transition: transform 0.5s ease;
      }
      .bar,
      &:before,
      &:after {
        position: absolute;
        width: 5vw;
        height: 0.8vw;
        left: 50%;
        margin-left: -2.5vw;
        border-radius: 0.8vw;
        background-color: #ffffff;
      }
      .bar {
        // transition: opacity 0s linear 0.5s;
        opacity: 1;
        top: 50%;
        margin-top: -0.4vw;
      }
      &:before {
        top: 2vw;
      }
      &:after {
        bottom: 2vw;
      }
    }

    &.show {
      .menu-button {
        width: 9vw;
        height: 9vw;
        padding: 0;

        &:before,
        &:after {
          content: '';
          // transition: top 0.5s ease 0.5s, transform 0.5s ease, background-color 0.75s ease 0.25s;
        }
        // .bar,
        // &:before,
        // &:after {
        //   background-color: #000000;
        // }
        .bar {
          opacity: 0;
        }
        &:before {
          transform: translateY(2vw) rotate(45deg);
        }
        &:after {
          transform: translateY(-2vw) rotate(-45deg);
        }
      }
    }

    .dropdown-menu {
      width: auto;
      height: auto;
      min-width: 0;
      padding: 0;
      margin: 0;
      // top: -9vw !important;
      z-index: -1;

      // .dropdown-grid {
      //   width: 18vw;
      //   height: 18vw;
      //   display: grid;
      //   grid-template-columns: repeat(2, 1fr);
      //   grid-template-rows: repeat(2, 1fr);
      // }

      .dropdown-item {
        width: 9vw;
        height: 9vw;
        margin: 0;
        padding: 0;
        line-height: 9vw;
        text-align: center;
        position: relative;
        background: #f8f9fa;
        line-height: 9vw;
        font-size: 5.5vw;
      }

      .language {
        font-size: 4.5vw;
        font-weight: bold;
      }
    }
  }
}

.bottom-button-group {
  position: absolute;
  height: auto;
  width: auto;
  bottom: 2vw;
  right: 2vw;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-end;

  .button-container {
    margin-top: 2vw;
  }

  .occupation {
    >div {
      display: inline-block;
      vertical-align: middle;
    }

    .occupation-time {
      border: 1px black solid;
      border-right: none;
      padding: 0 2vw;
      font-size: 4vw;
      background: #fff;
    }
  }

  .direction {
    button {
      color: #555555;
      // font-size: 5vw;
    }
  }

  .compass {
    position: relative;
    opacity: 0.9;
    margin: none;

    &-img {
      width: 9vw;
      height: 9vw;
      position: absolute;
      top: 0;
      left: 0;
    }

    &-probe {
      pointer-events:none;
    }
  }
}

.button-container {
  height: 9vw;
  width: 9vw;
  display: -webkit-box;
  box-sizing: border-box;
  -webkit-box-align: center;
  -webkit-box-pack: center;
  -webkit-box-sizing: border-box;

  .button {
    box-shadow: 0px 0px 2px 1px rgba(142,142,142,.4);
    -webkit-box-shadow: 0px 0px 2px 1px rgba(142,142,142,.4);
    background: #f8f9fa;
    border-radius: 1vw;
    height: 9vw;
    width: 9vw;
    margin: 0px;
    padding: 0;
    line-height: 9vw;
    font-size: 5.5vw;
  }
}

.occupation-requesting-shade {
  position: fixed; 
  top: 0; 
  left: 0;
  right: 0;
  width: 100vw; 
  height: 100vh; 
  background-color: #000; 
  opacity: 0.5; 
}
</style>
