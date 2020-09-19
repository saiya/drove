import { Logger, wrapLoggerFunction, LoggerFunction } from "./logger";

describe("wrapLoggerFunction", () => {
  it("works", () => {
    const history: Parameters<LoggerFunction>[] = [];
    const f: LoggerFunction = (...args) => {
      history.push(args);
    };
    const logger: Logger = wrapLoggerFunction(f);

    logger.warn("warning 1");
    expect(history[history.length - 1]).toEqual([ "warn", "warning 1" ]);

    logger.verbose("verbose 1", 1234, { test: true, test2: undefined });
    expect(history[history.length - 1]).toEqual([ "verbose", "verbose 1",  1234, { test: true, test2: undefined } ]);
  });
});
