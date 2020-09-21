import { ContextArgs } from "../context";
import { hostname } from "os";

export type HostnameContext = {
  hostname?: string;
};

export const implementHostname = <T extends {}>(base: T, args: ContextArgs): T & HostnameContext => {
  return {
    ...base,
    hostname: args.hostname ?? hostname(),
  };
};
