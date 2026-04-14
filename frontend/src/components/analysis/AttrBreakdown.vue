<template>
  <section>
    <h3>属性分布</h3>
    <div v-for="(value, key) in breakdown" :key="String(key)">
      {{ key }}：{{ value }}
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ breakdown: Record<string, unknown> }>();
</script>

<style scoped>
section {
  padding: var(--spacing-md);
  background-color: var(--color-bg-container);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}

h3 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border-light);
}

div:last-child {
  border-bottom: none;
}

div span:first-child {
  color: var(--color-text-secondary);
  font-size: var(--font-size-base);
}

div span:last-child {
  color: var(--color-primary);
  font-weight: 600;
  font-size: var(--font-size-base);
}
</style>
