/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class PaymentsController {
  /**
   * @param {{ paymentsService: import("./payments.service.js").PaymentsService }} deps
   */
  constructor({ paymentsService }) {
    this.paymentsService = paymentsService;
  }

  /**
   * `POST /api/v1/payments`
   * @type {import("express").RequestHandler}
   */
  create = async (req, res, next) => {
    try {
      const payment = await this.paymentsService.create(req.auth, req.body);
      res.status(201).json(payment);
    } catch (err) {
      next(err);
    }
  };
}
