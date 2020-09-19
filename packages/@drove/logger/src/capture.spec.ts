import { LoggerFunction } from "./logger";
import { captiveWrapper } from "./capture";

describe("captiveWrapper", () => {
  it("works", () => {
    const logsA: Parameters<LoggerFunction>[] = [];
    const loggerA: LoggerFunction = (...args) => { logsA.push(args) };
    const logsB: Parameters<LoggerFunction>[] = [];
    const loggerB: LoggerFunction = (...args) => { logsB.push(args) };
    const logsC: Parameters<LoggerFunction>[] = [];
    const loggerC: LoggerFunction = (...args) => { logsC.push(args) };

    const { wrapped: logger, capture } = captiveWrapper(loggerA);

    logger("debug", "debug log");
    expect(logsA.pop()).toEqual([ "debug", "debug log" ]);
    expect(logsB).toHaveLength(0);
    expect(logsC).toHaveLength(0);

    const { close: closeB } = capture(loggerB);

    logger("debug", "debug log 2");
    expect(logsA.pop()).toEqual([ "debug", "debug log 2" ]);
    expect(logsB.pop()).toEqual([ "debug", "debug log 2" ]);
    expect(logsC).toHaveLength(0);

    const { close: closeC } = capture(loggerC);

    logger("debug", "debug log 3");
    expect(logsA.pop()).toEqual([ "debug", "debug log 3" ]);
    expect(logsB.pop()).toEqual([ "debug", "debug log 3" ]);
    expect(logsC.pop()).toEqual([ "debug", "debug log 3" ]);

    closeC();
    closeC(); // double close must not affect

    logger("debug", "debug log 4");
    expect(logsA.pop()).toEqual([ "debug", "debug log 4" ]);
    expect(logsB.pop()).toEqual([ "debug", "debug log 4" ]);
    expect(logsC).toHaveLength(0);

    const { close: closeCagain } = capture(loggerC);

    logger("debug", "debug log 5");
    expect(logsA.pop()).toEqual([ "debug", "debug log 5" ]);
    expect(logsB.pop()).toEqual([ "debug", "debug log 5" ]);
    expect(logsC.pop()).toEqual([ "debug", "debug log 5" ]);

    closeB();
    closeCagain();

    logger("debug", "debug log 6");
    expect(logsA.pop()).toEqual([ "debug", "debug log 6" ]);
    expect(logsB).toHaveLength(0);
    expect(logsC).toHaveLength(0);
  });
});
