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
 * @param db
 * @param code
 * @returns {null|*}
 */
function listDailyFromLocalDB(db, code) {
  const result = db.exec(`SELECT *
                          FROM t_stock
                          WHERE code = $code`, { $code: code });
  // console.log("listDailyFromLocalDB", code, result);
  if (!result[0]) return null;
  const { columns, values } = result[0];
  return values.map(valueList => {
    return valueList.reduce((total, current, index) => {
      total[toHump(columns[index])] = current;
      return total;
    }, {});
  });
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
