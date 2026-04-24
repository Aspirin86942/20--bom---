<template>
  <aside v-if="errors.length">
    <h3>导入提示</h3>
    <ul>
      <li v-for="item in groupedErrors" :key="item.key">
        {{ item.code }} - {{ item.message }}<span v-if="item.count > 1">（{{ item.count }} 条）</span>
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
aside {
  padding: var(--spacing-md);
  background-color: #fff7e6;
  border-left: 4px solid var(--color-warning);
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-md);
}

aside:empty {
  display: none;
}

ul {
  margin: 0;
  padding-left: var(--spacing-lg);
  list-style: none;
}

li {
  padding: var(--spacing-sm) 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

li::before {
  content: "⚠";
  margin-right: var(--spacing-sm);
  color: var(--color-warning);
}
</style>
