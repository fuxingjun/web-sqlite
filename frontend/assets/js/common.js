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
        let startTime = performance.now();
        dataPromise = localforage.getItem(`sqliteUint8.${url}`).then(res => {
          if (res) {
            pageLogger(`localforage 读取耗时 ${(performance.now() - startTime).toFixed(2)}ms`);
            return res;
          }
          return fetch(url).then(async res => {
            startTime = performance.now();
            const buf = await res.arrayBuffer();
            pageLogger(`转换 buffer 耗时: ${(performance.now() - startTime).toFixed(2)}ms`);
            const uint8 = new Uint8Array(buf)
            startTime = performance.now();
            localforage.setItem(`sqliteUint8.${url}`, uint8, function () {
              pageLogger(`${url} localforage 存储耗时 ${(performance.now() - startTime).toFixed(2)}ms`);
            });
            return uint8
          });
        })
        sqliteMap.set(url, dataPromise);
      }
      const [SQL, uint8] = await Promise.all([sqlPromise, dataPromise]);
      db = new SQL.Database(uint8);
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
  if (!result || !result[0]) return null;
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
        worker.onmessage = (event) => {
          if (event.data.id !== id1) return;
          dbOpened = true;
          pageLogger(`打开数据库耗时: ${(performance.now() - openStartTime).toFixed(2)}`);
          const startTime = performance.now();
          worker.onmessage = event => {
            pageLogger(`执行sql耗时: ${(performance.now() - startTime).toFixed(2)}`);
            console.log("The result of the query", event); // The result of the query
            const { id } = event.data;
            if (id === id2) {
              resolve(event.data);
            }
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
  if (!results || !results[0]) return [];
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
    return keyList.reduce((total, current) => {
      total[toHump(current)] = item[current];
      return total;
    }, {});
  }));
}

/**
 * 从WebSQL查询数据
 * @param code
 * @returns {Promise<void>}
 */
function listDailyFromWebSQL(code) {
  return new Promise((resolve, reject) => {
    useWebSQL().then(db => {
      // console.log("useWebSQL", db)
      db.transaction(function (tx) {
        const sql = 'SELECT * FROM t_day WHERE code = ?';
        tx.executeSql(
          sql,
          [code],
          function (tx, result) {
            const data = Object.values(result.rows);
            if (!data[0]) {
              resolve(null);
              return;
            }
            const keyList = Object.keys(data[0]);
            resolve(calcMA(data.map(item => {
              return keyList.reduce((total, current) => {
                total[toHump(current)] = item[current];
                return total;
              }, {});
            })));
          },
          function (tx, error) {
            reject(error);
            console.error(`查询数据错误`, error);
          }
        );
      });
    });
  })
}

/**
 * 获取数据库，如果数据库不存在则创建并建表
 * @type {function(): Database}
 */
const useWebSQL = (function () {
  let db;
  return function () {
    return new Promise((resolve, reject) => {
      if (!db) {
        db = openDatabase('kLine', '1.0', 'kLine', 2 * 1024 * 1024);
        db.transaction(function (tx) {
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS t_day
             (
               id             INTEGER PRIMARY KEY AUTOINCREMENT,
               code           CHAR(50),
               name           CHAR(50),
               date           CHAR(50),
               open_price     FLOAT COMMENT '开盘价',
               close_price    FLOAT COMMENT '收盘价',
               high_price     FLOAT COMMENT '最高价',
               low_price      FLOAT COMMENT '最低价',
               trading_volume FLOAT COMMENT '成交量/手',
               trading_amount FLOAT COMMENT '成交额/元',
               amplitude      FLOAT COMMENT '振幅/%',
               change_ratio   FLOAT COMMENT '涨跌幅/%',
               change_amount  FLOAT COMMENT '涨跌额/元',
               turnover_ratio FLOAT COMMENT '换手率/%',
               created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
               updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
             );`,
            [],
            function (result) {
              console.log("创建表成功", result);
              result.executeSql(
                `CREATE INDEX IF NOT EXISTS idx_code_date ON t_day (code, date);`,
                [],
                function (result) {
                  console.log("创建索引成功", result);
                  resolve(db);
                },
                function (err) {
                  console.error("创建索引失败", err);
                  reject(err);
                }
              );
            },
            function (err) {
              console.error("创建表失败", err);
              reject(err);
            }
          );
        });
      } else {
        resolve(db);
      }
    })
  }
})();

/**
 * 拼接插入SQL
 * @param tableName
 * @param data
 * @param columns
 * @returns {{params: *[], sql: string}}
 */
function useInsertSql(tableName, data, columns) {
  if (!columns) {
    columns = Object.keys(data[0]);
  }
  // language=SQL format=false
  let insertSql = `INSERT INTO ${tableName} (${columns.join(",")}) VALUES `;
  const params = [];
  data.forEach(item => {
    insertSql += `(${columns.map(() => "?").join(",")}),\n`
    columns.forEach(key => {
      params.push(item[key]);
    });
  })
  insertSql = insertSql.slice(0, -2);
  insertSql += ";"
  return { sql: insertSql, params };
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
