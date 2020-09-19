import { LoggerFunction } from "./logger";

export type LogCapturer = (callback: LoggerFunction) => { close: () => void };

export const captiveWrapper = (logger: LoggerFunction): {
  wrapped: LoggerFunction;
  capture: LogCapturer;
} => {
  let nextId = 0;
  const aliveCallbacks: {
    [id in number]: LoggerFunction;
  } = {};
  return {
    wrapped: (...log) => {
      logger(...log);
      Object.values(aliveCallbacks).forEach((callback) => callback(...log));
    },
    capture: (callback) => {
      const id = nextId++; // Do not reuse ID, otherwise duplicate close() call deletes another callback.
      aliveCallbacks[id] = callback;
      return {
        close: () => {
          delete aliveCallbacks[id];
        },
      };
    },
  };
};
