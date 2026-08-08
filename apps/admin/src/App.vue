<template>
  <div class="admin-app">
    <header class="admin-header">
      <h1>📊 海上丝绸之路 - 管理面板</h1>
    </header>
    <main class="admin-main">
      <p>管理面板内容区域</p>
    </main>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.admin-app {
  min-height: 100vh;
  background: #f0f7f8;
}
.admin-header {
  background: linear-gradient(135deg, #00838f, #006064);
  color: #fff;
  padding: 16px 24px;
}
.admin-main {
  padding: 24px;
}
</style>
