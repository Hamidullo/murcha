<script setup>
import { cn } from "@/lib/utils.js";
</script>

<template>
  <div :class="cn('rounded-xl border border-brand-brown/10 bg-white shadow-sm', $attrs.class)">
    <slot />
  </div>
</template>
