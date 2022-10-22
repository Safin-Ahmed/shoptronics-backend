"use strict";
const { faker } = require("@faker-js/faker");

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    const count = await strapi.db.query("api::product.product").count();
    console.log({ count });
    if (count > 0) {
      return;
    }

    for (let i = 0; i < 100; i++) {
      const title = faker.helpers.unique(faker.commerce.productName);
      const slug = faker.helpers.slugify(title.toLowerCase());
      await strapi.entityService.create("api::product.product", {
        data: {
          title,
          description: faker.commerce.productDescription(),
          price: faker.commerce.price(),
          discountPrice:
            faker.helpers.maybe(() => faker.commerce.price(), {
              probability: 0.5,
            }) || null,
          isTrending: faker.helpers.maybe(() => true, { probability: 0.3 }),
          stock: Math.floor(Math.random() * (100 - 20 + 1) + 20),
        },
      });
    }
  },
};
