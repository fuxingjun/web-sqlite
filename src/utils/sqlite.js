const knex = require("knex");
const path = require("path");

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

const useSqlite = (function () {
  let knexInstance;
  return function () {
    if (!knexInstance) {
      knexInstance = knex({
        client: 'better-sqlite3', // or 'sqlite3'
        connection: {
          filename: path.resolve(__dirname, `../public/sqlite/stock.sqlite`),
        },
        // sqlite does not support inserting default values. Set the `useNullAsDefault` flag to hide this warning.
        useNullAsDefault: true,
        postProcessResponse: (result, queryContext) => {
          // TODO: add special case for raw results
          // (depends on dialect)
          // 查询结果转驼峰
          if (Array.isArray(result)) {
            return result.map(row => convertToCamel(row));
          } else {
            return convertToCamel(result);
          }
        }
      });
    }
    return knexInstance;
  }
})();

module.exports = {
  useSqlite,
}
