<template>
  <el-upload
    class="upload-panel"
    :class="{ 'upload-panel--compact': compact }"
    :drag="!compact"
    accept=".xlsx"
    :auto-upload="false"
    :show-file-list="false"
    :on-change="handleFileChange"
    aria-label="上传 Excel"
  >
    <template v-if="compact">
      <div class="upload-panel__compact">
        <el-icon class="upload-panel__compact-icon"><upload-filled /></el-icon>
        <span class="upload-panel__compact-title">重新导入 Excel</span>
        <span class="upload-panel__compact-hint">点击替换当前数据</span>
      </div>
    </template>
    <template v-else>
      <el-icon class="upload-icon"><upload-filled /></el-icon>
      <div class="upload-text">点击或拖拽 Excel 文件到此处</div>
      <div class="upload-hint">支持 .xlsx 格式的 BOM 文件</div>
    </template>
  </el-upload>
</template>

<script setup lang="ts">
import { UploadFilled } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import type { UploadFile } from "element-plus";

withDefaults(
  defineProps<{
    compact?: boolean;
  }>(),
  {
    compact: false,
  },
);

const emit = defineEmits<{ select: [file: File] }>();


function handleFileChange(uploadFile: UploadFile): void {
  console.log("[UploadPanel] 文件选择:", uploadFile);

  if (!uploadFile.raw) {
    console.warn("[UploadPanel] 没有原始文件对象");
    return;
  }

  // 文件类型验证
  const fileName = uploadFile.name.toLowerCase();
  if (!fileName.endsWith('.xlsx')) {
    console.warn("[UploadPanel] 文件类型不支持:", fileName);
    ElMessage.error('仅支持 .xlsx 格式的 Excel 文件');
    return;
  }

  // 文件大小验证（50MB）
  const maxSize = 50 * 1024 * 1024;
  if (uploadFile.size && uploadFile.size > maxSize) {
    console.warn("[UploadPanel] 文件过大:", uploadFile.size);
    ElMessage.error('文件大小不能超过 50MB');
    return;
  }

  console.log("[UploadPanel] 文件验证通过，触发 select 事件");
  emit("select", uploadFile.raw);
}
</script>

<style scoped>
.upload-panel {
  width: 100%;
}

.upload-panel :deep(.el-upload) {
  width: 100%;
}

.upload-panel--compact :deep(.el-upload) {
  display: block;
}

.upload-panel :deep(.el-upload-dragger) {
  padding: var(--spacing-xl) var(--spacing-lg);
  border-radius: var(--radius-lg);
  border: 2px dashed var(--color-border);
  background-color: var(--color-bg-elevated);
  transition: all 0.3s;
}

.upload-panel :deep(.el-upload-dragger:hover) {
  border-color: var(--color-primary);
  background-color: var(--color-primary-lighter);
}

.upload-icon {
  font-size: 48px;
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-sm);
}

.upload-text {
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.upload-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.upload-panel--compact :deep(.el-upload) {
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-elevated);
  transition: all 0.3s;
}

.upload-panel--compact :deep(.el-upload:hover) {
  border-color: var(--color-primary);
  background-color: var(--color-primary-lighter);
}

.upload-panel__compact {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  min-height: 44px;
  padding: 0 var(--spacing-md);
  color: var(--color-text-secondary);
}

.upload-panel__compact-icon {
  font-size: 16px;
  color: var(--color-text-tertiary);
}

.upload-panel__compact-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.upload-panel__compact-hint {
  font-size: var(--font-size-sm);
}
</style>
