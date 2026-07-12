<script setup>
defineProps({ for: { type: String, default: undefined } });
</script>

<template>
  <label :for="$props.for" class="text-sm font-medium text-brand-brown">
    <slot />
  </label>
</template>
