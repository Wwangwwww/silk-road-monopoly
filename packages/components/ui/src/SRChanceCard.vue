<template>
  <div class="sr-chance-card" :class="[`sr-chance-card--${type}`]">
    <div class="sr-chance-card__header">
      <span>{{ type === 'chance' ? '⚓ 航海事件' : '📜 贸易事件' }}</span>
    </div>
    <div class="sr-chance-card__body">
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  type: 'chance' | 'fate';
}>();
</script>

<style scoped>
.sr-chance-card {
  width: 280px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 56, 68, 0.15);
}
.sr-chance-card--chance .sr-chance-card__header {
  background: linear-gradient(135deg, #00838f, #00acc1);
}
.sr-chance-card--fate .sr-chance-card__header {
  background: linear-gradient(135deg, #e8b84b, #f4d03f);
  color: #5d4037;
}
.sr-chance-card__header {
  padding: 10px 16px;
  color: #fff;
  font-weight: 500;
}
.sr-chance-card__body {
  padding: 16px;
  background: #fff;
}
.sr-chance-card__body h3 {
  font-size: 16px;
  color: #1a3a40;
  margin-bottom: 8px;
}
.sr-chance-card__body p {
  font-size: 13px;
  color: #546e7a;
  line-height: 1.5;
}
</style>
