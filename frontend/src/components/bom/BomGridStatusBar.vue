<template>
  <div class="status-bar">
    <span>当前视图：{{ rowCount }} 行</span>
    <span>数量合计：{{ qtySum }}</span>
    <span>金额合计：{{ amountSum }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ rowCount: number; qtySum: string; amountSum: string }>();
</script>

<style scoped>
div {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-md);
  background-color: var(--color-bg-elevated);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

div > span {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

div > span::before {
  content: "•";
  color: var(--color-primary);
  font-size: var(--font-size-lg);
}
</style>
