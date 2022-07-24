# 前端跑sqlite测试

## 启动方法

前提: 
- 安装 `nodejs` [下载地址](https://nodejs.org/)
- 在代码仓库下载 `sqlite.zip` 文件

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
