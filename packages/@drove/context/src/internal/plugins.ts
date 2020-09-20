import { DAG } from "@drove/dag";
import { ApplicationSeed, ProviderId } from "../application";
import { Plugin, PluginType } from "../plugin";
import { ContextInitializer, newContext, ContextArgs } from "../context";

export const initPlugins = async (seed: ApplicationSeed, initContextArgs: ContextArgs): Promise<Record<PluginType, Plugin>> => {
  const offeringMap = offeringMapOf(seed);
  assertMissingRequirements(seed, offeringMap);

  const dependencyList = listProviderDependency(seed, offeringMap);
  const dag = new DAG<ProviderId>(
    Object.keys(seed.providers),
    dependencyList.map((dep) => [ dep.from, dep.to ])
  );
  const { layers, loops } = dag.topologicalSort();
  if (loops.length > 0) raiseLoopedDependencyError(seed, loops, dependencyList);

  let contextInitializers: ContextInitializer[] = [];
  let plugins: Record<PluginType, Plugin> = {};
  for (const { nodes: providerIds } of layers) {
    const c = newContext(initContextArgs, contextInitializers); // Context for this layer initialization

    let newPlugins: Plugin[] = [];
    await Promise.all(providerIds.map(async (providerId) => {
      const provider = seed.providers[providerId];
      const provided = await provider.provide(c, (provider.requires as PluginType[]).map((pluginType) => (plugins as any)[pluginType] as Plugin));
      newPlugins = [ ...newPlugins, ...provided.filter((plugin) => (offeringMap as any)[plugin.type] === providerId) ];
    }));

    // Make this layer's outcomes visible to next layer.
    plugins = { ...plugins, ...Object.fromEntries(newPlugins.map((plugin) => [ plugin.type, plugin ])) };
    contextInitializers = [ 
      ...contextInitializers, 
      // Must append after upper layer's initializers, this is ordered list.
      ...newPlugins.flatMap((plugin) => plugin.contextInitializers ?? []),
    ];
  }
  return plugins;
};

type OfferingMap = Record<PluginType, ProviderId>;
const offeringMapOf = (seed: ApplicationSeed): OfferingMap => {
  const pluginPriority = seed.pluginPriority ?? {};

  const result: any = {};
  const errors: string[] = [];
  for (const [ providerId, provider ] of Object.entries(seed.providers)) {
    for (const pluginType of provider.offers) {
      if (((pluginPriority as any)[pluginType] ?? providerId) !== providerId) continue;

      if (result[pluginType]) {
        errors.push(`Plugin ${pluginType.toString()} is provided by two providers ${providerId} (${provider.readableName}) and ${result[pluginType]} (${seed.providers[result[pluginType]].readableName}), must specify pluginPriority to resolve this duplication.`);
        continue;
      }
      result[pluginType] = providerId;
    }
  }
  
  if(errors.length > 0) throw new Error(errors.join("; "));
  return result as OfferingMap;
};

const assertMissingRequirements = (seed: ApplicationSeed, offeringMap: OfferingMap) => {
  const errors = Object.entries(seed.providers).flatMap(
    ([id, provider]) => (provider.requires as PluginType[])
      .filter((type) => !(offeringMap as any)[type])
      .map((type) => `Provider ${id} (${provider.readableName}) requires ${type.toString()} plugin`)
  );
  if (errors.length > 0) throw new Error(`Required plugin(s) missing, it implies you need to add provider: ${errors.join("; ")}`);
};

type ProviderDependency = {
  from: ProviderId,
  to: ProviderId,
  requiredPlugin: PluginType,
};
const listProviderDependency = (seed: ApplicationSeed, offeringMap: OfferingMap): ProviderDependency[] => {
  const result: ProviderDependency[] = [];
  for (const [ providerId, provider ] of Object.entries(seed.providers)) {
    for (const requiredPlugin of (provider.requires as PluginType[])) {
      const from = (offeringMap as any)[requiredPlugin];
      result.push({
        from,
        to: providerId,
        requiredPlugin,
      });
    }
  }
  return result;
};

const raiseLoopedDependencyError = (seed: ApplicationSeed, loops: DAG<ProviderId>[], dependencyList: ProviderDependency[]): never => {
  const formatProvider = (providerId: ProviderId) => `${providerId} (${seed.providers[providerId].readableName})`;
  const formattedLoops = loops.map((loop) => {
    const path: ProviderId[] = loop.path(loop.nodes[0], loop.nodes[0], { includeFrom: false, includeTo: true })!;
    return path.reduce<{
      /** Human-readable string representation of the path. */
      str: string,
      /** Last provider of the path */
      tail: ProviderId,
    }>(
      (result, tail: ProviderId) => {
        const depsBetween = dependencyList.filter((dep) => dep.from === result.tail && dep.to === tail);
        return {
          str: `${result.str} <--[ ${depsBetween.map((dep) => `${dep.requiredPlugin.toString()}`).join(", ")} ]-- ${formatProvider(tail)}`,
          tail,
        };
      },
      { str: formatProvider(loop.nodes[0]), tail: loop.nodes[0] }
    )
  });
  throw new Error(`Provider dependency cycle found: ${formattedLoops.map((fmt) => fmt.str).join("; ")}`);
};
