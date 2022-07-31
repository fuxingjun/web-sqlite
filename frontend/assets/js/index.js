document.querySelector(".button-refresh").addEventListener("click", refreshChart);

/**
 * 模式 "1"-后端库 "2"-前端库 "3"-前端分库
 */
let globalModel;

/**
 * 刷新按钮方法
 */
function refreshChart() {
  // 记录模式
  globalModel = getModel();
  let chartsContainer = document.querySelector(".charts-container .charts-wrapper");
  let chartsDOM = document.querySelectorAll(".charts-container .charts-wrapper .base-chart");
  let chartsList = Array.prototype.slice.call(chartsDOM);
  let codeList = document.querySelector(".form-wrapper .code-input").value.split(",");
  // base-chart数量不够 创建插入
  if (chartsList.length < codeList.length) {
    let wrapper = document.createDocumentFragment();
    for (let i = chartsList.length, len = codeList.length; i < len; i++) {
      let chartDOM = document.createElement("base-chart");
      chartDOM.classList.add("base-chart");
      chartDOM.setAttribute("code", codeList[i].trim());
      wrapper.appendChild(chartDOM);
      chartDOM = null;
    }
    chartsContainer.appendChild(wrapper);
    wrapper = null;
  } else {
    // 移除多余的 base-chart
    for (let i = codeList.length, len = chartsList.length; i < len; i++) {
      chartsContainer.removeChild(chartsList[i]);
    }
    chartsList.length = codeList.length;
    // 修改传入 base-chart 的 code
    chartsList.forEach((baseChart, index) => {
      baseChart.setAttribute("code", codeList[index].trim());
    });
  }
  chartsContainer = null;
  chartsDOM = null;
  chartsList = null;
}

function getModel() {
  return document.querySelector(".form-wrapper input[name='model']:checked").value;
}

document.querySelector("#log-container .button-clear-log").addEventListener("click", clearLog);

/**
 * 清除日志
 */
function clearLog() {
  document.querySelector("#log-container .log-wrapper").innerHTML = "";
}

/**
 * 从前端数据库查询数据,准备同步到 IndexedDB 或者Web SQL
 * @returns {Promise<null|*>}
 */
async function listDailyFromSQLite() {
  let id = 0;
  const limit = 100000;
  let startTime = performance.now();
  const db = await useSQL(`/sqlite/kLine.sqlite`);
  const result = db.exec('SELECT * FROM t_day WHERE id > $id LIMIT $limit', { $id: id, $limit: limit });
  // console.log("listDailyFromLocalDBLimit", id, result);
  if (!result[0]) return null;
  const { columns, values } = result[0];
  const data = values.map(valueList => {
    return valueList.reduce((total, current, index) => {
      total[toHump(columns[index])] = current;
      return total;
    }, {});
  });
  pageLogger(`查询${data.length}条并处理耗时:${(performance.now() - startTime).toFixed(2)}`);
  return data;
}

document.querySelector(".button-insert-IndexedDB").addEventListener("click", insertToIndexedDB);

/**
 * 从前端数据库查询数据,同步到 IndexedDB
 * @returns {null|*}
 */
async function insertToIndexedDB() {
  listDailyFromSQLite().then(data => {
    if (!data) return;
    const len = data.length;
    // console.log("listDailyFromLocalDBLimit", id, data);
    const startTime = performance.now();
    const dexieDB = useKLineDB();
    dexieDB.t_day.bulkAdd(data).then(function (lastKey) {
      console.log(`Done adding ${len} raindrops all over the place`);
      console.log("Last raindrop's id was: " + lastKey); // Will be 100000.
    }).catch(Dexie.BulkError, function (e) {
      // Explicitely catching the bulkAdd() operation makes those successful
      // additions commit despite that there were errors.
      console.error("Some raindrops did not succeed. However, " +
        len - e.failures.length + " raindrops was added successfully");
    }).finally(() => {
      pageLogger(`插入${len}条数据耗时:${(performance.now() - startTime).toFixed(2)}`);
    });
  })
}

document.querySelector(".button-insert-WebSQL").addEventListener("click", insertToWebSQLLimit);

/**
 * 从前端数据库查询数据, 同步到 Web SQL
 * @returns {null|*}
 */
async function insertToWebSQLLimit() {
  listDailyFromSQLite().then(data => {
    const len = data.length;
    // console.log("listDailyFromLocalDBLimit", id, data);
    const startTime = performance.now();
  })
}

const useWebSQL = (function () {
  let db;
  return function () {
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
              },
              function (err) {
                console.error("创建索引失败", err);
              }
            );
          },
          function (err) {
            console.error("创建表失败", err);
          }
        );
      });
    }
    return db;
  }
})();

