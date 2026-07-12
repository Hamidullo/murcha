<script setup>
import { cn } from "@/lib/utils.js";

defineProps({ type: { type: String, default: "text" } });
const model = defineModel({ type: [String, Number], default: "" });
</script>

<template>
  <input
    v-model="model"
    :type="type"
    :class="
      cn(
        'flex h-10 w-full rounded-md border border-brand-brown/20 bg-white px-3 py-2 text-sm',
        'placeholder:text-brand-brown/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber',
        'disabled:cursor-not-allowed disabled:opacity-50',
        $attrs.class,
      )
    "
  />
</template>
