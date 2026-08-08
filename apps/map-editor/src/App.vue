<template>
  <div class="map-editor">
    <header class="editor-header">
      <h1>🗺️ 海上丝绸之路 - 地图编辑器</h1>
    </header>
    <main class="editor-main">
      <p>地图编辑器工作区域</p>
    </main>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.map-editor { min-height: 100vh; display: flex; flex-direction: column; }
.editor-header {
  background: linear-gradient(135deg, #00838F, #006064);
  color: #fff;
  padding: 12px 24px;
}
.editor-main { flex: 1; padding: 24px; background: #F0F7F8; }
</style>
