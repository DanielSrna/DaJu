import winston from "winston";

const { combine, timestamp, printf } = winston.format;

export const LOG_LEVELS = {
  proceso: 0,
  exito: 1,
  fracaso: 2,
} as const;

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
});

export const logger = winston.createLogger({
  levels: LOG_LEVELS,
  level: process.env.LOG_LEVEL ?? "proceso",
  format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), logFormat),
  transports: [
    new winston.transports.Console({
      format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), logFormat),
    }),
    ...(process.env.NODE_ENV !== "test"
      ? [
          new winston.transports.File({
            filename: "logs/error.log",
            level: "fracaso",
            maxsize: 5 * 1024 * 1024,
          }),
        ]
      : []),
  ],
});

export { logger as winston };
