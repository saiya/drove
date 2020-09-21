import { OnMemoryCache } from "@drove/on-memory-cache";

export type CacheContext = {
  cache: OnMemoryCache;
};

export const implementCache = <T extends {}>(base: T): T & CacheContext => {
  return {
    ...base,
    cache: new OnMemoryCache(),
  };
};
