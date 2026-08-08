<template>
  <div class="lobby-view">
    <SRTitleBar title="🏯 港口大厅" />
    <div class="lobby-view__content">
      <p style="text-align: center; padding: 40px; color: #546e7a">房间列表加载中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SRTitleBar } from '@silk-road-monopoly/ui';
</script>

<style scoped>
.lobby-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.lobby-view__content {
  flex: 1;
  overflow-y: auto;
}
</style>
