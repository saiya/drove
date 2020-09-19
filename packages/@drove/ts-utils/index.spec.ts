import { identity } from ".";

describe("identity", () => {
  it("pass-through given value", () => {
    expect(identity(123)).toBe(123);
  });
});
