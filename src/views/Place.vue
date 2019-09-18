<template>
  <div class="modal-body" ref="modalBody">
    <div v-if="loading" class="modal-loading">
      <div class="modal-loading-name">{{loadingName}}</div>
      <loading style="width: 100%; height: 90vh; background: transparent;"></loading>
    </div>

    <div class="modal-basic">
      <!-- <div class="modal-basic"> -->
      <div class="modal-basic-header">
        <div class="modal-basic-header-name" :style="{color: displayHeader ? '#F8F8F8' : 'black'}">{{item.name}}</div>
        <div class="iconfont icon-close modal-close" :style="{opacity: displayHeader ? 0 : 1}" @touchend="ontouchendclose"></div>
      </div>
      
      <div class="modal-basic-type">
        <span class="modal-basic-type-dataType">{{$t(`itemType.${item.dataType || ''}`)}}</span><span class="modal-basic-type-itemType">{{item.dataType === 'building' ? item.code : item.type}}</span>
      </div>
    </div>

    <div class="modal-location">
      <div class="iconfont icon-marker modal-location-icon"></div>
      <div class="modal-location-text">{{itemLocation}}</div>
      <router-link v-if="item.dataType === 'building' && item.baseFloorId" class="modal-indoor" tag="button" :to="{ name: 'Map', params: { buildingId: item.id, floorId: item.baseFloorId } }">
        {{$t('place.indoor')}}
      </router-link>
    </div>

    <div class="modal-image-area" v-if="item.imgUrl">
      <div class="modal-image" :style="{'background-image': 'url('+baseUrl+item.imgUrl+')'}">
        <!-- <img src="" alt=""> -->
      </div>
    </div>

    <div v-if="item.dataType === 'room'" class="modal-timetable">
      <div class="modal-timetable-title title">{{$t('place.timetable')}}</div>
      <timetable ref="timetable" :lessons="lessonList"></timetable>
    </div>

    <div v-if="item.dataType === 'building'" class="modal-allocation">
      <div class="modal-allocation-title title">{{$t('place.department')}}</div>
      <div class="modal-allocation-detail">{{departmentAllocation}}</div>
    </div>
  </div>
</template>

<script>
import buildingDict from 'utils/building.json'
import floorDict from 'utils/floor.json'
import vm from 'utils/eventBus'

import Timetable from 'components/Timetable'
import Loading from 'components/Loading'

import { mapState } from 'vuex'

export default {
  components: {
    Timetable,
    Loading
  },
  data () {
    return {
      baseUrl: process.env.VUE_APP_BASE_API + '/static',
      lessonList: [],
      item: {},
      scrollTop: 0,
      loading: true,
      loadingName: ''
    }
  },
  computed: {
    ...mapState({
      displayHeader: state => state.place.displayHeader,
      panelMove: state => state.place.panelMove
    }),
    
    itemLocation () {
      let str
      let building
      let floor
      switch (this.item.dataType) {
        case 'room':
          building = this.item.building || {}
          floor = this.item.floor || {}
          str = `${floorDict[floor.name]}, ${building.name}, ${buildingDict[building.code]}`
          break
        case 'facility':
          building = this.item.building || {}
          floor = this.item.floor || {}
          str = `${floorDict[floor.name]}, ${building.name}, ${buildingDict[building.code]}`
          break
        case 'building':
          str = `${buildingDict[this.item.code || 'FB']}`
      }
      return str
    },

    // itemType () {
    //   const type = this.item.dataType
    //   return type ? type.charAt(0).toUpperCase() + type.slice(1) : ''
    // },

    departmentAllocation () {
      const str = this.item.department
      return str ? str.replace(/,/g, '\n') : 'None'
    }
  },
  methods: {
    async getItemInfo () {
      const {type, id, itemName} = this.$route.params

      this.loading = true
      this.loadingName = itemName
      let data
      try {
        switch (type) {
          case 'room':
            data = await this.$api.room.getRoomInfo(id)
            console.log(data)
            this.item = { ...data.room }
            this.lessonList = data.timetable
            break
          case 'facility':
            data = await this.$api.facility.getFacilityInfo(id)
            console.log(data)
            this.item = { ...data.facility }
            break
          case 'building':
            data = await this.$api.building.getBuildingInfo(id)
            console.log(data)
            this.item = { ...data.building }
            break
        }
        this.item = {
          ...this.item,
          dataType: type
        }
        this.$nextTick(() => {
          this.loading = false
          this.$store.commit('place/setBodyHeight', this.$refs.modalBody.offsetHeight)
        })
      } catch (err) {
        this.$toast({
          message: 'Faild to get item information.\nPlease try again.',
          time: 3000
        })
        this.bodyOverflow = false
        throw err
      }
    },

    ontouchendclose (e) {
      if (!this.panelMove) {
        this.$store.commit('place/setCollapse', true)
        this.stopBubble(e)
      }
    },

    stopBubble (e) { 
      if ( e && e.stopPropagation ) e.stopPropagation()
      else window.event.cancelBubble = true
    }, 
  },
  mounted () {
    if (this.$route.name === 'Place') {
      this.$store.commit('place/setCollapse', false)
      this.getItemInfo()
    }
  },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.$store.commit('place/setCollapse', false)
      vm.$store.commit('place/setDeltaY', 0)
    })
  },
  beforeRouteUpdate (to, from, next) {
    this.$store.commit('place/setCollapse', false)
    this.$store.commit('place/setDeltaY', 0)
    next()
  },
  beforeRouteLeave (to, from, next) {
    this.$store.commit('place/setCollapse', true)
    this.$store.commit('place/setDeltaY', 0)
    next()
  }
}
</script>

