<template>
  <section>
    <h3>{{ title }}</h3>
    <div>行数：{{ summary.rowCount }}</div>
    <div>数量合计：{{ summary.qtySum }}</div>
    <div>金额合计：{{ summary.amountSum }}</div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ title: string; summary: Record<string, unknown> }>();
</script>
