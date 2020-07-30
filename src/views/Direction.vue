<template>
  <div class="direction-page" ref="page">
    <div v-if="errorInfo" class="path-error">
      {{errorInfo}}
      Please try again.
    </div>

    <loading-panel
      v-if="loading"
      :has-error="loadingError"
      class="direction-loading-panel"
      @refresh="searchDirection">
    </loading-panel>
  </div>
</template>

<script>
import LoadingPanel from "components/LoadingPanel"

import { mapState } from 'vuex'

export default {
  name: "Direction",
  components: {
    LoadingPanel
  },
  data() {
    return {
      errorInfo: "",
      loading: false,
      loadingError: false
    }
  },
  computed: {
    ...mapState({
      globalFromText: state => state.direction.globalFromText,
      globalToText: state => state.direction.globalToText,
      globalFromId: state => state.direction.globalFromId,
      globalToId: state => state.direction.globalToId
    }),
  },
  methods: {
    async searchDirection() {
      if (!this.globalFromText || !this.globalToText) return
      this.errorInfo = ""
      this.loading = true
      this.loadingError = false

      try {
        const data = await this.$api.direction.getPath(this.globalFromText, this.globalToText)
        console.log(data)
        const start = data.start
        const end = data.end
        const pathList = data.pathList

        if (typeof(start) === "string") this.errorInfo = start || ""
        else if (typeof(end) === "string") this.errorInfo = end || ""
        else if (typeof(pathList) === "string") this.errorInfo = pathList || ""

        if ((start?.name && start.name !== this.globalFromText) || (end?.name && end.name !== this.globalToText)) {
          this.$router.push({ 
            name: "Direction",
            params: {
              fromPlace: start?.name || this.globalFromText,
              toPlace: end?.name || this.globalToText,
              buildingId: this.$route.params.buildingId,
              floorId: this.$route.params.floorId,
              locationInfo: this.$route.params.locationInfo,
              noRequest: true
            }
          })
        }

        this.$store.commit("direction/setGlobalFromId", start instanceof Object ? `${start.id}|${start.placeType}` : "")
        this.$store.commit("direction/setGlobalToId", end instanceof Object ? `${end.id}|${end.placeType}` : "")
        this.$store.commit("direction/setGlobalPathList", pathList instanceof Array ? pathList : [])

        if (!this.loadingError) this.loading = false
      } catch (error) {
        console.log(error)
        this.loadingError = true
      }
    }
  },
  mounted() {
  },
  beforeRouteEnter(to, from, next) {
    const fromText = to.params.fromPlace?.trim() || ""
    const toText = to.params.toPlace?.trim() || ""
    next(vm => {
      vm.$store.commit('direction/setCollapse', false)
      vm.$store.commit("direction/setGlobalFromText", fromText)
      vm.$store.commit("direction/setGlobalToText", toText)
      vm.$store.commit("direction/clearSelectorRouter")
      if (!fromText || !toText) vm.$store.commit("direction/toSelector", true)
      vm.searchDirection()
    })
  },
  beforeRouteUpdate(to, from, next) {
    const fromText = to.params.fromPlace?.trim() || ""
    const toText = to.params.toPlace?.trim() || ""

    this.$store.commit('direction/setCollapse', false)
    this.$store.commit("direction/setGlobalFromText", fromText)
    this.$store.commit("direction/setGlobalToText", toText)
    if (this.checkRouterChange(to.fullPath, from.fullPath)) {
      this.$store.commit("direction/clearSelectorRouter")
      if (!fromText || !toText) this.$store.commit("direction/toSelector", true)
      if (!to.params.noRequest) this.searchDirection()
    }
    next()
  },
  beforeRouteLeave(to, from, next) {
    this.$store.commit("direction/setRouterLeave", true)
    this.$store.commit('direction/setCollapse', true)
    this.$store.commit("direction/setGlobalFromId", "")
    this.$store.commit("direction/setGlobalToId", "")
    this.$store.commit("direction/setGlobalPathList", [])
    setTimeout(() => {
      this.$store.commit("direction/setGlobalFromText", "")
      this.$store.commit("direction/setGlobalToText", "")
    }, 500)
    next()
  }
}
</script>

<style lang="scss">
.direction-page {
  width: 100%;
  height: auto;
  min-height: 100%;
  background: #F8F8F8;
  position: relative;

  .direction-loading-panel {
    width: 100%; 
    height: 100%; 
    position: absolute; 
    top: 0; 
  }
}
</style>