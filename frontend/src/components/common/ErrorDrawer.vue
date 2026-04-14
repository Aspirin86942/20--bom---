<template>
  <aside v-if="errors.length">
    <h3>导入提示</h3>
    <ul>
      <li v-for="item in errors" :key="String(item.code)">
        {{ item.code }} - {{ item.message }}
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
defineProps<{ errors: Array<Record<string, unknown>> }>();
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