<style lang="scss" scoped>
.title {
  font-weight: bold;
}

.modal-close {
  background: #E6E3DF;
  color: #8E8E93;
  font-size: 3vw;
  height: 5vw;
  width: 5vw;
  line-height: 5vw;
  text-align: center;
  vertical-align: middle;
  border-radius: 2.5vw;
  flex-shrink: 0;
}

.modal-body {
  padding: 0 3vw 2vw;
  // width: 94vw;
  width: 100vw;
  height: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  // min-height: 101%;
  // align-items: center;
  
  .modal-basic {
    width: 100%;
    height: auto;
    // background: red;
    padding-bottom: 2vw;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    flex-shrink: 0;

    &-header {
      width: 100%;
      // flex-grow: 1;
      font-size: 4vw;
      display: flex;
      justify-content: space-between;

      &-name {
        line-height: 7vw;
        font-size: 6vw;
        font-weight: bold;
        flex-grow: 1;
      }
    }

    &-type {
      width: 100%;
      margin-top: 2vw;
      color: #8E8E93;
      font-size: 4vw;
      position: relative;
      // display: flex;
      // justify-content: flex-start;
      // align-items: center;

      &-dataType {
        position: relative;
        margin-right: 5vw;
      }

      // &-dataType-show {
      //   margin-right: 5vw;
      // }

      &-dataType:after {
        position: absolute;
        right: -3vw;
        top: 0;
        bottom: 0;
        margin: auto;
        // position: relative;
        // left: 3vw;
        // top: 0;
        // bottom: 0;
        width: 1vw;
        height: 1vw;
        content: "";
        background: #8E8E93;
        border-radius: 0.5vw;
      }

      &-itemType {
        position: relative;
        // margin-left: 5vw;
        word-break: normal; 
        // width: auto; 
        // display: inline-block; 
        white-space: pre-wrap;
        word-wrap: break-word;
        overflow: hidden;
      }

      // &-itemType:before {
      //   position: absolute;
      //   left: -3vw;
      //   top: 0;
      //   bottom: 0;
      //   margin: auto;
      //   width: 1vw;
      //   height: 1vw;
      //   content: "";
      //   background: #8E8E93;
      //   border-radius: 0.5vw;
      // }
    }
  }

  .modal-location {
    width: 100%;
    height: auto;
    padding: 2vw 0;
    color: #8E8E93;
    display: flex;
    align-items: center;
    border-top: 1px #C6C6C6 solid;

    &-icon {
      width: 7vw;
      height: 7vw;
      font-size: 7vw;
      line-height: 7vw;
      flex-shrink: 0;
      // color: blue;
    }

    &-text {
      font-size: 4vw;
      flex-grow: 1;
      margin-left: 4vw;
      line-height: 1.5;
      color: black;
    }
  }

  .modal-indoor {
    margin: 0;
    // padding: 0;
    background-color: transparent;
    background-color: #0069d9;
    color: white;
    // border: 2px solid #D1D1D1;
    outline: none;

    align-self: flex-start;
    padding: 0 4vw;
    // width: auto;
    height: 10vw;
    font-size: 4vw;
    position: relative;
    border-radius: 5vw;
    outline: none;
    border: none;
  }

  .modal-indoor:before {
    font-family: "iconfont";
    content: "\e652";
    font-weight: bold;
    // color: blue;
    color: white;
    margin-right: 1vw;
  }

  .modal-image-area {
    width: 100%;
    height: 56vw;
    padding: 3vw 0;
    border-top: 1px #C6C6C6 solid;
    flex-shrink: 0;

    .modal-image {
      width: 100%;
      height: 50vw;
      background-repeat: no-repeat;
      background-size: cover;
      background-position: center;
      flex-shrink: 0;
    }
  }

  .modal-timetable {
    width: 100%;
    height: auto;
    padding: 2vw 0;
    border-top: 1px #C6C6C6 solid;
    // background: green;
    flex-shrink: 0;

    &-title {
      font-size: 5vw;
      margin-bottom: 2vw;
    }
  }

  .modal-allocation {
    width: 100%;
    height: auto;
    padding: 2vw 0;
    border-top: 1px #C6C6C6 solid;
    flex-shrink: 0;

    &-title {
      font-size: 5vw;
      margin-bottom: 2vw;
    }

    &-detail {
      font-size: 4vw;
      line-height: 1.5;
      white-space: pre-line;
    }
  }
  
}

.modal-loading {
  position: absolute;
  top: 0;
  width: calc(100% - 6vw);
  height: 100vh;
  background: #F8F8F8;
  border-top-left-radius: 5vw;
  border-top-right-radius: 5vw;
  z-index: 3000;
  // padding: 5vw 3vw;
  margin: 0;
  border: none;

  &-name {
    font-size: 4vw;
    line-height: 7vw;
    font-size: 6vw;
    font-weight: bold;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

</style>