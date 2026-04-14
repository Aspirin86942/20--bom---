<template>
  <div class="toolbar">
    <input
      :value="search"
      placeholder="搜索编码/名称"
      @input="
        $emit('update:search', ($event.target as HTMLInputElement).value)
      "
    />
    <button type="button" @click="$emit('expand-all')">全部展开</button>
    <button type="button" @click="$emit('collapse-all')">全部折叠</button>
    <button type="button" @click="$emit('export-current')">
      导出当前结果
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ search: string }>();
defineEmits<{
  "update:search": [value: string];
  "expand-all": [];
  "collapse-all": [];
  "export-current": [];
}>();
</script>
