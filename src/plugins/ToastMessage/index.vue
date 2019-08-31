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
  position: absolute;
  left: 50%;
  top: 50%;
  -webkit-transform: translateX(-50%) translateY(-50%);               
     -moz-transform: translateX(-50%) translateY(-50%);                
      -ms-transform: translateX(-50%) translateY(-50%);                 
       -o-transform: translateX(-50%) translateY(-50%);                   
          transform: translateX(-50%) translateY(-50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 8px;
  font-size: 16px;
  border-radius: 8px;
  text-align: center;
  max-width: 150px;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s;
}

.toast-enter,
.toast-leave-to {
  opacity: 0;
}
</style>