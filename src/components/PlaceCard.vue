<template>
  <div class="item" :class="[{'simple-item': simple}, {'item-selected': selected}]">
    <div class="item-container">
      <div class="item-icon" :class="[`bg-${item.color || 'primary'}`, {'iconfont': isIcon}, isIcon ? `icon-${item.icon || item.dataType}` : 'font-weight-bold']">{{isIcon ? "" : (item.buildingCode || item.code)}}</div>
      <div class="item-info">
        <div class="item-info-name" :class="!simple && item.dataType === 'building' ? 'two-line' : 'one-line'" v-html="(cancelable ? null : item.nameHighlight) || item.name"></div>
        <div class="item-info-type one-line" v-if="!simple && item.dataType !== 'building' && item.dataType !== 'query'">{{item.type}}</div>
        <div class="item-info-address one-line" v-if="item.dataType !== 'query'">{{address}}</div>
      </div>
      <span class="iconfont icon-close item-close" v-if="simple && cancelable"></span>
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
    item: {
      type: Object,
      default: () => ({})
    },
    selected: {
      type: Boolean,
      default: false,
    },
    cancelable: {
      type: Boolean,
      default: false,
    }
  },
  computed: {
    isIcon() {
      return this.item.placeType !== "building" && this.item.placeType !== "room"
    },
    address() {
      let addressArr = []
      const floor = this.item.floorName
      const building = this.item.buildingName
      const zone = this.item.zone || this.item.buildingZone
      const locale = this.item.languageCode || this.$i18n.fallbackLocale
      if (floor) addressArr.push(this.$t("place.floor." + floor, locale))
      if (building) addressArr.push(building)
      addressArr.push(zone?.length === 1 ? this.$t("place.zone." + zone) : zone || this.item.extraInfo?.path)
      if (this.$t("place.address.reverse", locale) === "true") addressArr = addressArr.reverse()
      return addressArr.join(this.$t("place.address.conj", locale))
    }
  }
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
    align-items: center;
  }

  &-icon {
    width: 12vw;
    height: 12vw;
    text-align: center;
    vertical-align: middle;
    font-size: 6vw;
    line-height: 12vw;
    color: #FFFFFF;
    background-color: #0069d9;
    border-radius: 6vw;
    flex-shrink: 0;
  }

  &-info {
    // width: calc(100% - 12vw - 4vw);
    height: 18vw;
    margin-left: 4vw;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    flex-grow: 1;
    overflow: hidden;

    &-name {
      font-size: 5vw;
      line-height: 1.2;
      height: auto;
      flex-grow: 1;
    }

    &-type {
      font-size: 3.5vw;
      line-height: 1.5;
      color: #888888;
      flex-shrink: 0;
    }

    &-address {
      font-size: 3.5vw;
      line-height: 1.5;
      color: #888888;
      flex-shrink: 0;
    }
  }
}

.simple-item {
  padding: 0 0 0 3vw;

  .item-icon {
    width: 8vw;
    height: 8vw;
    font-size: 4vw;
    line-height: 8vw;
    border-radius: 4vw;
  }

  .item-info {
    // width: calc(100% - 8vw - 4vw - 7vw);
    height: 12vw;
    padding-right: 3vw;

    &-name {
      font-size: 5vw;
      flex-grow: 0;
    }
  }
}

.item-close {
  font-size: 4vw;
  line-height: 4vw;
  color: #888888;
  margin-right: 3vw;
  flex-shrink: 0;
}

.item-selected {
  background-color: #E6E3DF;
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
