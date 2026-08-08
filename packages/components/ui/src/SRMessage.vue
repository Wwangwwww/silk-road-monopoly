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
  setTimeout(() => {
    visible.value = false;
  }, props.duration);
}
</script>

<style scoped>
.sr-message {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-radius: 8px;
  background: #e0f7fa;
  color: #00838f;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 56, 68, 0.1);
}
.sr-message--success {
  background: #e8f5e9;
  color: #2e7d32;
}
.sr-message--warning {
  background: #fff3e0;
  color: #f57c00;
}
.sr-message--error {
  background: #ffebee;
  color: #c62828;
}
.sr-message__icon {
  margin-right: 8px;
}
</style>
