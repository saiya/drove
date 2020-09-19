import { Provider } from "./provider";
import { identity } from "@drove/ts-utils";

type PluginA = {
  type: "A";
}
type PluginX = {
  type: "X";
};

describe("Provider", () => {
  describe("empty", () => {
    it("compiles", () => {
      identity<Provider<[], []>>({
        requires: [],
        offers: [],
        init: () => [],
      });
    });
  });
  describe("simple", () => {
    it("compiles", () => {
      identity<Provider<[ PluginA ], [ PluginX ]>>({
        requires: [ "A" ],
        offers: [ "X" ],
        init: () => [ { type: "X" } ],
      });
    });
  });
});
