const { logger, useSqlite, captureError, httpResult, calcMA } = require("../utils");

/**
 * 查询指定股票日级行情
 * @param code
 * @returns {Promise<{returnCode: number, data: null, message: *}|{returnCode: number, data: *, message: string}>}
 */
async function listStockDaily(code) {
  logger.info(`listStockDaily: ${code}`);
  const knexInstance = useSqlite();
  const [err, result] = await captureError(async () => {
    return knexInstance.select("*").from("t_stock").where({
      code,
    });
  })
  // console.log(data);
  return err ? httpResult.error(err) : httpResult.success(calcMA(result));
}

/**
 * 查询所有股票code
 * @returns {*}
 */
async function listStockCode() {
  logger.info(`listStockCode`);
  const knexInstance = useSqlite();
  const [err, result] = await captureError(async () => {
    return knexInstance.select(["code", "name"]).from("t_stock").groupBy("code");
  })
  // console.log(data);
  return err ? httpResult.error(err) : httpResult.success(result);
}

module.exports = {
  listStockDaily,
  listStockCode,
}
