import { defineStore } from "pinia";
import { ref, computed } from "vue";

/**
 * Savat — faqat lokal holat (server'ga zakaz yaratilgandagina yuboriladi).
 * Bitta savat = bitta sklad (`Order.warehouseId` yagona) — sklad
 * almashtirilsa savat tozalanadi (narxlar sotuv nuqtasining narx turiga
 * bog'liq, lekin qoldiq skladga xos — ikkalasi aralashmasligi uchun).
 */
export const useCartStore = defineStore("cart", () => {
  const warehouseId = ref(null);
  /** @type {import("vue").Ref<Array<{ productId: string, unitId: string, nameUz: string, price: number, qty: number }>>} */
  const items = ref([]);

  const itemCount = computed(() => items.value.reduce((sum, item) => sum + item.qty, 0));
  const subtotal = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.qty, 0),
  );

  /** @param {string} id */
  function setWarehouse(id) {
    if (warehouseId.value && warehouseId.value !== id) {
      items.value = [];
    }
    warehouseId.value = id;
  }

  /**
   * @param {{ productId: string, unitId: string, nameUz: string, price: number }} product
   * @param {number} [qty]
   */
  function addItem(product, qty = 1) {
    const existing = items.value.find((item) => item.productId === product.productId);
    if (existing) {
      existing.qty += qty;
    } else {
      items.value.push({ ...product, qty });
    }
  }

  /**
   * @param {string} productId
   * @param {number} qty
   */
  function updateQty(productId, qty) {
    const item = items.value.find((i) => i.productId === productId);
    if (item) {
      item.qty = qty;
    }
  }

  /** @param {string} productId */
  function removeItem(productId) {
    items.value = items.value.filter((item) => item.productId !== productId);
  }

  function clear() {
    items.value = [];
  }

  return {
    warehouseId,
    items,
    itemCount,
    subtotal,
    setWarehouse,
    addItem,
    updateQty,
    removeItem,
    clear,
  };
});
