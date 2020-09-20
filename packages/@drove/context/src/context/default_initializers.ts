import { identity } from "@drove/ts-utils";
import { ContextInitializer } from "src/context";
import { implementLogging } from "./logging";
import { implementCancel } from "./cancel";
import { implementCache } from "./cache";

export const defaultInitializers: readonly ContextInitializer[] = [
  identity<ContextInitializer>(implementLogging),
  identity<ContextInitializer>(implementCancel),
  identity<ContextInitializer>(implementCache),
] as const;
