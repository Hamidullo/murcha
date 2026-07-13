import { withoutTenant } from "../../lib/tenant-context.js";
import { verifyPassword } from "../../lib/password.js";
import { signPlatformAccessToken } from "../../lib/jwt.js";
import { UnauthorizedError, ForbiddenError } from "../../lib/errors.js";

const MAX_LOGIN_ATTEMPTS = 5;

/**
 * @param {string} phone
 * @returns {string}
 */
function attemptsKey(phone) {
  return `platform:${phone}`;
}

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). `auth.service.js login()`dagi
 * bilan bir xil naqsh (`withoutTenant`, brute-force himoya, `verifyPassword`),
 * lekin kompaniyaga umuman bog'lanmaydi — `user.isPlatformAdmin` tekshiradi.
 * Refresh-token/Redis-sessiya ataylab qo'shilmagan (MVP soddalashtirish,
 * `BACKLOG.md`) — `signPlatformAccessToken()`ning uzunroq TTL'i yetarli.
 */
export class PlatformAuthService {
  /**
   * @param {{
   *   usersRepository: import("../users/users.repository.js").UsersRepository,
   *   loginAttemptsRepository: import("../auth/login-attempts.repository.js").LoginAttemptsRepository,
   * }} deps
   */
  constructor({ usersRepository, loginAttemptsRepository }) {
    this.usersRepository = usersRepository;
    this.loginAttemptsRepository = loginAttemptsRepository;
  }

  /**
   * @param {import("@murcha/shared").loginSchema._type} dto
   * @returns {Promise<{ accessToken: string, user: { id: string, phone: string, fullName: string } }>}
   */
  async login(dto) {
    const key = attemptsKey(dto.phone);
    const attempts = await this.loginAttemptsRepository.getFailureCount(key);
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      throw new ForbiddenError(
        "Juda ko'p noto'g'ri urinish — 15 daqiqadan keyin qayta urinib ko'ring",
      );
    }

    const user = await withoutTenant((tx) => this.usersRepository.findByPhone(tx, dto.phone));
    if (!user || !user.isPlatformAdmin) {
      await this.loginAttemptsRepository.recordFailure(key);
      throw new UnauthorizedError("Telefon yoki parol noto'g'ri");
    }
    const passwordOk = await verifyPassword(user.passwordHash, dto.password);
    if (!passwordOk) {
      await this.loginAttemptsRepository.recordFailure(key);
      throw new UnauthorizedError("Telefon yoki parol noto'g'ri");
    }
    await this.loginAttemptsRepository.reset(key);

    const accessToken = signPlatformAccessToken({ userId: user.id });
    return {
      accessToken,
      user: { id: user.id, phone: user.phone, fullName: user.fullName },
    };
  }
}
