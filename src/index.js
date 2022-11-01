"use strict";
const { faker } = require("@faker-js/faker");

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    const extensionService = strapi.service("plugin::graphql.extension");
    extensionService.use(({ strapi }) => ({
      typeDefs: `
        type Query {
          product(slug: String!): ProductEntityResponse
        }
      `,
      resolvers: {
        Query: {
          product: {
            resolve: async (parent, args, context) => {
              const { toEntityResponse } = strapi.service(
                "plugin::graphql.format"
              ).returnTypes;

              const data = await strapi.services["api::product.product"].find({
                filters: { slug: args.slug },
              });

              const response = toEntityResponse(data.results[0]);
              console.log({ result: data.results, response });

              return response;
            },
          },
        },
      },
    }));
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    const count = await strapi.db.query("api::product.product").count();
    const users = await strapi.entityService.findMany(
      "plugin::users-permissions.user"
    );
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
    console.log({ brands });

    if (
      count > 0 ||
      categories.length < 1 ||
      brands.length < 1 ||
      attributes.length < 1 ||
      attributesTerms.length < 1
    ) {
      return;
    }

    for (let i = 0; i < 100; i++) {
      const title = `${faker.helpers.arrayElement(
        brands.reduce((acc, cur) => {
          acc.push(cur?.name);
          return acc;
        }, [])
      )} ${faker.helpers.unique(faker.commerce.productName)}`;
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

      const mainCategories = faker.helpers.arrayElement(categories);
      const subCategories = faker.helpers.arrayElement(
        mainCategories.sub_categories
      );

      const imgUrl = faker.image.abstract(800, 800, true);

      const create = await strapi.entityService.create("api::product.product", {
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
          stock: Math.floor(Math.random() * (100 - 0 + 1) + 0),
          attributes: productAttributes,
          options: productAttributeTerms,
          categories: mainCategories,
          sub_categories: subCategories,
          imgUrl,
          brand: faker.helpers.arrayElement(brands),
        },
      });

      const allProducts = await strapi.entityService.findMany(
        "api::product.product"
      );

      const relatedProducts = allProducts.filter(
        (item) => item.id !== create.id
      );

      await strapi.entityService.update("api::product.product", create.id, {
        data: {
          relatedProducts: faker.helpers.arrayElements(relatedProducts),
        },
      });

      await strapi.entityService.create("api::review.review", {
        data: {
          user: faker.helpers.arrayElement(users),
          review: faker.lorem.paragraphs(),
          rating: faker.helpers.arrayElement([
            1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5,
          ]),
          product: faker.helpers.arrayElement(allProducts),
        },
      });
    }
  },
};
