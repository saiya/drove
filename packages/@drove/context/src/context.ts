import { v4 as uuidv4 } from 'uuid';
import { defaultInitializers, DefaultContext, DefaultContextArgs } from "./context/default_initializers";

type ContextCore = {
  readonly id: string;
  readonly startAt: Date;

  close: () => Promise<void>;
  onClosed: (handler: () => Promise<void>) => void;

  /** Called by JSON.stringify(), do not serialize this object */
  toJSON: () => never;  // Should throw exception.
};

/**
 * State of a user request (e.g. command line tool invocation, API request, ...).
 */
export interface Context extends ContextCore, DefaultContext { };  // Use interface for declaration merging

type ContextCoreArgs = DefaultContextArgs & {
  idPrefix?: string;

  hostname?: string;
  userName?: string;
};
const defaultIdPrefix = "ctx-";

export interface ContextArgs extends ContextCoreArgs { };  // Use interface for declaration merging

export type ContextInitializer = (c: Context, args: ContextArgs) => Context;

export const newContext = (args: ContextArgs, initializers: ContextInitializer[]): Context => {
  const idPrefix = args.idPrefix ?? defaultIdPrefix;

  let closeHandlers: (() => Promise<void>)[] = [];
  const core: ContextCore = {
    id: `${idPrefix}${uuidv4().replace(/-/, "")}`,
    startAt: new Date(),

    close: async () => {
      const handlers = closeHandlers;
      closeHandlers = [];
      await Promise.all(handlers.map(async (handler) => await handler()));
    },
    onClosed: (handler: () => Promise<void>) => { closeHandlers.push(handler); },

    toJSON: () => { throw new Error(`Do NOT serialize Context object.`) },
  };

  return [ ...defaultInitializers, ...initializers ].reduce((c, init) => init(c, args), core as Context);
};
