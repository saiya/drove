import { identity } from "@drove/ts-utils";
import { ContextInitializer } from "../context";
import { implementLogging, LoggingContext, LoggingContextArgs } from "./logging";
import { implementCancel, CancelContext } from "./cancel";
import { implementCache, CacheContext } from "./cache";
import { implementHostname, HostnameContext } from "./hostname";
import { UsernameContext, implementUsername } from "./username";

export type DefaultContextArgs = LoggingContextArgs;
export type DefaultContext = CacheContext & CancelContext & HostnameContext & LoggingContext & UsernameContext;

export const defaultInitializers: readonly ContextInitializer[] = [
  identity<ContextInitializer>(implementHostname),
  identity<ContextInitializer>(implementUsername),
  identity<ContextInitializer>(implementLogging),
  identity<ContextInitializer>(implementCancel),
  identity<ContextInitializer>(implementCache),
] as const;
