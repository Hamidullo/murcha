/**
 * ECharts uchun umumiy amber-brend uslub yordamchilari — Dashboard/
 * SalesReport/ProductsReport grafiklari bitta joydan qayta ishlatadi
 * (`lib/inventory-cost.js`/`lib/debt-netting.js` bilan bir xil "umumiy
 * hisoblash bitta faylga chiqariladi" naqshi).
 */

export const CHART_COLORS = {
  amber: "#f59e0b",
  brown: "#4a2b12",
  amberLight: "#fbbf24",
  amberPale: "#fde68a",
};

/** @returns {object} silliq gradient bilan to'ldirilgan maydon uslubi (line/area chart uchun) */
export function areaGradientStyle() {
  return {
    color: {
      type: "linear",
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: "rgba(245, 158, 11, 0.35)" },
        { offset: 1, color: "rgba(245, 158, 11, 0)" },
      ],
    },
  };
}

/** @returns {object} ustunlar uchun yumaloq uchli gradient uslub */
export function barGradientStyle() {
  return {
    borderRadius: [6, 6, 0, 0],
    color: {
      type: "linear",
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: CHART_COLORS.amberLight },
        { offset: 1, color: CHART_COLORS.amber },
      ],
    },
  };
}

/** @returns {object} tooltip uchun umumiy uslub (krem fon, jigarrang matn) */
export function tooltipStyle() {
  return {
    trigger: "axis",
    backgroundColor: "#fff8f0",
    borderColor: "rgba(74, 43, 18, 0.1)",
    borderWidth: 1,
    borderRadius: 8,
    textStyle: { color: CHART_COLORS.brown, fontSize: 12 },
    padding: 10,
  };
}

/** @returns {object} yumshoq grid chiziqlar uslubi (x/y o'q uchun umumiy) */
export function axisStyle() {
  return {
    axisLine: { lineStyle: { color: "rgba(74, 43, 18, 0.15)" } },
    axisTick: { show: false },
    axisLabel: { color: "rgba(74, 43, 18, 0.6)", fontSize: 11 },
    splitLine: { lineStyle: { color: "rgba(74, 43, 18, 0.06)" } },
  };
}

/** Donut/pie grafiklar uchun amber-soyali palitra (2-4 bo'lak uchun yetarli). */
export const DONUT_PALETTE = [
  CHART_COLORS.amber,
  CHART_COLORS.brown,
  CHART_COLORS.amberLight,
  CHART_COLORS.amberPale,
];
