/** HTTP qatlam (CLAUDE.md qatlam qoidasi). */
export class PlatformAuthController {
  /**
   * @param {{ platformAuthService: import("./platform-auth.service.js").PlatformAuthService }} deps
   */
  constructor({ platformAuthService }) {
    this.platformAuthService = platformAuthService;
  }

  /**
   * `POST /api/v1/platform-auth/login`
   * @type {import("express").RequestHandler}
   */
  login = async (req, res, next) => {
    try {
      const result = await this.platformAuthService.login(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
