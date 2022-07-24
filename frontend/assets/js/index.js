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
