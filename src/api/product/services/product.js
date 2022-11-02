"use strict";

/**
 * product service
 */

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService("api::product.product", ({ strapi }) => ({
  async calculateAverageRating(id) {
    const currentProduct = await strapi.entityService.findOne(
      "api::product.product",
      id,
      {
        populate: ["reviews"],
      }
    );

    const averageRating = Math.floor(
      currentProduct?.reviews?.reduce((acc, cur) => {
        return (acc += cur.rating);
      }, 0) / currentProduct?.reviews.length
    );

    console.log({
      averageRating,
      currentProduct,
      reviews: currentProduct.reviews,
    });

    return strapi.entityService.update("api::product.product", id, {
      data: {
        averageRating,
      },
    });
  },
}));
