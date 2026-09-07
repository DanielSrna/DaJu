import { describe, expect, it } from "vitest";
import { sanitizarHtml } from "@/components/editor/editor-texto";

describe("sanitizarHtml (editor enriquecido)", () => {
  it("conserva los formatos permitidos (h2/h3/negrita/cursiva) y elimina scripts", () => {
    const limpio = sanitizarHtml(
      "<h2>Título</h2><h3>Subtítulo</h3><p>Texto <strong>negrita</strong> y <em>cursiva</em></p><script>alert(1)</script>",
    );
    expect(limpio).toContain("<h2>Título</h2>");
    expect(limpio).toContain("<h3>Subtítulo</h3>");
    expect(limpio).toContain("<strong>negrita</strong>");
    expect(limpio).toContain("<em>cursiva</em>");
    expect(limpio).not.toContain("<script");
  });

  it("elimina atributos peligrosos (onclick) y deja solo font-size", () => {
    const limpio = sanitizarHtml(
      '<p onclick="alert(1)">Hola</p><span style="font-size: 18px; color: red">Grande</span>',
    );
    expect(limpio).not.toContain("onclick");
    expect(limpio).toContain('style="font-size: 18px"');
    expect(limpio).not.toContain("color");
  });
});
