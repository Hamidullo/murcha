import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * shadcn-vue standart utility — class-larni birlashtiradi, Tailwind
 * ziddiyatlarini hal qiladi.
 * @param {...unknown} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
