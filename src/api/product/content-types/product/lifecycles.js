module.exports = {
  async afterCreate(event) {
    const { result, params } = event;
    if (result?.attributes?.length > 0 && result?.options?.length > 0) {
      await strapi.controllers["api::product.build"].generate({
        params: {
          _id: result?.id,
        },
      });
    }
  },
};
