<template>
  <div class="toolbar">
    <label>
      <span>搜索</span>
      <input
        :value="search"
        aria-label="搜索编码/名称"
        placeholder="搜索编码/名称"
        @input="emitSearchChange"
      />
    </label>
    <label>
      <span>物料属性</span>
      <select
        aria-label="物料属性筛选"
        multiple
        @change="emitAttrsChange"
      >
        <option value="自制" :selected="attrs.includes('自制')">自制</option>
        <option value="外购" :selected="attrs.includes('外购')">外购</option>
        <option value="委外" :selected="attrs.includes('委外')">委外</option>
      </select>
    </label>
    <label>
      <span>金额下限</span>
      <input
        :value="amountMin"
        aria-label="金额下限"
        inputmode="decimal"
        placeholder="金额下限"
        @input="emitAmountMinChange"
      />
    </label>
    <button type="button" @click="emit('expand-all')">全部展开</button>
    <button type="button" @click="emit('collapse-all')">全部折叠</button>
    <button type="button" @click="emit('export-current')">
      导出当前结果
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  search: string;
  attrs: string[];
  amountMin: string;
}>();

const emit = defineEmits<{
  "update:search": [value: string];
  "update:attrs": [value: string[]];
  "update:amount-min": [value: string];
  "expand-all": [];
  "collapse-all": [];
  "export-current": [];
}>();


function emitSearchChange(event: Event): void {
  emit("update:search", (event.target as HTMLInputElement).value);
}


function emitAttrsChange(event: Event): void {
  const selectedValues = Array.from(
    (event.target as HTMLSelectElement).selectedOptions,
  ).map((option) => option.value);

  emit("update:attrs", selectedValues);
}


function emitAmountMinChange(event: Event): void {
  emit("update:amount-min", (event.target as HTMLInputElement).value);
}
</script>
