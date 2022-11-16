"use strict";
const { faker } = require("@faker-js/faker");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
          productBySlug(slug: String!): ProductEntityResponse
        }
      `,
      resolvers: {
        Query: {
          productBySlug: {
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

      resolversConfig: {
        "Query.productBySlug": {
          auth: false,
        },
      },
    }));

    extensionService.use(({ strapi }) => ({
      typeDefs: `
        type Mutation {
          buildOrder(order: OrderData): OrderEntityResponse
        }

        input CartProduct {
          id: ID,
          variantId: ID,
          quantity: Int
        }

        input OrderData {
          firstName: String,
          lastName: String,
          email: String,
          phone: String,
          address: String,
          note: String,
          paymentMethod: String,
          deliveryFee: Int,
          cartProducts: [CartProduct]
        }

        
      `,
      resolvers: {
        Mutation: {
          buildOrder: {
            resolve: async (parent, args, context) => {
              if (!context.state.user) {
                return {
                  msg: "Not Authorized!",
                };
              }
              console.log(
                "CTX USER from Resolver: ",
                context.koaContext.request.header.origin
              );
              let data;
              if (args.order.paymentMethod === "Stripe") {
                data = await strapi.controllers[
                  "api::order.build"
                ].createStripe({
                  params: {
                    data: args.order,
                    user: context.state.user,
                    origin: context.koaContext.request.header.origin,
                  },
                });
              } else {
                data = await strapi.controllers["api::order.build"].generate({
                  params: {
                    data: args.order,
                    user: context.state.user,
                  },
                });
              }
              const { toEntityResponse } = strapi.service(
                "plugin::graphql.format"
              ).returnTypes;

              const response = toEntityResponse(data);
              console.log({ data, response });
              return response;
            },
          },
        },
      },
      resolversConfig: {
        "Mutation.buildOrder": {
          auth: false,
        },
      },
    }));

    extensionService.use(({ strapi }) => ({
      typeDefs: `
        type Query {
          confirmSession(session: String!): OrderEntityResponse
        }
      `,
      resolvers: {
        Query: {
          confirmSession: {
            resolve: async (parent, args, context) => {
              const { toEntityResponse } = strapi.service(
                "plugin::graphql.format"
              ).returnTypes;
              const checkout_session = args.session;
              const session = await stripe.checkout.sessions.retrieve(
                checkout_session
              );

              if (session.payment_status === "paid") {
                const order = await strapi.services["api::order.order"].find({
                  filters: { checkout_session },
                });
                const updatedOrder = await strapi.entityService.update(
                  "api::order.order",
                  order.results[0].id,
                  {
                    data: {
                      status: "confirmed",
                    },
                  }
                );

                const response = toEntityResponse(updatedOrder);

                return response;
              } else {
                return {
                  error: "The payment was not successful",
                };
              }
            },
          },
        },
      },
      resolversConfig: {
        "Query.confirmSession": {
          auth: true,
        },
      },
    }));

    extensionService.use(({ strapi }) => ({
      typeDefs: `
        type Mutation {
          deleteWishlistByProductId(productId: ID!): WishlistEntityResponse
        }        
      `,
      resolvers: {
        Mutation: {
          deleteWishlistByProductId: {
            resolve: async (parent, args, context) => {
              if (!context.state.user) {
                return {
                  msg: "Not Authorized!",
                };
              }

              const userId = context.state.user.id;
              const data = await strapi.service("api::wishlist.wishlist").find({
                filters: {
                  users_permissions_user: userId,
                  product: args.productId,
                },
              });

              if (!data.results[0] || !data) {
                return null;
              }

              const deleted = await strapi.entityService.delete(
                "api::wishlist.wishlist",
                data.results[0].id
              );
              const { toEntityResponse } = strapi.service(
                "plugin::graphql.format"
              ).returnTypes;

              const response = toEntityResponse(deleted);
              return response;
            },
          },
        },
      },
      resolversConfig: {
        "Mutation.buildOrder": {
          auth: false,
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
      const regularPrice = faker.commerce.price();

      const create = await strapi.entityService.create("api::product.product", {
        data: {
          title,
          slug,
          description: faker.commerce.productDescription(),
          price: regularPrice,
          discountPrice:
            faker.helpers.maybe(
              () => faker.commerce.price(undefined, regularPrice - 100),
              {
                probability: 0.5,
              }
            ) || null,
          isTrending: faker.helpers.maybe(() => true, { probability: 0.3 }),
          stock: Math.floor(Math.random() * (100 - 0 + 1) + 0),
          attributes: productAttributes,
          options: productAttributeTerms,
          categories: mainCategories,
          sub_categories: subCategories,
          imgUrl,
          brand: faker.helpers.arrayElement(brands),
          stockStatus: faker.helpers.arrayElement(["in-stock", "out-of-stock"]),
        },
      });

      const allProducts = await strapi.entityService.findMany(
        "api::product.product"
      );

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

      const relatedProducts = allProducts.filter(
        (item) => item.id !== create.id
      );

      await strapi.entityService.update("api::product.product", create.id, {
        data: {
          relatedProducts: faker.helpers.arrayElements(relatedProducts),
        },
      });
    }
  },
};
