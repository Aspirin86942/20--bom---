<template>
  <div class="toolbar">
    <label>
      <span>搜索</span>
      <input
        type="text"
        :value="search"
        aria-label="搜索编码/名称"
        placeholder="搜索编码/名称"
        @input="emitSearchChange"
      />
    </label>
    <div class="filter-group">
      <span>物料属性</span>
      <div class="radio-group">
        <button
          type="button"
          class="radio-button"
          :class="{ active: materialAttr === '' }"
          @click="emitMaterialAttrChange('')"
        >
          全部
        </button>
        <button
          type="button"
          class="radio-button"
          :class="{ active: materialAttr === '外购' }"
          @click="emitMaterialAttrChange('外购')"
        >
          外购
        </button>
        <button
          type="button"
          class="radio-button"
          :class="{ active: materialAttr === '自制' }"
          @click="emitMaterialAttrChange('自制')"
        >
          自制
        </button>
        <button
          type="button"
          class="radio-button"
          :class="{ active: materialAttr === '委外' }"
          @click="emitMaterialAttrChange('委外')"
        >
          委外
        </button>
      </div>
    </div>
    <label>
      <span>金额下限</span>
      <input
        type="text"
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
  materialAttr: string;
  amountMin: string;
}>();

const emit = defineEmits<{
  "update:search": [value: string];
  "update:material-attr": [value: string];
  "update:amount-min": [value: string];
  "expand-all": [];
  "collapse-all": [];
  "export-current": [];
}>();


function emitSearchChange(event: Event): void {
  emit("update:search", (event.target as HTMLInputElement).value);
}


function emitMaterialAttrChange(value: string): void {
  emit("update:material-attr", value);
}


function emitAmountMinChange(event: Event): void {
  emit("update:amount-min", (event.target as HTMLInputElement).value);
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--color-bg-elevated);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  flex-wrap: wrap;
}

label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
}

label span {
  white-space: nowrap;
  font-weight: 500;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
}

.filter-group > span {
  white-space: nowrap;
  font-weight: 500;
}

.radio-group {
  display: inline-flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.radio-button {
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-right: 1px solid var(--color-border);
  background-color: var(--color-bg-base);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s;
}

.radio-button:last-child {
  border-right: none;
}

.radio-button:hover {
  background-color: var(--color-bg-elevated);
}

.radio-button.active {
  background-color: var(--color-primary);
  color: white;
  font-weight: 500;
}

input[type="text"],
input[type="number"] {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-base);
  transition: all 0.3s;
  min-width: 180px;
}

input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-lighter);
}

select {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-base);
  min-width: 120px;
  background-color: var(--color-bg-base);
  cursor: pointer;
}

select:focus {
  outline: none;
  border-color: var(--color-primary);
}

button {
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-base);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  background-color: var(--color-primary);
  color: white;
}

button:hover {
  background-color: var(--color-primary-light);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

button:active {
  transform: translateY(0);
}
</style>
