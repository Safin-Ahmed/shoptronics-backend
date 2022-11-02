module.exports = {
  async afterCreate(event) {
    console.log("Review Created");
    const { result, params } = event;
    const review = await strapi.entityService.findOne(
      "api::review.review",
      result.id,
      {
        populate: ["product"],
      }
    );
    await strapi
      .service("api::product.product")
      .calculateAverageRating(review.product.id);
  },

  async afterUpdate(event) {
    console.log("Review Updated");
    const { result, params } = event;
    const review = await strapi.entityService.findOne(
      "api::review.review",
      result.id,
      {
        populate: ["product"],
      }
    );
    await strapi
      .service("api::product.product")
      .calculateAverageRating(review.product.id);
  },
};
