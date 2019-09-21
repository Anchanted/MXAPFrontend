<template>
  <div v-if="!simple" class="item">
    <div class="item-container">
      <div class="item-icon">
        <slot name="icon"></slot>
      </div>
      <div class="item-info">
        <div class="item-info-name" :class="type === 'building' ? 'two-line' : 'one-line'">
          <slot name="name"></slot>
        </div>
        <div class="item-info-type one-line">
          <slot name="type"></slot>
        </div>
        <div class="item-info-location one-line">
          <slot name="location"></slot>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="simple-item">
    <div class="simple-item-icon">
      <slot name="icon"></slot>
    </div>
    <div class="simple-item-info">
      <div class="simple-item-info-name one-line">
        <slot name="name"></slot>
      </div>
      <div class="simple-item-info-location one-line">
        <slot name="location"></slot>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    simple: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      required: true
    }
  },
}
</script>

<style lang="scss" scoped>
.item {
  width: 100%;
  height: auto;
  padding: 0 3vw;

  .item-container {
    width: 100%;
    height: auto;
    padding: 2vw 0;
    border-top: 1px #C6C6C6 solid;
    display: flex;
    justify-content: flex-start;
  }

  &-icon {
    width: 12vw;
    height: 12vw;
    text-align: center;
    vertical-align: middle;
    font-size: 7vw;
    line-height: 12vw;
    font-weight: bold;
    color: #FFFFFF;
    background: #0069d9;
    border-radius: 6vw;
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    align-items: center;

    img {
      width: 7vw;
      height: 7vw;
    }
  }

  &-info {
    width: calc(100% - 12vw - 4vw);
    height: 18vw;
    margin-left: 4vw;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    &-name {
      font-size: 5vw;
      line-height: 1.2;
      height: 14vw;
      flex-grow: 1;
    }

    &-type {
      font-size: 3.5vw;
      line-height: 1.5;
      color: #8E8E93;
      flex-shrink: 0;
    }

    &-location {
      font-size: 3.5vw;
      line-height: 1.5;
      color: #8E8E93;
      flex-shrink: 0;
    }
  }
}

.simple-item {
  width: 100%;
  height: auto;
  padding: 2vw 3vw;
  border-bottom: 1px #C6C6C6 solid;
  display: flex;
  justify-content: flex-start;

  &-icon {
    width: 12vw;
    height: 12vw;
    text-align: center;
    vertical-align: middle;
    font-size: 7vw;
    line-height: 12vw;
    font-weight: bold;
    color: #FFFFFF;
    background: #0069d9;
    border-radius: 6vw;
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    align-items: center;

    img {
      width: 7vw;
      height: 7vw;
    }
  }

  &-info {
    width: calc(100% - 12vw - 4vw);
    height: 12vw;
    margin-left: 4vw;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    &-name {
      font-size: 5vw;
      line-height: 1.2;
      height: 7vw;
    }

    &-location {
      font-size: 3.5vw;
      line-height: 1.5;
      color: #8E8E93;
      flex-shrink: 0;
    }
  }
}

.one-line {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.two-line {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
</style>
