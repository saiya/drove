import { Context, ContextArgs, newContext } from "./context";
import { Plugin, PluginType } from "./plugin";
import { Provider } from "./provider";
import { initPlugins } from "./internal/plugins";

type AnyProvider = Provider<any, Plugin[]>;
export type ProviderId = string;

/** Materials to build {@link Application}. */
export type ApplicationSeed = {
  providers: Record<ProviderId, AnyProvider>;
  /** If {@link providers} offers duplicates {@link Plugin}, should specify which provider to take precedence. */
  pluginPriority?: Record<PluginType, ProviderId>;
};

export type Application = {
  plugin: <T extends Plugin>(type: T["type"]) => T;
  newContext: (args: ContextArgs) => Context;
};

/**
 * @param initContextArgs {@link ContextArgs} to create "init" context, the context used for this initialization process.
 */
export const newApplication = async (seed: ApplicationSeed, initContextArgs: ContextArgs): Promise<Application> => {
  const pluginsMap = await initPlugins(seed, initContextArgs);
  const plugins: Plugin[] = Object.values(pluginsMap) as Plugin[];
  const contextInitializers = plugins.flatMap((plugin) => plugin.contextInitializers ?? []);
  return {
    plugin: <T extends Plugin>(type: T["type"]) => {
      if (! pluginsMap[type]) throw new Error(`Plugin not found: ${type} (providers: ${Object.entries(seed.providers).map(([id, provider]) => `${id} (${provider.readableName})`).join(", ")})`);
      return pluginsMap[type] as any as T;
    },
    // Note: Context is created during plugin initialization, but different implementation used.
    newContext: (args) => newContext(args, contextInitializers),
  };
};
