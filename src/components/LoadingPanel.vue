<template>
  <div class="loading-panel" :class="panelClass">
    <div v-if="!hasError" class="loading-container">
      <spinner-circle></spinner-circle>
    </div>
    <error-panel v-else @onclickerrorbutton="clickErrorButton"></error-panel>
  </div>
</template>

<script>
import SpinnerCircle from 'components/Spinner/SpinnerCircle'
import ErrorPanel from "components/ErrorPanel"

export default {
  props: {
    hasError: {
      type: Boolean,
      default: true
    },
    panelClass: {
      type: String,
      default: ""
    }
  },
  components: {
    SpinnerCircle,
    ErrorPanel
  },
  data () {
    return {
    }
  },
  methods: {
    clickErrorButton () {
      this.$emit("refresh")
    }
  }
}
</script>

<style style="scss">
.loading-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
}

.loading-container {
  margin: 0 auto;
}
</style>