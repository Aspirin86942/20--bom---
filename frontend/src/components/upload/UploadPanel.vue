<template>
  <div>
    <button type="button" @click="fileInput?.click()">上传 Excel</button>
    <input
      ref="fileInput"
      aria-label="上传 Excel"
      type="file"
      accept=".xlsx"
      @change="handleFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";


const emit = defineEmits<{ select: [file: File] }>();
const fileInput = ref<HTMLInputElement | null>(null);


function handleFileChange(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    emit("select", file);
  }
}
</script>
