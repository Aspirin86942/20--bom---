<template>
  <aside v-if="errors.length" class="error-drawer">
    <span class="error-drawer__title">导入提示</span>
    <ul class="error-drawer__list">
      <li v-for="item in groupedErrors" :key="item.key" class="error-drawer__item">
        <span class="error-drawer__code">{{ item.code }}</span>
        <span class="error-drawer__message">{{ item.message }}</span>
        <span v-if="item.count > 1" class="error-drawer__count">{{ item.count }} 条</span>
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ errors: Array<Record<string, unknown>> }>();

const groupedErrors = computed(() => {
  const groups = new Map<
    string,
    { key: string; code: string; message: string; count: number }
  >();

  for (const item of props.errors) {
    const code = String(item.code ?? "UNKNOWN");
    const message = String(item.message ?? "未提供异常描述");
    const key = `${code}\u0000${message}`;
    const existing = groups.get(key);

    if (existing) {
      existing.count += 1;
      continue;
    }

    groups.set(key, { key, code, message, count: 1 });
  }

  return [...groups.values()];
});
</script>

<style scoped>
.error-drawer {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: 10px var(--spacing-md);
  background-color: #fff7e6;
  border-left: 4px solid var(--color-warning);
  border-radius: var(--radius-sm);
}

.error-drawer:empty {
  display: none;
}

.error-drawer__title {
  flex-shrink: 0;
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text-primary);
}

.error-drawer__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 0;
  flex: 1;
  margin: 0;
  padding: 0;
  list-style: none;
}

.error-drawer__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  line-height: 1.3;
}

.error-drawer__item::before {
  content: "⚠";
  color: var(--color-warning);
}

.error-drawer__code {
  font-weight: 600;
  color: var(--color-text-primary);
}

.error-drawer__message {
  color: var(--color-text-secondary);
}

.error-drawer__count {
  color: var(--color-text-primary);
}

@media (max-width: 1200px) {
  .error-drawer {
    align-items: flex-start;
  }
}
</style>
