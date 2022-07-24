const { listStockDaily, listStockCode } = require("../service");
const { logger } = require("../utils");

module.exports = function (router) {
  /**
   * 查询code的日线
   */
  router.get('/stock/daily/:code', async (ctx, next) => {
    // ctx.router available
    // ctx.body = 'Hello Koa';
    logger.info(`/stock/daily: ${JSON.stringify(ctx.params)}, ${JSON.stringify(ctx.query)}`,);
    ctx.body = await listStockDaily(ctx.params.code);
  });
  /**
   * 查询可用的code
   */
  router.get('/stock/code/list', async (ctx, next) => {
    // ctx.router available
    // ctx.body = 'Hello Koa';
    logger.info(`/stock/code/list`);
    ctx.body = await listStockCode();
  });
}
