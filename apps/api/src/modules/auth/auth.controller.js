import { env } from "../../config/env.js";
import { UnauthorizedError } from "../../lib/errors.js";

const COOKIE_NAME = "murcha_rt";

/**
 * @param {import("express").Response} res
 * @param {string} sessionId
 * @param {string} refreshToken
 */
function setSessionCookie(res, sessionId, refreshToken) {
  res.cookie(COOKIE_NAME, `${sessionId}.${refreshToken}`, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
    domain: env.cookieDomain || undefined,
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });
}

/**
 * @param {import("express").Response} res
 */
function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: "/api/v1/auth", domain: env.cookieDomain || undefined });
}

/**
 * @param {import("express").Request} req
 * @returns {{ sessionId: string, refreshToken: string }}
 */
function readSessionCookie(req) {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw || !raw.includes(".")) {
    throw new UnauthorizedError("Sessiya cookie topilmadi");
  }
  const [sessionId, refreshToken] = raw.split(".");
  return { sessionId, refreshToken };
}

/**
 * @param {import("express").Request} req
 * @returns {{ userAgent: string | undefined, ip: string }}
 */
function requestMeta(req) {
  return { userAgent: req.get("user-agent") ?? undefined, ip: req.ip };
}

/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class AuthController {
  /**
   * @param {{ authService: import("./auth.service.js").AuthService }} deps
   */
  constructor({ authService }) {
    this.authService = authService;
  }

  /**
   * `POST /api/v1/auth/register`
   * @type {import("express").RequestHandler}
   */
  register = async (req, res, next) => {
    try {
      const result = await this.authService.registerCompany(req.body, requestMeta(req));
      setSessionCookie(res, result.sessionId, result.refreshToken);
      res.status(201).json({
        status: result.status,
        accessToken: result.accessToken,
        user: result.user,
        company: result.company,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/auth/login`
   * @type {import("express").RequestHandler}
   */
  login = async (req, res, next) => {
    try {
      const result = await this.authService.login(req.body, requestMeta(req));
      if (result.status === "authenticated") {
        setSessionCookie(res, result.sessionId, result.refreshToken);
        res.status(200).json({
          status: result.status,
          accessToken: result.accessToken,
          user: result.user,
          company: result.company,
        });
        return;
      }
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/auth/select-company`
   * @type {import("express").RequestHandler}
   */
  selectCompany = async (req, res, next) => {
    try {
      const result = await this.authService.selectCompany(req.body, requestMeta(req));
      setSessionCookie(res, result.sessionId, result.refreshToken);
      res.status(200).json({
        status: result.status,
        accessToken: result.accessToken,
        user: result.user,
        company: result.company,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/auth/refresh`
   * @type {import("express").RequestHandler}
   */
  refresh = async (req, res, next) => {
    try {
      const cookie = readSessionCookie(req);
      const result = await this.authService.refresh(cookie);
      setSessionCookie(res, result.sessionId, result.refreshToken);
      res.status(200).json({ accessToken: result.accessToken });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/auth/logout`
   * @type {import("express").RequestHandler}
   */
  logout = async (req, res, next) => {
    try {
      const cookie = readSessionCookie(req);
      await this.authService.logout(cookie);
      clearSessionCookie(res);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/auth/sessions`
   * @type {import("express").RequestHandler}
   */
  listSessions = async (req, res, next) => {
    try {
      const cookie = readSessionCookie(req);
      const sessions = await this.authService.listSessions(cookie);
      res.status(200).json({ sessions });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `DELETE /api/v1/auth/sessions/:id`
   * @type {import("express").RequestHandler}
   */
  revokeSession = async (req, res, next) => {
    try {
      const cookie = readSessionCookie(req);
      await this.authService.revokeSession(cookie, req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/auth/me` — `requireAuth` orqali himoyalangan.
   * @type {import("express").RequestHandler}
   */
  me = async (req, res, next) => {
    try {
      const result = await this.authService.getCurrentUser(req.auth);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
