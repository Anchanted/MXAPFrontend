<template>
  <div class="button-group-container">
    <div class="top-button-group">
      <!-- Home Button -->
      <div v-if="buttonList.indexOf('home') !== -1" class="home">
        <button class="btn btn-light d-flex flex-column justify-content-around align-items-center home-button" @click="$router.push({ path: '/' })">
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
      <div v-if="buttonList.indexOf('occupy') !== -1" class="occupation dropright">
        <button class="btn btn-light d-flex flex-column justify-content-around align-items-center occupation-button" @click="showOccupiedRoom">
          <img :src="occupiedActivated ? require('assets/images/icon/group.png') : require('assets/images/icon/group-outlined.png')" alt="group">
        </button>
      </div>
    </div>
  </div>
  
</template>

<script>
import '@/../node_modules/bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

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
    }
  },
  data() {
    return {
      occupiedActivated: false
    }
  },
  computed: {
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
            buildingId: floor.buildingId,
            floorId: floor.id,
          }
        })
        e.preventDefault();
        // this.$router.go(0);
      }
    }
  },
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

  .dropdown {
    width: 9vw;
    height: auto;
    margin-top: 2vw;
    /* display: flex;
    justify-content: center; */
    display: inline-block;

    button {
      /* font-size: 1.5rem; */
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

.home, .occupation {
  height: 9vw;
  width: 9vw;
  display: -webkit-box;
  box-sizing: border-box;
  -webkit-box-align: center;
  -webkit-box-pack: center;
  -webkit-box-sizing: border-box;
}

.home-button, .occupation-button {
  box-shadow: 0px 0px 2px 1px rgba(142,142,142,.4);
  -webkit-box-shadow: 0px 0px 2px 1px rgba(142,142,142,.4);
  background: #f8f9fa;
  border-radius: 1vw;
  height: auto;
  width: auto;
  margin: 0px;
  padding: 1vw;
}
</style>
