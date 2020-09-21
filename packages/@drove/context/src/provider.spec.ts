import { Provider } from "./provider";
import { identity } from "@drove/ts-utils";

const pluginA = "test:pluginA";
type PluginA = {
  type: typeof pluginA;
}

const pluginX = "test:pluginX";
type PluginX = {
  type: typeof pluginX;
};

describe("Provider", () => {
  describe("compiles", () => {
    it("empty", () => {
      identity<Provider<[], []>>({
        readableName: "test",
        requires: [],
        offers: [],
        provide: () => { throw new Error("Not implemented"); },
      });
    });
    it("simple", () => {
      identity<Provider<[ PluginA ], [ PluginX ]>>({
        readableName: "test",
        requires: [ pluginA ],
        offers: [ pluginX ],
        provide: () => { throw new Error("Not implemented"); },
      });
    });
  });
});
