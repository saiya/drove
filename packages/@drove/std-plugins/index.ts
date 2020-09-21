import { Provider } from "@drove/context";
import { ClockPlugin, clockPlugin, clockPluginDefault } from "./src/clock";
import { vcsPlugin, vcsPluginDefault, VcsPlugin } from "./src/vcs_state";

export * from "./src/clock";

type StdPlugins = [ ClockPlugin, VcsPlugin ];
const stdPlugins = [ clockPlugin, vcsPlugin ] as const;

export class stdPluginsProvider implements Provider<[], StdPlugins> {
  readonly readableName = "StdPluginsProvider";

  readonly requires = [] as const;
  readonly offers = stdPlugins;

  async provide(): Promise<StdPlugins> {
    return [ clockPluginDefault, vcsPluginDefault ];
  }
}
