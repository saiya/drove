import { Context } from "./context";
import { Plugin, PluginTypesOfPlugins } from "./plugin";

export type Provider<Requires extends [...Plugin[]], Offers extends [...Plugin[]]> = {
  requires: Readonly<PluginTypesOfPlugins<Requires>>;
  offers: Readonly<PluginTypesOfPlugins<Offers>>;

  init: (c: Context, upstream: Requires) => Offers;
};
