<template>
  <transition name="toast">
    <div class="message-box" v-show="show">{{message}}</div>
  </transition>
</template>

<script>
// import { mapState } from 'vuex'
export default {
  name: 'toastMessage',
  data () {
    return {
      message: '',
      show: false
    }
  }
}
</script>

<style lang='scss' scoped>
.message-box {
  position: fixed;
  left: 50%;
  top: 50%;
  -webkit-transform: translateX(-50%) translateY(-50%);               
     -moz-transform: translateX(-50%) translateY(-50%);                
      -ms-transform: translateX(-50%) translateY(-50%);                 
       -o-transform: translateX(-50%) translateY(-50%);                   
          transform: translateX(-50%) translateY(-50%);
  background-color: rgba(0, 0, 0, 0.9);
  color: #fff;
  padding: 2vw;
  font-size: 4vw;
  border-radius: 2vw;
  text-align: center;
  max-width: 100vw;
  z-index: 3000;
  white-space: pre-line;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.5s;
}

.toast-enter,
.toast-leave-to {
  opacity: 0;
}

.toast-enter-to,
.toast-leave {
  opacity: 1;
}
</style>