<template>
  <div class="refresh">
    <span>{{$t('error.refresh.text')}}</span>
    <button @touchend.stop="ontouchend">{{$t('error.refresh.button')}}</button>
  </div>
</template>

<script>
export default {
  methods: {
    ontouchend () {
      this.$emit('refresh')
    }
  }
}
</script>

<style lang="scss" scoped>
.refresh {
  width: 100%;
  height: 100%;
  z-index: 3002;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 5vw;

  span {
    display: block;
    color: #000000;
  }

  button {
    position: relative;
    margin: 2vw 0 0;
    padding: 2vw;
    font-size: 4vw;
    border: none;
    border-radius: 2vw;
    outline: none; 
    color: #FFFFFF;
    background-color: #0069d9;
  }
}
</style>