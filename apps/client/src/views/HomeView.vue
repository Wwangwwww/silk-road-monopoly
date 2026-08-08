<template>
  <div class="home-view">
    <div class="home-view__bg"></div>
    <div class="home-view__content">
      <div class="home-view__logo">
        <h1>🚢 海上丝绸之路</h1>
        <p class="home-view__subtitle">SILK ROAD MONOPOLY</p>
      </div>
      <div class="home-view__actions">
        <button class="sr-btn sr-btn--primary" @click="$router.push('/game')">开始游戏</button>
        <button class="sr-btn sr-btn--secondary">地图编辑</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.home-view {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.home-view__bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #0d3b42 0%, #00838f 50%, #00acc1 100%);
  opacity: 0.9;
}
.home-view__content {
  position: relative;
  text-align: center;
  z-index: 1;
}
.home-view__logo h1 {
  font-size: 48px;
  color: #ffd700;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  margin-bottom: 8px;
}
.home-view__subtitle {
  font-size: 18px;
  color: #e0f7fa;
  letter-spacing: 8px;
  margin-bottom: 48px;
}
.home-view__actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}
.sr-btn {
  width: 240px;
  padding: 14px 32px;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s;
}
.sr-btn--primary {
  background: linear-gradient(135deg, #ffd700, #e8b84b);
  color: #5d4037;
  font-weight: 700;
  box-shadow: 0 4px 20px rgba(255, 215, 0, 0.4);
}
.sr-btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(255, 215, 0, 0.5);
}
.sr-btn--secondary {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
}
.sr-btn--secondary:hover {
  background: rgba(255, 255, 255, 0.25);
}
</style>
