<template>
  <footer class="status-bar">
    <span>当前视图：{{ rowCount }} 行</span>
    <span>数量合计：{{ qtySum }}</span>
    <span>金额合计：{{ amountSum }}</span>
  </footer>
</template>

<script setup lang="ts">
defineProps<{ rowCount: number; qtySum: string; amountSum: string }>();
</script>
