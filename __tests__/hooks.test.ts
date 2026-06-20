import { useBoolean, useCounter, useToggle, usePrevious, useMountedRef } from "../src/hooks";

describe("Hooks", () => {
  describe("useBoolean", () => {
    it("exports useBoolean function", () => {
      expect(typeof useBoolean).toBe("function");
    });
  });

  describe("useCounter", () => {
    it("exports useCounter function", () => {
      expect(typeof useCounter).toBe("function");
    });
  });

  describe("useToggle", () => {
    it("exports useToggle function", () => {
      expect(typeof useToggle).toBe("function");
    });
  });

  describe("usePrevious", () => {
    it("exports usePrevious function", () => {
      expect(typeof usePrevious).toBe("function");
    });
  });

  describe("useMountedRef", () => {
    it("exports useMountedRef function", () => {
      expect(typeof useMountedRef).toBe("function");
    });
  });
});
