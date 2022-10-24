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
    const attributes = await strapi.entityService.findMany(
      "api::attribute.attribute"
    );
    const attributesTerms = await strapi.entityService.findMany(
      "api::attributeterm.attributeterm",
      {
        populate: ["attribute"],
      }
    );

    const categories = await strapi.entityService.findMany(
      "api::category.category",
      {
        populate: ["sub_categories"],
      }
    );

    const brands = await strapi.entityService.findMany("api::brand.brand");

    if (count > 0 || categories.length < 1 || brands.length < 1) {
      return;
    }

    for (let i = 0; i < 100; i++) {
      const title = faker.helpers.unique(faker.commerce.productName);
      const slug = faker.helpers.slugify(title.toLowerCase());
      const productAttributes =
        faker.helpers.maybe(() => faker.helpers.arrayElements(attributes), {
          probability: 0.5,
        }) || null;

      const productAttributeTerms = productAttributes
        ? productAttributes
            .map((item) =>
              attributesTerms.filter((term) => term.attribute.id === item.id)
            )
            .flat()
        : null;

      const mainCategories = faker.helpers.arrayElements(categories);
      const subCategories = faker.helpers
        .arrayElements(mainCategories.map((item) => item.sub_categories))
        .flat();

      const imgUrl = faker.image.abstract(800, 800, true);

      await strapi.entityService.create("api::product.product", {
        data: {
          title,
          slug,
          description: faker.commerce.productDescription(),
          price: faker.commerce.price(),
          discountPrice:
            faker.helpers.maybe(() => faker.commerce.price(), {
              probability: 0.5,
            }) || null,
          isTrending: faker.helpers.maybe(() => true, { probability: 0.3 }),
          stock: Math.floor(Math.random() * (100 - 20 + 1) + 20),
          attributes: productAttributes,
          options: productAttributeTerms,
          categories: mainCategories,
          sub_categories: subCategories,
          imgUrl,
          brand: faker.helpers.arrayElement(brands),
        },
      });
    }
  },
};
