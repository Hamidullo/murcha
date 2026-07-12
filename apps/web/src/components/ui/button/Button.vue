<script setup>
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils.js";

const variants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-brand-amber text-white hover:bg-brand-amber/90 focus-visible:ring-brand-amber",
        outline: "border border-brand-brown/20 bg-transparent hover:bg-brand-brown/5",
        ghost: "hover:bg-brand-brown/5",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

defineProps({
  variant: { type: String, default: "default" },
  size: { type: String, default: "default" },
  type: { type: String, default: "button" },
});
</script>

<template>
  <button :type="type" :class="cn(variants({ variant, size }))">
    <slot />
  </button>
</template>
