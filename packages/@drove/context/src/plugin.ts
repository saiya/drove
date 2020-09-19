export type PluginType = string;

export type PluginTypesOfPlugins<T extends [...Plugin[]]> = {
  [i in keyof T]: T[i] extends Plugin ? T[i]["type"] : never;
};

export type Plugin = {
  type: PluginType;
};
