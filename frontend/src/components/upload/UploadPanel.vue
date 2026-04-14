<template>
  <el-upload
    class="upload-panel"
    drag
    accept=".xlsx"
    :auto-upload="false"
    :show-file-list="false"
    :on-change="handleFileChange"
  >
    <el-icon class="upload-icon"><upload-filled /></el-icon>
    <div class="upload-text">点击或拖拽 Excel 文件到此处</div>
    <div class="upload-hint">支持 .xlsx 格式的 BOM 文件</div>
  </el-upload>
</template>

<script setup lang="ts">
import { UploadFilled } from "@element-plus/icons-vue";
import type { UploadFile } from "element-plus";


const emit = defineEmits<{ select: [file: File] }>();


function handleFileChange(uploadFile: UploadFile): void {
  if (uploadFile.raw) {
    emit("select", uploadFile.raw);
  }
}
</script>

<style scoped>
.upload-panel {
  width: 100%;
}

.upload-panel :deep(.el-upload) {
  width: 100%;
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
</style>
