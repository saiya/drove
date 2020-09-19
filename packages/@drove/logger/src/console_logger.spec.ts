import { consoleLogger } from "./console_logger";

describe("consoleLogger", () => {
  it("format", () => {
    let message: string;
    let optionalParams: any[];
    const logger = consoleLogger({
      color: false,
      stdout: (msg, ...params: any[]) => {
        message = msg;
        optionalParams = params;
      },
    });

    logger("warn", "Test warning log", Math.PI, "test");
    expect(message!).toMatch(/^\[.+\] ⚠️ WARN  \tTest warning log$/);
    expect(optionalParams!).toEqual([ Math.PI, "test" ]);
  });
});
