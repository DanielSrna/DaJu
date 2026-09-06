import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// En los tests no hay API real: se mockea fetch por caso.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("fetch no mockeado en este test");
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});
