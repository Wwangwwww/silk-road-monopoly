<template>
  <div class="sr-title-bar">
    <div class="sr-title-bar__left">
      <slot name="left">{{ title }}</slot>
    </div>
    <div class="sr-title-bar__center">
      <slot name="center" />
    </div>
    <div class="sr-title-bar__right">
      <slot name="right" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title?: string }>();
</script>

<style scoped>
.sr-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 20px;
  background: linear-gradient(135deg, #00838f, #00acc1);
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}
.sr-title-bar__left,
.sr-title-bar__right {
  flex: 0 0 auto;
}
.sr-title-bar__center {
  flex: 1;
  text-align: center;
}
</style>
