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
