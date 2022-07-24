const Koa = require('koa');
const Router = require('@koa/router');
const serve = require('koa-static');
const path = require("path");
const useRouter = require("./router");

const app = new Koa();
const router = new Router();

useRouter(router);

app
  .use(serve(path.resolve(__dirname, "../frontend")))
  .use(serve(path.resolve(__dirname, "./public")))
  .use(router.routes())
  .listen(3008);

console.log('listening on port 3008');
