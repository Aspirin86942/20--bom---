<template>
  <section class="node-detail-panel">
    <h3>节点详情</h3>
    <p v-if="!node" class="empty">请选择节点查看详情</p>
    <dl v-else class="detail-list">
      <div class="detail-row">
        <dt>料号</dt>
        <dd>{{ valueOf("code") }}</dd>
      </div>
      <div class="detail-row">
        <dt>名称</dt>
        <dd>{{ valueOf("name") }}</dd>
      </div>
      <div class="detail-row">
        <dt>规格</dt>
        <dd>{{ valueOf("spec_model") }}</dd>
      </div>
      <div class="detail-row">
        <dt>版本</dt>
        <dd>{{ valueOf("bom_version") }}</dd>
      </div>
      <div class="detail-row">
        <dt>单位</dt>
        <dd>{{ valueOf("unit") }}</dd>
      </div>
      <div class="detail-row">
        <dt>用量</dt>
        <dd>{{ valueOf("qty_actual") }}</dd>
      </div>
      <div class="detail-row">
        <dt>金额</dt>
        <dd>{{ valueOf("amount") }}</dd>
      </div>
      <div class="detail-row">
        <dt>状态</dt>
        <dd>{{ valueOf("data_status") }}</dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  node: Record<string, unknown> | null;
}>();

function valueOf(field: string): string {
  if (!props.node) {
    return "--";
  }
  const value = props.node[field];
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  return String(value);
}
</script>

<style scoped>
.node-detail-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: var(--color-bg-elevated);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.node-detail-panel h3 {
  margin: 0;
  font-size: var(--font-size-xl);
}

.empty {
  margin: 0;
  color: var(--color-text-secondary);
}

.detail-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.detail-row {
  display: grid;
  grid-template-columns: 68px 1fr;
  gap: var(--spacing-sm);
}

.detail-row dt {
  margin: 0;
  color: var(--color-text-secondary);
}

.detail-row dd {
  margin: 0;
  color: var(--color-text-primary);
  word-break: break-word;
}
</style>
