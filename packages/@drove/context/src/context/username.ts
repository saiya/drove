import { ContextArgs } from "../context";
import { spawnSync } from "child_process";
import { userInfo } from "os";

export type UsernameContext = {
  username?: string;
};

const getLogname = (): string | undefined => {
  try {
    // $SUDO_USER などの環境変数は `sudo su -` された場合には取得できない。
    // なので logname システムコールなどによる取得を試みる
    const logname = spawnSync("logname", { encoding: "utf8" }).stdout.trim();
    return logname !== "" ? logname : undefined;
  } catch (e) {
    return undefined;
  }
};

const currentUserName = ((): string[] | undefined => {
  try {
    const result: string[] = [];
    if (userInfo().username) result.push(userInfo().username);

    const logname = getLogname();
    if (logname && result[result.length - 1] !== logname) result.push(logname);

    if (result.length === 0) return undefined;
    return result;
  } catch(e) {
    return undefined;
  }
})();

export const implementUsername = <T extends {}>(base: T, args: ContextArgs): T & UsernameContext => {
  return {
    ...base,
    hostname: args.hostname ?? currentUserName?.join("/"),
  };
};
