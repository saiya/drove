import { Context } from "./context";
import { Plugin, PluginTypesOfPlugins } from "./plugin";

export type Provider<Requires extends [...Plugin[]], Offers extends [...Plugin[]]> = {
  /** Display name, used for debug & error message */
  readonly readableName: string;
  
  requires: Readonly<PluginTypesOfPlugins<Requires>>;
  offers: Readonly<PluginTypesOfPlugins<Offers>>;

  provide: (c: Context, upstream: Requires) => Promise<Offers>;
};
