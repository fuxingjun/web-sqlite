/**
 * try catch辅助函数
 * @param {*} asyncFunc
 * @param  {...any} args
 * @returns
 */
async function captureError(asyncFunc, ...args) {
  try {
    let res = await asyncFunc.apply(null, args);
    return [null, res];
  } catch (error) {
    return [error, null];
  }
}

/**
 * 封装 http 响应
 * @type {{success(*): {returnCode: number, data: *}, error(*): {returnCode: number, message: *}}}
 */
const httpResult = {
  success(data, message = "") {
    return {
      returnCode: 0,
      data,
      message,
    }
  },
  error(message, returnCode = -1) {
    return {
      returnCode,
      data: null,
      message,
    }
  }
}

/**
 * 计算指定周期的若干 MA 均线
 * @param kline K线
 * @param params tuple
 * @return {*[]} 在原始数据中新增若干 MA 均线
 */
function calcMA(kline, params = [5, 10, 20, 60, 120, 250]) {
  console.time("calcMA")
  for (let i = 0, len = kline.length; i < len; i++) {
    let k = kline[i];
    for (let n = 0; n < params.length; n++) {
      let maKey = 'ma' + params[n];
      k[maKey] = 'null';
    }
    for (let j = 0, len2 = params.length; j < len2; j++) {
      let col = 'ma' + params[j];
      if (i < params[j] - 1) {
        break;
      } else {
        let sum = 0;
        for (let m = 0; m < params[j]; m++) {
          sum += kline[i - m].closePrice;
        }
        k[col] = (sum / params[j]).toFixed(2); //保留两位小数，四舍五入
      }
    }
  }
  console.timeEnd("calcMA")
  return kline;
}

module.exports = {
  captureError,
  httpResult,
  calcMA,
}

