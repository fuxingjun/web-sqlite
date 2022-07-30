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
  .use(serve(path.resolve(__dirname, "./public"), {
    // Browser cache max-age in milliseconds. defaults to 0
    maxage: 0,
    // Try to serve the gzipped version of a file automatically when gzip is supported by a client and if the requested file with .gz extension exists. defaults to true.
    gzip: true,
    // Function to set custom headers on response. https://github.com/koajs/send#setheaders
    // setHeaders(res, path, stats) {

    // },
  }))
  .use(router.routes())
  .listen(3008);

console.log('listening on port 3008');
