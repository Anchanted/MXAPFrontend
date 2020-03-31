<template>
  <div class="modal-body" ref="modalBody">
    <div class="modal-basic">
      <!-- <div class="modal-basic"> -->
      <div class="modal-basic-name" :style="{color: displayHeader ? '#F8F8F8' : 'black'}">{{item.name}}</div>
      
      <div class="modal-basic-type">
        <span class="modal-basic-type-dataType">{{$t(`itemType.${item.dataType || ''}`)}}</span><span class="modal-basic-type-itemType"><b>&nbsp;&nbsp;·&nbsp;&nbsp;</b>{{basicItemType}}</span>
      </div>
    </div>

    <div class="modal-location">
      <div class="iconfont icon-marker modal-location-icon"></div>
      <div class="modal-location-text">{{itemLocation}}</div>
      <router-link v-if="item.dataType === 'building' && item.baseFloorId" class="modal-indoor" tag="button" :to="{ name: 'Map', params: { buildingId: item.id, floorId: item.baseFloorId } }">
        {{$t('place.indoor')}}
      </router-link>
    </div>

    <div v-if="item.imgUrl" class="modal-image-area">
      <div class="modal-image" :style="{'background-image': 'url('+baseUrl+item.imgUrl+')'}">
        <!-- <img src="" alt=""> -->
      </div>
    </div>

    <div v-if="item.phone || item.email" class="modal-section modal-contact">
      <div class="title">{{$t('place.contact')}}</div>
      <div v-if="item.phone" class="modal-contact-section">
        <div class="iconfont icon-phone modal-contact-section-icon"></div>
        <div>
          <span v-for="(e, index) in item.phone" :key="index" style="display: block;">+86&nbsp;<a :href="`tel:${e}`">{{e}}</a></span>
        </div>
      </div>
      <div v-if="item.email" class="modal-contact-section">
        <div class="iconfont icon-mail modal-contact-section-icon"></div>
        <div>
          <a v-for="(e, index) in item.email" :key="index" style="display: block;" :href="`mailto:${e}`">{{e}}</a>
        </div>
      </div>
    </div>

    <div v-if="item.dataType === 'room' && lessonList.length > 0" class="modal-section modal-timetable">
      <div class="title">{{$t('place.timetable')}}</div>
      <timetable ref="timetable" :lessons="lessonList"></timetable>
    </div>

    <div v-if="item.dataType === 'building'" class="modal-section modal-allocation">
      <div class="title">{{$t('place.department')}}</div>
      <div class="modal-allocation-detail">{{departmentAllocation}}</div>
    </div>

    <div v-if="item.description" class="modal-section modal-description">
      <div class="title">{{$t('place.description')}}</div>
      <div class="modal-description-text" v-html="itemDescription"></div>
    </div>

    <div v-if="loading" class="modal-loading">
      <div class="modal-loading-header">{{headerName}}</div>
      <loading-panel
        :has-error="loadingError"
        class="place-loading-panel"
        @refresh="getItemInfo">
      </loading-panel>
    </div>
  </div>
</template>

<script>
import Timetable from 'components/Timetable'
import LoadingPanel from "components/LoadingPanel"

import { mapState } from 'vuex'

