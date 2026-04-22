<template>
  <section class="anomaly-center">
    <h3>异常中心</h3>
    <p class="count">异常总数：{{ items.length }}</p>
    <ul v-if="items.length" class="anomaly-list">
      <li
        v-for="item in items"
        :key="
          String(item.id ?? `${item.code ?? 'UNKNOWN'}-${item.message ?? ''}`)
        "
      >
        <span class="code">{{ String(item.code ?? "UNKNOWN") }}</span>
        <span class="message">{{
          String(item.message ?? "未提供异常描述")
        }}</span>
      </li>
    </ul>
    <p v-else class="empty">当前无异常</p>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  items: Array<Record<string, unknown>>;
}>();
</script>

<style scoped>
.anomaly-center {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: var(--color-bg-elevated);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.anomaly-center h3 {
  margin: 0;
  font-size: var(--font-size-xl);
}

.count,
.empty {
  margin: 0;
  color: var(--color-text-secondary);
}

.anomaly-list {
  margin: 0;
  padding-left: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.anomaly-list li {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.code {
  font-weight: 600;
  color: var(--color-danger);
}

.message {
  color: var(--color-text-primary);
}
</style>
