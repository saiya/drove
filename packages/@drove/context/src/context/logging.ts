import { Logger, LogCapturer, LoggerFunction, consoleLogger, captiveWrapper, wrapLoggerFunction } from "@drove/logger";

export type LoggingContext = Logger & {
  /** Intercept logs. */
  captureLogs: LogCapturer;
};

export type LoggingContextArgs = {
  logger?: LoggerFunction;
};

export const implementLogging = <T extends {}>(base: T, args: LoggingContextArgs): T & LoggingContext => {
  const { wrapped: logger, capture: captureLogs } = captiveWrapper(args.logger ?? consoleLogger({}));
  return {
    ...base,
    ...wrapLoggerFunction(logger),
    captureLogs,
  };
};

declare module "../context" {
  export interface Context extends LoggingContext {}

  export interface ContextArgs extends LoggingContextArgs{}
}
