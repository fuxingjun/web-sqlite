const winston = require('winston');
const dayjs = require("dayjs");
const path = require("path");

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'web-sqlite' },
  transports: [
    //
    // - Write all logs with importance level of `error` or less to `error.log`
    // - Write all logs with importance level of `info` or less to `combined.log`
    //
    new winston.transports.File({
      filename: path.join(__dirname, `../../logs/${dayjs().format("YYYY-MM-DD")}.error.log`),
      level: 'error'
    }),
    new winston.transports.File({ filename: path.join(__dirname, `../../logs/${dayjs().format("YYYY-MM-DD")}.combined.log`) }),
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

module.exports = {
  logger,
}
