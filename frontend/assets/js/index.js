document.querySelector(".button-refresh").addEventListener("click", refreshChart);

/**
 * 模式 "1"-后端库 "2"-前端库 "3"-前端分库 "4"-indexedDB "5"-Web SQL
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
async function listDailyFromSQLite(startId = 0, limit = 2000) {
  let startTime = performance.now();
  const db = await useSQL(`/sqlite/kLine.sqlite`);
  const result = db.exec('SELECT * FROM t_day WHERE id > $id LIMIT $limit', { $id: startId, $limit: limit });
  // console.log("listDailyFromLocalDBLimit", id, result);
  if (!result[0]) return null;
  const { columns, values } = result[0];
  const data = values.map(valueList => {
    return valueList.reduce((total, current, index) => {
      total[columns[index]] = current;
      return total;
    }, {});
  });
  pageLogger(`查询${data.length}条并处理耗时:${(performance.now() - startTime).toFixed(2)}`);
  return data;
}

const timeStore = {
  indexDBStartTime: 0,
  webSQLStartTime: 0,
}

document.querySelector(".button-insert-IndexedDB").addEventListener("click", () => {
  timeStore.indexDBStartTime = performance.now();
  insertToIndexedDBLimit(0, 2000)
});

/**
 * 从前端数据库查询数据,同步到 IndexedDB
 * @returns {null|*}
 */
async function insertToIndexedDBLimit(startId, limit) {
  return listDailyFromSQLite(startId, limit).then(data => {
    if (!data) return;
    const len = data.length;
    if (len === 0) return;
    // console.log("listDailyFromLocalDBLimit", id, data);
    const startTime = performance.now();
    const dexieDB = useKLineDB();
    return dexieDB.t_day.bulkAdd(data).then(function (lastKey) {
      console.log(`Done adding ${len} raindrops all over the place`);
      console.log("Last raindrop's id was: " + lastKey); // Will be 100000.
      pageLogger(`插入${len}条数据耗时:${(performance.now() - startTime).toFixed(2)}`);
      if (len === limit) {
        return insertToIndexedDBLimit(data[len - 1].id, limit);
      } else {
        pageLogger(`插入到IndexDB总耗时:${(performance.now() - timeStore.indexDBStartTime).toFixed(2)}`);
      }
    }).catch(Dexie.BulkError, function (e) {
      // Explicitly catching the bulkAdd() operation makes those successful
      // additions commit despite that there were errors.
      console.error("Some raindrops did not succeed. However, " +
        len - e.failures.length + " raindrops was added successfully");
    }).finally(() => {
      //
    });
  })
}

document.querySelector(".button-insert-WebSQL").addEventListener("click", () => {
  timeStore.webSQLStartTime = performance.now();
  insertToWebSQLLimit(0, 2000)
});

/**
 * 从前端数据库查询数据, 同步到 Web SQL
 * @returns {null|*}
 */
async function insertToWebSQLLimit(startId, limit) {
  return listDailyFromSQLite(startId, limit).then(data => {
    // 这里数据量太大会触发 `could not prepare statement (1 too many SQL variables)` 错误
    const len = data.length;
    // console.log("listDailyFromLocalDBLimit", id, data);
    const startTime = performance.now();
    return useWebSQL().then(db => {
      // console.log("useWebSQL", db)
      const columns = Object.keys(data[0]).filter(key => key !== "id");
      db.transaction(function (tx) {
        const { sql, params } = useInsertSql(`t_day`, data, columns)
        // console.log("useInsertSql", sql)
        tx.executeSql(
          sql,
          params,
          function () {
            pageLogger(`插入${len}条数据耗时:${(performance.now() - startTime).toFixed(2)}`);
            if (len === 2000) {
              return insertToWebSQLLimit(data[len - 1].id, limit);
            } else {
              pageLogger(`插入到Web SQL总耗时:${(performance.now() - timeStore.webSQLStartTime).toFixed(2)}`);
            }
          },
          function (tx, error) {
            console.error(error);
            console.error(`插入${len}条数据错误, 耗时: ${(performance.now() - startTime).toFixed(2)}`);
          }
        );
      });
    });
  })
}
