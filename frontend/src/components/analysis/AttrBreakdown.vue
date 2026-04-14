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
