<template>
  <section>
    <h3>框选结果汇总</h3>
    <div>行数：{{ summary.rowCount }}</div>
    <div>数量合计：{{ summary.qtySum }}</div>
    <div>金额合计：{{ summary.amountSum }}</div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ summary: Record<string, unknown> }>();
</script>

<style scoped>
section {
  padding: var(--spacing-md);
  background-color: var(--color-primary-lighter);
  border-radius: var(--radius-md);
  border-left: 4px solid var(--color-primary);
}

h3 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-primary-dark);
}

div {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-xs) 0;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}

div span:last-child {
  font-weight: 600;
}
</style>
