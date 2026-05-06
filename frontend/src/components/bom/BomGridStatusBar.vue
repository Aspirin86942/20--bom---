<template>
  <section class="status-bar" aria-label="计算与分析汇总">
    <div class="status-bar__toolbar">
      <div class="status-bar__title-group">
        <strong>计算区域</strong>
        <span>当前筛选、焦点节点和框选结果统一收纳到底部</span>
      </div>
      <label class="status-bar__toggle">
        <input
          :checked="includeCollapsedDescendants"
          aria-label="包含折叠子项"
          data-testid="status-include-collapsed-toggle"
          type="checkbox"
          @change="
            $emit(
              'update:includeCollapsedDescendants',
              ($event.target as HTMLInputElement).checked,
            )
          "
        />
        包含折叠子项
      </label>
    </div>

    <div class="status-bar__grid">
      <section
        v-for="section in summarySections"
        :key="section.key"
        :data-testid="`status-${section.key}-summary`"
        class="summary-card"
      >
        <h3>{{ section.title }}</h3>
        <dl class="summary-metrics">
          <div class="metric-item">
            <dt>行数</dt>
            <dd :data-testid="`status-${section.key}-row-count`">
              {{ section.summary.rowCount }}
            </dd>
          </div>
          <div class="metric-item">
            <dt>数量</dt>
            <dd :data-testid="`status-${section.key}-qty-sum`">
              {{ section.summary.qtySum }}
            </dd>
          </div>
          <div class="metric-item">
            <dt>金额</dt>
            <dd :data-testid="`status-${section.key}-amount-sum`">
              {{ section.summary.amountSum }}
            </dd>
          </div>
        </dl>
      </section>

      <section
        class="summary-card summary-card--attr"
        data-testid="status-attr-breakdown"
      >
        <h3>属性分布</h3>
        <div v-if="attrEntries.length" class="attr-list">
          <div
            v-for="[key, value] in attrEntries"
            :key="key"
            class="attr-chip"
            data-testid="status-attr-entry"
          >
            <span class="attr-chip__label">{{ key }}</span>
            <span class="attr-chip__value">{{ value }}</span>
          </div>
        </div>
        <p v-else class="attr-empty">聚焦节点后显示属性金额分布</p>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

type SummarySnapshot = {
  rowCount: number;
  qtySum: string;
  amountSum: string;
};

const props = defineProps<{
  currentSummary: SummarySnapshot;
  focusSummary: SummarySnapshot;
  selectionSummary: SummarySnapshot;
  amountByAttr: Record<string, string>;
  includeCollapsedDescendants: boolean;
}>();

defineEmits<{
  "update:includeCollapsedDescendants": [value: boolean];
}>();

const summarySections = computed(() => [
  {
    key: "current",
    title: "当前范围汇总",
    summary: props.currentSummary,
  },
  {
    key: "focus",
    title: "焦点节点汇总",
    summary: props.focusSummary,
  },
  {
    key: "selection",
    title: "框选结果汇总",
    summary: props.selectionSummary,
  },
]);

const attrEntries = computed(() => Object.entries(props.amountByAttr));
</script>

<style scoped>
.status-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px var(--spacing-md);
  background:
    linear-gradient(180deg, rgba(79, 124, 172, 0.08), transparent 72%),
    var(--color-bg-elevated);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  min-height: 0;
  overflow: visible;
}

.status-bar__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.status-bar__title-group {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.status-bar__title-group strong {
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
}

.status-bar__toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 6px 10px;
  background-color: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: 999px;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.status-bar__toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin: 0;
}

.status-bar__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  min-height: 0;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background-color: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  min-width: 0;
}

.summary-card h3 {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}

.summary-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.metric-item dt {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.metric-item dd {
  margin: 0;
  font-size: var(--font-size-base);
  line-height: 1.2;
  font-weight: 600;
  color: var(--color-primary);
  word-break: break-word;
}

.summary-card--attr {
  justify-content: space-between;
}

.attr-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.attr-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 6px 10px;
  background-color: rgba(79, 124, 172, 0.08);
  border-radius: 999px;
  color: var(--color-text-primary);
}

.attr-chip__label {
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.attr-chip__value {
  color: var(--color-primary);
  font-weight: 600;
}

.attr-empty {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

@media (max-width: 1200px) {
  .status-bar__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .status-bar__grid,
  .summary-metrics {
    grid-template-columns: 1fr;
  }

  .status-bar__title-group {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
