import * as chalk from "chalk";
import * as dayjs from "dayjs";
import { LoggerFunction, LogLevel } from "./logger";

const levelFormat: {
  [level in LogLevel]: string;
} = {
  error: "🚨 ERROR",
  warn: "⚠️ WARN  ",
  info: "INFO   ",
  verbose: "VERBOSE",
  debug: "DEBUG  ",
};

export const consoleLogger = (args: {
  /** undefined: use color if TTY, true,false: enforce coloring. */
  color?: boolean;
  /** true: output to stdout, false,undefined: output to stderr, function: custom output */
  stdout?: boolean | ((message?: any, ...optionalParams: any[]) => void);
}): LoggerFunction => {
  const { color: colorEnforced, stdout } = args;
  const output = (typeof(stdout) === "function" ? stdout : stdout === true ? console.debug : console.error);
  const color = colorEnforced ?? (typeof(stdout) === "function" ? false : stdout === true ? process.stdout.isTTY : process.stderr.isTTY);
  
  const colorMap: {
    [level in LogLevel]: (txt: string) => string;
  } = {
    error: chalk.bgRed,
    warn: chalk.bgYellow,
    info: (txt: string) => txt,
    verbose: chalk.gray,
    debug: chalk.gray,
  };
  if (! color) for (const level of Object.keys(colorMap) as LogLevel[]) colorMap[level] = (txt: string) => txt;

  return (level, message, ...objs: any[]) => {
    output(colorMap[level](`[${dayjs().toISOString()}] ${levelFormat[level]}\t${message}`), ...objs);
  };
};
