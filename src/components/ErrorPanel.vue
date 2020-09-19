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
      this.$emit('onclickerrorbutton')
    }
  }
}
</script>

<style lang="scss">
.refresh {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  span {
    display: block;
    padding: 0 2vw;
    color: #888888;
    text-align: center;
    font-size: 5vw;
    // text-align: justify;
    // text-justify: inter-word;
    // word-break: break-all;
  }

  button {
    position: relative;
    margin: 5vw 0 0;
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