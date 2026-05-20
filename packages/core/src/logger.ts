import pino, {
  type DestinationStream,
  type LevelWithSilent,
  type Logger
} from "pino";
import pretty from "pino-pretty";

export type { Logger };

export interface CreateLoggerOptions {
  level: LevelWithSilent;
  ci: boolean;
}

export function createLogger(
  options: CreateLoggerOptions,
  destination?: DestinationStream
): Logger {
  const loggerOptions = {
    level: options.level,
    base: null
  };

  if (options.ci) {
    return pino(loggerOptions, destination ?? pino.destination(2));
  }

  return pino(
    loggerOptions,
    destination ??
      pretty({
        colorize: true,
        destination: 2,
        translateTime: "SYS:standard"
      })
  );
}
