import { Plugin, Context } from "@drove/context";

export const vcsPlugin = "vcs";

const cacheOwner = Symbol("VcsPlugin");

/**
 * Provides information about VCS (e.g. Git) repository/workcopy status.
 */
export type VcsPlugin = Plugin & {
  type: typeof vcsPlugin;

  /** Get current version of user's code. */
  get: (c: Context) => Promise<VcsState | null>;
};

/** By default, get Git commit information of the current directory. */
export const vcsPluginDefault: VcsPlugin = {
  type: vcsPlugin,

  get: async (c: Context) => c.cache.get(cacheOwner, "get", async (): Promise<VcsState | null> => {
    throw new Error("TODO: Implement, get VcsInfo from current directory");
  }),
};

export type VcsState = {
  /** e.g. Git commit hash */
  revision?: string;
  /** e.g. Git branch/tag name */
  reference?: string;
};
