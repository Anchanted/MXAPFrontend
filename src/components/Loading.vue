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
  width: 100vw;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  background-color:#ffffff;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2999;
}
</style>