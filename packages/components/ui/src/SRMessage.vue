<template>
  <div class="sr-message" :class="[`sr-message--${type}`]" v-if="visible">
    <span class="sr-message__icon">
      <i :class="iconMap[type ?? 'info']"></i>
    </span>
    <span class="sr-message__content">{{ content }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  content: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}>();

const visible = ref(true);
const iconMap = {
  info: 'fa fa-info-circle',
  success: 'fa fa-check-circle',
  warning: 'fa fa-exclamation-triangle',
  error: 'fa fa-times-circle',
};

if (props.duration && props.duration > 0) {
  setTimeout(() => { visible.value = false; }, props.duration);
}
</script>

<style scoped>
.sr-message {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-radius: 8px;
  background: #E0F7FA;
  color: #00838F;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 56, 68, 0.1);
}
.sr-message--success { background: #E8F5E9; color: #2E7D32; }
.sr-message--warning { background: #FFF3E0; color: #F57C00; }
.sr-message--error { background: #FFEBEE; color: #C62828; }
.sr-message__icon { margin-right: 8px; }
</style>
