<template>
  <div class="button-group-container">
    <div class="top-button-group">
      <!-- Language Button -->
      <div v-if="buttonList.indexOf('language') !== -1" class="language button-container" :style="{ 'z-index': loading ? 500 : null }" >
        <button class="btn btn-light d-flex flex-column justify-content-around align-items-center language-button button" @click="changeLanguage">{{langAbbr}}</button>
      </div>

      <!-- Home Button -->
      <div v-if="buttonList.indexOf('home') !== -1" class="home button-container" style="position: relative;" :style="{ 'z-index': loading ? 500 : null }" >
        <button class="btn btn-light d-flex flex-column justify-content-around align-items-center home-button button" @click="$router.push({ path: '/' })">
          <img :src="require('assets/images/icon/home.png')" alt="home">
        </button>
      </div>
      
      <!-- Dropdown -->
      <div v-if="buttonList.indexOf('floor') !== -1" class="dropdown">
        <button type="button" class="btn btn-secondary" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">{{floorName}}</button>
        <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
          <div v-for="(floor, index) in floorList" :key="floor.id" >
            <div v-if="index !== 0" class="dropdown-divider" style="margin: 0"></div>
            <a class="dropdown-item" href="javascript:void(0)" :class="{ active: floor.id === currentFloor.id }" @click="chooseOtherFloor($event,floor)">{{floor.name}}</a>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-button-group">
      <!-- Occupied Room Button -->
      <div v-if="buttonList.indexOf('occupy') !== -1" class="occupation">
        <div v-if="occupiedActivated && occupationTime" class="occupation-time">{{occupationTime}}</div>
        <div class="button-container">
          <button class="btn btn-light d-flex flex-column justify-content-around align-items-center occupation-button button" @click="showOccupiedRoom">
            <img :src="occupiedActivated ? require('assets/images/icon/group.png') : require('assets/images/icon/group-outlined.png')" alt="group">
          </button>
        </div>
      </div>
    </div>
  </div>
  
</template>

<script>
import '@/../node_modules/bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

import {Settings} from 'luxon'

import { mapState } from 'vuex'

export default {
  // props: ['scale', 'buttonList'],
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
    occupationTime: String
  },
  data() {
    return {
      occupiedActivated: false
    }
  },
  computed: {
    ...mapState(['loading']),
    floorName: function () {
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
    langAbbr () {
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
    showOccupiedRoom: function () {
      this.occupiedActivated = !this.occupiedActivated
      this.$emit('clickOccupiedBtn', this.occupiedActivated);
    },
    hideOccupiedRoom () {
      this.occupiedActivated = false
    },
    chooseOtherFloor: function (e, floor) {
      if (floor.id !== this.currentFloor.id){
        this.$router.push({
          name: 'Map',
          params: {
            buildingId: this.$route.params.buildingId,
            floorId: floor.id,
          }
        })
        e.preventDefault();
        // this.$router.go(0);
      }
    },
    changeLanguage () {
      const langArr = ['EN', 'ZH', 'ES']
      const index = langArr.indexOf(this.langAbbr)
      if (index > -1) {
        this.$i18n.locale = langArr[(index+1)%3].toLowerCase()
        Settings.defaultLocale = this.$i18n.locale
        localStorage.setItem('language', this.$i18n.locale)
        this.$router.go(0)
      }
    }
  },
  watch: {
    occupiedActivated (val) {
      if (val === false) this.$emit('setPDatetime', null)
    }
  }
}
</script>

<style lang="scss" scoped>
img {
  height: 7vw;
  width: 7vw;
}

.button-group-container {
  // width: 100vw;
  position: relative;
  // top: 0;
  z-index: 0;
}

.top-button-group {
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

  .language {
    
    button {
      width: 9vw;
      height: 9vw;
      padding: 0;
      font-size: 4vw;
      line-height: 1.5;
      font-weight: bold;
    }
  }

  .dropdown {
    width: 9vw;
    height: auto;
    /* display: flex;
    justify-content: center; */
    display: inline-block;

    button {
      width: 9vw;
      height: 9vw;
      padding: 0;
      font-size: 4vw;
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

.bottom-button-group {
  position: absolute;
  height: auto;
  width: auto;
  bottom: 2vw;
  right: 2vw;
  display: inline-block;
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
    height: auto;
    width: auto;
    margin: 0px;
    padding: 1vw;
  }
}

.occupation-time {
  border: 1px black solid;
  border-right: none;
  padding: 0 2vw;
  font-size: 4vw;
  background: #fff;
}

.occupation {

  >div {
    display: inline-block;
    vertical-align: middle;
  }
}

// .home, .occupation {
//   height: 9vw;
//   width: 9vw;
//   display: -webkit-box;
//   box-sizing: border-box;
//   -webkit-box-align: center;
//   -webkit-box-pack: center;
//   -webkit-box-sizing: border-box;
// }

// .home-button, .occupation-button {
//   box-shadow: 0px 0px 2px 1px rgba(142,142,142,.4);
//   -webkit-box-shadow: 0px 0px 2px 1px rgba(142,142,142,.4);
//   background: #f8f9fa;
//   border-radius: 1vw;
//   height: auto;
//   width: auto;
//   margin: 0px;
//   padding: 1vw;
// }
</style>
