<template>
  <el-card class="summary-card" shadow="hover">
    <template #header>
      <div class="card-header">{{ title }}</div>
    </template>
    <div class="stats-grid">
      <el-statistic title="行数" :value="summary.rowCount" />
      <el-statistic title="数量合计" :value="Number(summary.qtySum)" :precision="2" />
      <el-statistic title="金额合计" :value="Number(summary.amountSum)" :precision="2" prefix="¥" />
    </div>
  </el-card>
</template>

<script setup lang="ts">
defineProps<{ title: string; summary: Record<string, unknown> }>();
</script>

<style scoped>
.summary-card {
  border-radius: var(--radius-md);
}

.card-header {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: var(--spacing-md);
}

.stats-grid :deep(.el-statistic__head) {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.stats-grid :deep(.el-statistic__content) {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-primary);
}
</style>
