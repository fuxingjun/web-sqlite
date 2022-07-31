const useId = (function () {
  let id = 0;
  return function () {
    return ++id;
  }
})();

/**
 * get方法获取json数据
 * @param url
 * @returns {Promise<any>}
 */

async function getJSON(url) {
  let response = await fetch(url);
  if (response.status >= 200 && response.status < 300) {
    const { returnCode, data, message } = await response.json();
    if (returnCode === 0) {
      return data;
    } else {
      throw new Error(message);
    }
  } else {
    throw new Error(response.statusText);
  }
}

/**
 * POST 方法提交 JSON 数据
 * @param url
 * @param data
 * @returns {Promise<any>}
 */
async function postJSON(url, data) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=utf-8'
    },
    body: JSON.stringify(data),
  });
  if (response.status >= 200 && response.status < 300) {
    return await response.json();
  } else {
    throw new Error(response.statusText);
  }
}

/**
 * 获取文件
 * @param url
 * @returns {Promise<Blob>}
 */
async function fetchBlob(url) {
  let response = await fetch(url);
  if (response.status >= 200 && response.status < 300) {
    return await response.blob();
  } else {
    throw new Error(response.statusText);
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

/**
 * 右侧显示日志
 * @param message
 */
function pageLogger(message) {
  if (!pageLogger.containerEle) {
    pageLogger.containerEle = document.querySelector("#log-container .log-wrapper");
  }
  let p = document.createElement("p");
  p.innerText = message;
  pageLogger.containerEle.appendChild(p);
  p = null;
}

const useSQL = (function () {
  const dbMap = new Map();
  const sqliteMap = new Map();
  let sqlPromise;
  return async function (url) {
    if (!sqlPromise) {
      sqlPromise = initSqlJs({
        locateFile: file => `${location.origin}/assets/cdn/${file}`,
      });
    }
    let db;
    if (!dbMap.has(url)) {
      let dataPromise;
      if (sqliteMap.has(url)) {
        dataPromise = sqliteMap.get(url);
      } else {
        dataPromise = fetch(url).then(res => res.arrayBuffer());
        sqliteMap.set(url, dataPromise);
      }
      const [SQL, buf] = await Promise.all([sqlPromise, dataPromise])
      db = new SQL.Database(new Uint8Array(buf));
      dbMap.set(url, db);
    } else {
      db = dbMap.get(url);
    }
    return db;
  }
})();

/**
 * 从前端数据库查询数据
 * @param url
 * @param code
 * @returns {null|*}
 */
async function listDailyFromLocalDB(url, code) {
  const db = await useSQL(url);
  const result = db.exec('SELECT * FROM t_day WHERE code = $code', { $code: code });
  // console.log("listDailyFromLocalDB", code, result);
  if (!result[0]) return null;
  const { columns, values } = result[0];
  return calcMA(values.map(valueList => {
    return valueList.reduce((total, current, index) => {
      total[toHump(columns[index])] = current;
      return total;
    }, {});
  }));
}

/**
 * 根据 url 获取sqlite文件buffer格式
 * @type {function(*): Promise<ArrayBuffer>}
 */
const useBuffer = (function () {
  let bufferMap = new Map();
  return async function (url) {
    let bufferPromise;
    if (!bufferMap.has(url)) {
      bufferPromise = fetch(url).then(res => res.arrayBuffer());
      bufferMap.set(url, bufferPromise);
    } else {
      bufferPromise = bufferMap.get(url);
    }
    return await bufferPromise;
  }
})();

const useWorker = (function () {
    let dbOpened = false;
    return function (url, sql, params) {
      const worker = new Worker(`${location.origin}/assets/cdn/worker.sql-wasm.js`);
      const id1 = useId();
      const id2 = useId();
      return new Promise(async (resolve, reject) => {
        const openStartTime = performance.now();
        worker.onmessage = () => {
          dbOpened = true;
          console.log(`打开数据库耗时: ${performance.now() - openStartTime}`);
          const startTime = performance.now();
          worker.onmessage = event => {
            console.log(`执行sql耗时: ${performance.now() - startTime}`);
            // console.log(event.data); // The result of the query
            resolve(event.data);
          };
          worker.postMessage({
            id: id2,
            action: "exec",
            sql,
            params,
          });
        };

        worker.onerror = e => {
          console.log("Worker error: ", e);
          reject(e)
        }
        // let buffer = undefined;
        // if (!dbOpened) {
        //   buffer = await useBuffer(url)
        // }
        worker.postMessage({
          id: id1,
          action: "open",
          buffer: await useBuffer(url), /*Optional. An ArrayBuffer representing an SQLite Database file*/
        });
      })
    }
  }
)();

/**
 * 从前端数据库使用Worker查询数据
 * @param url
 * @param code
 * @returns {null|*}
 */
async function listDailyFromLocalDBWorker(url, code) {
  const [err, data] = await captureError(useWorker, url, 'SELECT *  FROM t_day  WHERE code = $code', { $code: code });
  if (err) {
    console.log("listDailyFromLocalDBWorker.err", err);
    return null;
  }
  console.log("listDailyFromLocalDBWorker", code, data);
  const { results } = data;
  if (!results[0]) return null;
  const { columns, values } = results[0];
  return calcMA(values.map(valueList => {
    return valueList.reduce((total, current, index) => {
      total[toHump(columns[index])] = current;
      return total;
    }, {});
  }));
}

/**
 * 使用 IndexedDB 的 t_day 表
 * @type {function(): *}
 */
const useKLineDB = (function () {
  let dexieDB;
  return function () {
    if (!dexieDB) {
      dexieDB = new Dexie('kLine')
      // Declare tables, IDs and indexes
      dexieDB.version(1).stores({
        t_day: '++id, code, date'
      });
    }
    return dexieDB;
  }
})();

/**
 *  从 IndexedDB 查询数据
 * @param code
 * @returns {Promise<null|*[]>}
 */
async function listDailyFromIndexedDB(code) {
  const [err, data] = await captureError(async () => await useKLineDB().t_day.where({ code }).toArray());
  if (err) {
    console.log("listDailyFromIndexedDB.err", err);
    return null;
  }
  console.log("listDailyFromIndexedDB", code, data.length);
  if (!data[0]) return null;
  const keyList = Object.keys(data[0]);
  return calcMA(data.map(item => {
    return keyList.reduce((total, current, index) => {
      total[toHump(current)] = item[current];
      return total;
    }, {});
  }));
}

/**
 * 下划线字符串转驼峰字符串
 * @param name
 * @returns {*}
 */
function toHump(name) {
  return name.replace(/_(\w)/g, function (all, letter) {
    return letter.toUpperCase();
  });
}

/**
 * 将对象的key转驼峰，返回一个新的对象
 * @param row
 * @returns {{}}
 */
function convertToCamel(row) {
  return Object.keys(row).reduce((total, current) => {
    total[toHump(current)] = row[current];
    return total;
  }, {})
}

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
