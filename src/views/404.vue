<template>
  <div class="pagenotfound">
    <div class="code">404</div>
    <img class="image" :src="image" alt="404">
    <div class="text">{{$t('pageNotFound.text')}}<router-link :to="{ path: '/' }" tag="a">{{$t('pageNotFound.link')}}</router-link></div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      image: require("assets/images/404.jpeg")
    }
  }
}
</script>

<style lang="scss">
.pagenotfound {
  width: 100vw;
  height: 100vh;
  background-color: rgb(159, 194, 200);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  .code {
    font-size: 20vw;
    font-weight: bold;
    line-height: 1;
    color: rgb(44, 32, 0);
    margin-bottom: 50px;
    letter-spacing: 20px;
  }

  .image {
    width: 80vw;
    height: auto;
  }

  .text {
    font-size: 4vw;
    line-height: 2;
    margin: 50px 0;
  }
}
</style>
