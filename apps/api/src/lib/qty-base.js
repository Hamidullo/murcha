import { ValidationError } from "./errors.js";

/**
 * Kiritilgan birlikni mahsulotning asosiy birligiga o'giradi
 * (`ProductUnit.factor`). `warehouse-docs` va `orders` modullari birgalikda
 * ishlatadi (ikkinchi haqiqiy chaqiruvchi paydo bo'lgani sabab
 * `warehouse-docs.service.js`dan shu faylga chiqarildi).
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {import("../modules/products/product-units.repository.js").ProductUnitsRepository} productUnitsRepository
 * @param {import("@prisma/client").Product} product
 * @param {string} unitId
 * @param {number} qty
 * @returns {Promise<number>}
 */
export async function computeQtyBase(tx, productUnitsRepository, product, unitId, qty) {
  if (unitId === product.baseUnitId) {
    return qty;
  }
  const productUnit = await productUnitsRepository.findByProductAndUnit(tx, product.id, unitId);
  if (!productUnit) {
    throw new ValidationError("Bu birlik mahsulotga ulanmagan");
  }
  return qty * Number(productUnit.factor);
}
