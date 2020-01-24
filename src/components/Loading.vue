<template>
  <div class="loading-container">
    <spinner-circle></spinner-circle>
  </div>
</template>

<script>
import SpinnerCircle from 'components/Spinner/SpinnerCircle'

export default {
  components: {
    SpinnerCircle
  }
}
</script>

<style style="scss" scoped>
.loading-container {
  background-color:#ffffff;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 299;
  opacity: 1 !important;
}
</style>