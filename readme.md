# 前端跑sqlite测试

## 启动方法

前提: 
- 安装 `nodejs` [下载地址](https://nodejs.org/)
- 在代码仓库 `release` 页面下载 `sqlite.zip` 文件

```bash
# 下载代码, 并将下载的 sqlite.zip 解压到 src/public 文件夹
git clone xxxxxx

# 安装依赖
npm install

# 启动项目, 命令行会输出项目地址, 请在浏览器中打开
npm start
```

## 核心依赖

### 前端
[echarts](https://echarts.apache.org/zh) # 图表库

[SQL.js](https://sql.js.org/) # sqlite数据库


### 后端

[Knex.js](https://knexjs.org/) # 数据库操作库

[Koa](https://github.com/koajs/koa) # `nodejs`后端框架

[koa-router](https://github.com/koajs/router) # 路由中间件

[koa-static](https://github.com/koajs/static) # 静态资源中间件

## TODO

- [ ] `SQL.js` 在主进程同步运行会阻塞主进程, 可使用 [`web worker`](https://sql.js.org/#/?id=use-as-web-worker)

- [ ] http 压缩, 缓存。 可使用 `zlib` 模块压缩 `.sqlite` 文件

- [ ] 使用 `IndexedDB` 存储数据, `IndexedDB` 不仅可以储存字符串, 还可以储存二进制数据（`ArrayBuffer` 对象和 `Blob` 对象）。

- [ ] `SQL.js` 的 `export` 方法可以导出数据库, 是否可以存到 `IndexedDB` 实现增量更新?

- [ ] 数据同步问题, 增量还是全量? 增量如何校验数据?

- [ ] 数据安全问题