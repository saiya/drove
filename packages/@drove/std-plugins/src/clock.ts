import { Plugin } from "@drove/context";

export const clockPlugin = "clock";

/**
 * Enhance {@see Context} with {@see ClockContext}.
 * To change `now()` for test purpose, you can inject your own clock plugin instead of this.
 */
export type ClockPlugin = Plugin & {
  type: typeof clockPlugin;
};

export const clockPluginDefault: ClockPlugin = {
  type: clockPlugin,
  contextInitializers: [
    (c) => ({
      ...c,
      now: () => new Date(),
    }),
  ],
};

export type ClockContext = {
  now: () => Date,
};

declare module "@drove/context" {
  export interface Context extends ClockContext {}
}
