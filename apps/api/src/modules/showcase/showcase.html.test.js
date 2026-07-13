import { describe, it, expect } from "vitest";
import { renderShowcaseHtml } from "./showcase.html.js";

describe("renderShowcaseHtml", () => {
  const baseData = {
    company: { name: "Test Sklad", slug: "test-sklad", brandColor: "#f59e0b", logoUrl: null },
    catalog: [
      { id: "p1", nameUz: "Non", nameRu: null, price: 5000, currency: "UZS", imageUrl: null },
    ],
  };

  it("kompaniya nomi va narxni HTML'ga qo'shadi", () => {
    const html = renderShowcaseHtml(baseData, "https://murcha.uz");

    expect(html).toContain("Test Sklad");
    expect(html).toContain("Non");
    expect(html).toMatch(/5\s000 so'm/);
    expect(html).toContain('<link rel="canonical" href="https://murcha.uz/test-sklad" />');
  });

  it("mahsulot nomidagi HTML belgilarni escape qiladi (XSS)", () => {
    const html = renderShowcaseHtml({
      company: { name: "<script>alert(1)</script>", slug: "x", brandColor: null, logoUrl: null },
      catalog: [],
    });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("bo'sh katalogda ham to'g'ri render qiladi", () => {
    const html = renderShowcaseHtml({
      company: { name: "Bo'sh", slug: "bosh", brandColor: null, logoUrl: null },
      catalog: [],
    });

    expect(html).toContain("Hozircha mahsulot yo'q");
  });

  it("JSON-LD script'ni to'g'ri qo'shadi", () => {
    const html = renderShowcaseHtml(baseData, "https://murcha.uz");

    expect(html).toContain('"@type":"LocalBusiness"');
  });
});
