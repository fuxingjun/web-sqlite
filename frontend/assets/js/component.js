/**
 * 图表组件
 */
class BaseChart extends HTMLElement {
  constructor() {
    super();
    let shadow = this.attachShadow({ mode: 'closed' });
    let templateElem = document.getElementById('chartTemplate');
    let content = templateElem.content.cloneNode(true);
    shadow.appendChild(content);
    templateElem = null;
    content = null;
    this.$root = shadow;
    // 绑定 this 否则 resize 触发时 this 指向 window
    this.resize = this.resize.bind(this);
  }

  /**
   * echarts 初始化
   */
  init() {
    let container = this.$root.querySelector(".container");
    this.echartsInstance = echarts.init(container);
    window.addEventListener("resize", this.resize);
    container = null;
  }

  showLoading() {
    let dom = this.$root.querySelector(".loading-mask");
    dom.classList.add("loading");
    dom.classList.remove("hidden");
    dom = null;
  }

  hideLoading() {
    let dom = this.$root.querySelector(".loading-mask");
    dom.classList.remove("loading");
    dom.classList.add("hidden");
    dom = null;
  }

  /**
   * 将请求数据合成 echarts 配置
   * @param data
   * @returns {*}
   */
  static mergeOption(data) {
    if (!data || data.length === 0) {
      return null;
    }
    // data = calcMA(data);
    const xData = [];
    const yData = [];
    const ma5 = [];
    const ma10 = [];
    const ma20 = [];
    data.forEach(item => {
      xData.push(item.date);
      yData.push(item.closePrice);
      ma5.push(item.ma5);
      ma10.push(item.ma10);
      ma20.push(item.ma20);
    });
    return {
      title: {
        // text: `${data[0].code}/${data[0].name}`,
        text: `${data[0].code}`,
      },
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        show: true,
        // data: ['收盘价', 'ma5']
      },
      dataZoom: [
        {
          id: 'dataZoomX',
          type: 'slider',
          xAxisIndex: [0],
          filterMode: 'filter'
        },
      ],
      xAxis: {
        type: 'category',
        data: xData,
      },
      yAxis: {
        type: 'value'
      },
      series: [
        { data: yData, type: 'line', name: '收盘价' },
        { data: ma5, type: 'line', name: 'MA5' },
        { data: ma10, type: 'line', name: 'MA10' },
        { data: ma20, type: 'line', name: 'MA20' },
      ]
    };
  }

  /**
   * 从后弹获取 echarts 配置
   * @param code
   * @returns {Promise<unknown>}
   */
  getOptionFromServer(code) {
    return new Promise((resolve, reject) => {
      getJSON(`/stock/daily/${code}`).then(data => {
        // console.log(data);
        if (data.length === 0) {
          reject("data is null");
        } else {
          resolve(BaseChart.mergeOption(data));
        }
      }).catch(err => {
        reject(err);
        alert(err?.message || err);
      });
    });
  }

  /**
   * 从本地获取echarts配置
   * @param code
   * @returns {Promise<unknown>}
   */
  getOptionFromLocalDB(code) {
    return new Promise((resolve, reject) => {
      if (globalModel === "4") {
        return listDailyFromIndexedDB(code).then(result => {
          resolve(BaseChart.mergeOption(result));
        }).catch(err => {
          reject(err);
        });
      } else if (globalModel === "5") {
        return listDailyFromWebSQL(code).then(result => {
          resolve(BaseChart.mergeOption(result));
        }).catch(err => {
          reject(err);
        });
      }
      const url = `/sqlite/${globalModel === "2" ? "kLine" : code}.sqlite`;
      // 因为除了第一次加载大部分操作是同步的, 导致阻塞, 看不到 loading 效果, 加上 setTimeout 可以看到 loading 效果
      setTimeout(() => {
        listDailyFromLocalDB(url, code).then(result => {
          // listDailyFromLocalDBWorker(url, code).then(result => {
          if (result) {
            resolve(BaseChart.mergeOption(result));
          } else {
            resolve(null);
          }
        });
      })
      // listDailyFromLocalDBWorker(url, code).then(result => {
      //   if (result) {
      //     resolve(BaseChart.mergeOption(result));
      //   } else {
      //     resolve(null);
      //   }
      // });
    });
  }

  resize() {
    // console.log("resize", this)
    this.echartsInstance?.resize?.();
  }

  /**
   * 当 custom element 首次被插入 DOM 时，被调用
   */
  connectedCallback() {
    this.init();
  }

  /**
   * 当 custom element 从 DOM 中删除时，被调用
   */
  disconnectedCallback() {
    window.removeEventListener("resize", this.resize);
  }

  /**
   * 传入的code变化时重新获取配置
   * @param code
   */
  codeChange(code) {
    console.log("codeChange", code);
    this.showLoading();
    const startTime = performance.now();
    this[globalModel === "1" ? "getOptionFromServer" : "getOptionFromLocalDB"](code).then(option => {
      if (!option) {
        this.echartsInstance.clear();
      } else {
        this.echartsInstance.setOption(option);
      }
    }).finally(() => {
      pageLogger(`${this.getAttribute("code")} 获取配置耗时: ${(performance.now() - startTime).toFixed(2)}`);
      this.hideLoading();
    });
  }

  /**
   * 设置监听变化的属性
   * @returns {string[]}
   */
  static get observedAttributes() {
    return ['code'];
  }

  /**
   * 属性变化的生命周期, 属性仅支持字符串, 对象会被转为 [object Object]
   * @param name
   * @param oldValue
   * @param newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    // console.log(name, oldValue, newValue);
    this[`${name}Change`]?.(newValue, oldValue);
  }
}

window.customElements.define("base-chart", BaseChart);
