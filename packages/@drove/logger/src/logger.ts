export const orderedLogLevels = ["debug", "verbose", "info", "warn", "error"] as const;
export type LogLevel = typeof orderedLogLevels[number];

export type LoggerFunction = (level: LogLevel, message: string, ...objs: any) => void;

export type Logger = {
  [name in LogLevel | "log"]: name extends "log" ? LoggerFunction : (message: string, ...objs: any) => void;
};

export const wrapLoggerFunction = (log: LoggerFunction): Logger => ({
  ...Object.fromEntries(orderedLogLevels.map((level) => [ level, (message: string, ...objs: any) => log(level, message, ...objs) ])),
  log,
} as any);
