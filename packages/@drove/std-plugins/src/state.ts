import { Plugin, Context } from "@drove/context";
import { VcsState, VcsPlugin } from "./vcs_state";

export const statePlugin = "state";

export type StateModifyCallback<T extends {}, U extends (T | null)> = (old: PersistentState<T> | null) => Promise<U>;
export type ModifyResult<T extends {}, U extends (T | null)> = PersistentState<Exclude<U, null>> | (U extends null ? null : never);

/**
 * Provides storage for persistent state.
 */
export type StatePlugin = Plugin & {
  type: typeof statePlugin;

  get: <T extends {}>(c: Context, stateType: string, key: string) => Promise<PersistentState<T> | null>;
  /**
   * @param f Return null to delete the state.
   */
  modify: <T extends {}, U extends (T | null)>(c: Context, stateType: string, key: string, f: StateModifyCallback<T, U>) => Promise<ModifyResult<T, U>>;
};

export type PersistentState<T extends {}> = {
  data: T;

  creation: StateModificationMetadata;
  lastModification: StateModificationMetadata;
};

export type StateModificationMetadata = {
  at: Date;

  /** @see Context.hostname */
  hostname?: string;
  /** @see Context.username */
  username?: string;

  /** State of VCS (e.g. git HEAD) when this modification made. */
  vcs?: VcsState;
};

/** 
 * Do not use in production!!
 * Only for testing purpose.
 */
export class OnMemoryStatePlugin implements StatePlugin {
  readonly type: typeof statePlugin = statePlugin;

  private storage: {
    [stateType: string]: {
      /** Store PersistentState as JSON to ensure serializability. */
      [key: string]: string;
    },
  } = {};

  constructor(private deps: { vcs: VcsPlugin }) {}

  async get<T>(_: Context, stateType: string, key: string): Promise<PersistentState<T> | null> {
    const json = this.storage?.[stateType]?.[key];
    return json ? JSON.parse(json) as PersistentState<T> : null;
  }

  async modify<T extends {}, U extends (T | null)>(c: Context, stateType: string, key: string, f: StateModifyCallback<T, U>): Promise<ModifyResult<T, U>> {
    const old = await this.get<T>(c, stateType, key);
    const newData = await f(old);
    if (newData === null) {
      if (this.storage?.[stateType]) delete this.storage[stateType][key];
      return null as any;
    }

    const metadata: StateModificationMetadata = {
      at: c.now(),
      hostname: c.hostname,
      username: c.username,
      vcs: await this.deps.vcs.get(c) ?? undefined,
    };
    const newState: PersistentState<Exclude<U, null>> = {
      data: newData as Exclude<U, null>,
      creation: old?.creation ?? metadata,
      lastModification: metadata,
    };
    if (! this.storage[stateType]) this.storage[stateType] = {};
    this.storage[stateType][key] = JSON.stringify(newState);
    return newState;
  }
};