export default {
  components: {
    Timetable,
    LoadingPanel
  },
  data () {
    return {
      baseUrl: process.env.VUE_APP_BASE_API + '/static',
      lessonList: [],
      item: {},
      scrollTop: 0,
      loading: true,
      loadingName: '',
      loadingError: false,
    }
  },
  computed: {
    ...mapState({
      displayHeader: state => state.place.displayHeader,
      headerName: state => state.place.headerName
    }),
    
    itemLocation () {
      let str
      let building
      let floor
      let zone
      switch (this.item.dataType) {
        case 'room':
          building = this.item.building || {}
          floor = this.item.floorInfo || []
          zone = this.item.zone || "b"
          str = `${floor.map(e => this.$t("place.floor." + e.floorName || "GF")).join(this.$t("place.floor.conj"))}, ${building.name}, ${this.$t("place.zone." + zone)}`
          break
        case 'facility': {
          building = this.item.building || {}
          floor = this.item.floor || {}
          zone = this.item.zone || "b"
          const locationArr = []
          if (floor.name) locationArr.push(this.$t("place.floor." + floor.name))
          if (building.name) locationArr.push(building.name)
          locationArr.push(this.$t("place.zone." + zone))
          str = locationArr.join(', ')
          break
        }
        case 'building':
          zone = this.item.zone || "b"
          str = `${this.$t("place.zone." + zone)}`
          break
      }
      return str
    },

    basicItemType () {
      if (this.item.dataType === 'building') return this.item.code 
      if (!!this.item.type && this.item.type instanceof Array) return this.item.type.map(e => e && e.capitalize()).join(', ')
      return null
    },

    departmentAllocation () {
      const str = this.item.department
      return str ? str.replace(/,/g, '\n') : 'None'
    },

    itemDescription () {
      return this.item.description.replace(/\\n/g, "<br />")
    }
  },
  methods: {
    async getItemInfo () {
      const {type, id} = this.$route.params

      this.loadingError = false
      this.loading = true
      let data
      try {
        switch (type) {
          case 'room':
            data = await this.$api.room.getRoomInfo(id)
            console.log(data)
            if (!data.room) throw new Error('Data Not Found')
            this.item = { ...data.room }
            this.lessonList = data.timetable || []
            break
          case 'facility':
            data = await this.$api.facility.getFacilityInfo(id)
            console.log(data)
            if (!data.facility) throw new Error('Data Not Found')
            this.item = { ...data.facility }
            break
          case 'building':
            data = await this.$api.building.getBuildingInfo(id)
            console.log(data)
            if (!data.building) throw new Error('Data Not Found')
            this.item = { ...data.building }
            break
        }
        this.item = {
          ...this.item,
          dataType: type
        }
        this.$store.commit("place/setHeaderName", this.item.name)
      } catch (err) {
        console.log(err)
        this.$toast({
          message: err.message || 'Failed to get item information.\nPlease try again.',
          time: 3000
        })
        this.bodyOverflow = false
        this.loadingError = true
      } finally {
        if (!this.loadingError) this.loading = false
        this.$nextTick(() => {
          this.$store.commit('place/setBodyHeight', this.$refs.modalBody.offsetHeight)
        })
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
    })
  },
  beforeRouteUpdate (to, from, next) {
    this.$store.commit('place/setCollapse', false)
    next()
  },
  beforeRouteLeave (to, from, next) {
    this.$store.commit('place/setCollapse', true)
    next()
  }
}
</script>

<style lang="scss" scoped>
.title {
  font-weight: bold;
  font-size: 5vw;
  margin-bottom: 1vw;
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
  min-height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  // min-height: 101%;
  // align-items: center;
  
  .modal-basic {
    width: calc(100% - 5vw);
    height: auto;
    // background: red;
    padding-bottom: 2vw;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    flex-shrink: 0;

    &-name {
      width: 100%;
      line-height: 7vw;
      font-size: 6vw;
      font-weight: bold;
    }

    &-type {
      width: 100%;
      margin-top: 2vw;
      color: #8E8E93;
      font-size: 4vw;
      position: relative;

      span {
        display: inline;
      }

      &-dataType {
        // position: relative;
        // margin-right: 5vw;
      }

      &-itemType {
        // position: relative;
        // margin-left: 5vw;
        // word-break: normal; 
        // width: auto; 
        // display: inline-block; 
        // white-space: pre-wrap;
        // word-wrap: break-word;
        // overflow: hidden;
      }
    }
  }

  .modal-location {
    width: 100%;
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
    content: "\e61b";
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

  .modal-section {
    width: 100%;
    height: auto;
    padding: 1.5vw 0 1vw;
    border-top: 1px #C6C6C6 solid;
    flex-shrink: 0;
  }

  .modal-contact {

    &-section {
      font-size: 4vw;
      line-height: 2;
      padding: 0 2vw 1vw;
      vertical-align: middle;
      display: flex;
      align-items: center;

      &-icon {
        font-size: 5vw;
        line-height: 8vw;
        color: #8E8E93;
        font-weight: bold;
        margin-right: 5vw;
      }

      // a {
      //   text-decoration: none;
      //   color: inherit;
      // }
    }
  }

  .modal-description {

    &-text {
      font-size: 4vw;
      line-height: 1.5;
      // white-space: pre-line;
      word-wrap: break-word;
      // word-break: normal;
    }
  }

  .modal-timetable {

  }

  .modal-allocation {
    
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
  height: 100%;
  background: #F8F8F8;
  margin: 0;
  border: none;

  &-header {
    position: absolute;
    top: 0;
    width: calc(100% - 5vw);
    font-size: 4vw;
    line-height: 7vw;
    font-size: 6vw;
    font-weight: bold;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    z-index: 1;
  }
  
  .place-loading-panel {
    width: 100%; 
    height: 100%;
  }
}

</style>