"use strict";

/**
 * product controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::product.product", ({ strapi }) => {
  return {
    async find(ctx, next) {
      const allProducts = await strapi.db
        .query("api::product.product")
        .findMany();
      return (ctx.body = {
        message: "Hello World",
      });
    },
  };
});
