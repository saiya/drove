import { newApplication } from "./application";
import { ContextArgs, Context } from "./context";
import { Provider } from "./provider";
import { Plugin, PluginType } from "./plugin";

const initContextArgs: ContextArgs = {
  idPrefix: "test-",
  logger: () => {},
};

const a1 = Symbol("A1");
type PluginA1 = Plugin & { type: typeof a1 };
const pluginA1: PluginA1 = { type: a1 };

const b1 = Symbol("B1");
type PluginB1 = Plugin & { type: typeof b1 };
const pluginB1: PluginB1 = { type: b1 };

const b2 = Symbol("B2");
type PluginB2 = Plugin & { type: typeof b2 };
const pluginB2: PluginB2 = { type: b2 };

const b3 = Symbol("B3");
type PluginB3 = Plugin & { type: typeof b3 };
const pluginB3: PluginB3 = { type: b3 };

const c1 = Symbol("C1");
type PluginC1 = Plugin & { type: typeof c1 };
const pluginC1: PluginC1 = { type: c1 };

const providerA: Provider<[], [ PluginA1 ]> = {
  readableName: "A",
  requires: [],
  offers: [ a1 ],
  provide: async (_, upstream) => assertUpstream(upstream, [], [ pluginA1 ]),
};
const providerBa: Provider<[ PluginA1 ], [ PluginB1 ]> = {
  readableName: "Ba",
  requires: [ a1 ],
  offers: [ b1 ],
  provide: async (_, upstream) => assertUpstream(upstream, [ a1 ], [ pluginB1 ]),
};
const providerBb: Provider<[ PluginA1 ], [ PluginB2, PluginB3 ]> = {
  readableName: "Bb",
  requires: [ a1 ],
  offers: [ b2, b3 ],
  provide: async (_, upstream) => assertUpstream(upstream, [ a1 ], [ pluginB2, pluginB3 ]),
};
const providerC: Provider<[ PluginB1, PluginB2 ], [ PluginC1 ]> = {
  readableName: "C",
  requires: [ b1, b2 ],
  offers: [ c1 ],
  provide: async (_, upstream) => assertUpstream(upstream, [ b1, b2 ], [ pluginC1 ]),
};

describe("Application", () => {
  it("empty", async () => {
    await newApplication({
      providers: {},
    }, initContextArgs);
  });

  it("normal", async () => {
    const app = await newApplication({
      providers: {
        A: providerA, Ba: providerBa, Bb: providerBb, C: providerC,
      },
    }, initContextArgs);
    expect(app.plugin<PluginA1>(a1)).toBe(pluginA1);
    expect(app.plugin<PluginB1>(b1)).toBe(pluginB1);
    expect(app.plugin<PluginB2>(b2)).toBe(pluginB2);
    expect(app.plugin<PluginB3>(b3)).toBe(pluginB3);
    expect(app.plugin<PluginC1>(c1)).toBe(pluginC1);
  });

  it("missing dependency", async () => {
    await expect(() => newApplication({
      providers: {
        A: providerA, Ba: providerBa, C: providerC,
      },
    }, initContextArgs)).rejects.toThrowError(/Required plugin\(s\) missing.*: Provider C \(C\) requires Symbol\(B2\) plugin/);
  });

  describe("duplicated plugin", () => {
    it("without priority", async () => {
      await expect(() => newApplication({
        providers: {
          A: providerA, Ba: providerBa, Bb: providerBb, C: providerC,
          X: {
            readableName: "X",
            requires: [],
            offers: [ a1 ],
            provide: async () => [ pluginA1 ],
          },
        },
      }, initContextArgs)).rejects.toThrowError(/Plugin Symbol\(A1\) is provided by two providers X \(X\) and A \(A\)/);
    });

    it("with priority", async () => {
      const app = await newApplication({
        pluginPriority: {
          [a1]: "X",
        },
        providers: {
          A: providerA, Ba: providerBa, Bb: providerBb, C: providerC,
          X: {
            readableName: "X",
            requires: [],
            offers: [ a1 ],
            provide: async () => [ { ...pluginA1, X: "Provided by provider X", } ],
          },
        },
      }, initContextArgs);
      expect((app.plugin<PluginA1>(a1) as any).X).toBe("Provided by provider X");
    });
  });

  it("cycle", async() => {
    await expect(() => newApplication({
      providers: {
        A: {
          ...providerA,
          requires: [ ...providerA.requires, c1 ],
        }, 
        Ba: providerBa, Bb: providerBb, C: providerC,
      },
    }, initContextArgs)).rejects.toThrowError(/Provider dependency cycle found.*A \(A\)/);
  });

  it("context initializers", async () => {
    let contextInitializerAcallCount = 0;
    await newApplication({
      providers: {
        A: {
          ...providerA,
          provide: async () => [
            {
              ...pluginA1,
              contextInitializers: [
                (c: Context) => {
                  expect(c.cache).toBeDefined(); // Default initializers must be activated.
                  return {
                    ...c,
                    providerA: "enhanced by ProviderA",
                    contextInitializerAcalled: contextInitializerAcallCount++,
                  };
                },
              ],
            },
          ],
        }, 
        Ba: {
          ...providerBa,
          provide: async (c: Context) => {
            // In the real code, should use interface merging to enrich type definition.
            expect((c as any).providerA).toBe("enhanced by ProviderA");
            // Should not visible those properties because no dependency path between those providers:
            expect((c as any).providerBb).toBeUndefined();
            return [
              {
                ...pluginB1,
                contextInitializers: [
                  (c) => ({
                    ...c,
                    providerBa: "enhanced by ProviderBa",
                  }),
                ],
              },
            ];
          },
        }, 
        Bb: {
          ...providerBb,
          provide: async (c) => {
            // Should not visible those properties because no dependency path between those providers:
            expect((c as any).providerBa).toBeUndefined();
            return [
              pluginB2, 
              {
                ...pluginB3,
                contextInitializers: [
                  (c: Context) => ({
                    ...c,
                    providerBb: "enhanced by ProviderBb",
                  }),
                ],
              },
            ];
          },
        }, 
        C: {
          ...providerC,
          provide: (c, upstream) => {
            expect((c as any).providerA).toBe("enhanced by ProviderA");
            expect((c as any).providerBa).toBe("enhanced by ProviderBa");
            expect((c as any).providerBb).toBe("enhanced by ProviderBb");
            return providerC.provide(c, upstream);
          },
        },
      },
    }, initContextArgs);
    expect(contextInitializerAcallCount).toBe(2); // 1st call: Ba+Bb, 2nd call: C
  });
});

function assertUpstream<T>(upstream: Plugin[], expected: PluginType[], returnValue: T): T {
  expect(upstream.map((plugin) => plugin.type)).toEqual(expected);
  return returnValue;
}
