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
