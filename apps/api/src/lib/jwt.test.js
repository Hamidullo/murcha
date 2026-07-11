import { describe, it, expect } from "vitest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const { signAccessToken, signPendingToken, verifyToken } = await import("./jwt.js");

describe("jwt", () => {
  it("access token sign+verify — payload va type:access", () => {
    const token = signAccessToken({ userId: "u1", companyId: "c1", roleId: "r1" });
    const decoded = verifyToken(token);

    expect(decoded.userId).toBe("u1");
    expect(decoded.companyId).toBe("c1");
    expect(decoded.roleId).toBe("r1");
    expect(decoded.type).toBe("access");
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });

  it("pending token sign+verify — faqat userId va type:pending", () => {
    const token = signPendingToken({ userId: "u1" });
    const decoded = verifyToken(token);

    expect(decoded.userId).toBe("u1");
    expect(decoded.type).toBe("pending");
    expect(decoded.companyId).toBeUndefined();
  });

  it("buzilgan tokenni rad etadi", () => {
    expect(() => verifyToken("buzilgan.token.qiymati")).toThrow();
  });
});
