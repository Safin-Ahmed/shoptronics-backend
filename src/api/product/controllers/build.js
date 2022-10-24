const { faker } = require("@faker-js/faker");
module.exports = {
  generate: async (ctx, next) => {
    try {
      const { _id } = ctx.params;
      const product = await strapi.services["api::product.product"].findOne(
        _id,
        {
          populate: {
            attributes: {
              populate: "*",
            },
            options: {
              populate: "*",
            },
          },
        }
      );

      if (!product || !_id) {
        return ctx.send({ msg: "Bad Request!" });
      }

      // [['XL', 'XXL', 'XXL'], ["red", "blue", "green"]]
      const generateCombination = (arr) => {
        return arr.reduce(
          (acc, cur) => {
            return acc
              .map((x) => {
                return cur.map((y) => {
                  return x.concat([y]);
                });
              })
              .flat();
          },
          [[]]
        );
      };

      const capitalize = (str) => {
        if (typeof str !== "string") return;

        return str
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      };

      const { attributes, options } = product;

      const variationShape = attributes.map((attr) => {
        return options
          .filter((option) => option.attribute.name === attr.name)
          .map((option) => option.name);
      });

      const variations = generateCombination(variationShape);

      const records = variations.map((variation) => {
        // ["Red", "256-gb-ram"]
        const title = variation.reduce(
          (acc, cur) => acc + " " + cur,
          product.title
        );

        const slug = variation.reduce(
          (acc, cur) => (acc + "-" + cur.replace(/ /g, "-")).toLowerCase(),
          product.slug
        );

        const imgUrl = faker.image.abstract(800, 800, true);

        return {
          title: capitalize(title),
          description: product.description,
          price: product.price,
          discountPrice: product.discountPrice ?? null,
          imgUrl,
          slug,
          product: product.id,
          stock: Math.floor(Math.random() * (100 - 20 + 1) + 20),
        };
      });

      // Create All Records of Variation
      try {
        const createAllRecords = await Promise.all(
          records.map((record) => {
            return new Promise(async (resolve, reject) => {
              try {
                const created = await strapi.services[
                  "api::variation.variation"
                ].create({
                  data: record,
                });
                resolve(created);
              } catch (e) {
                reject(e);
              }
            });
          })
        );
      } catch (e) {
        console.error(e);
      }
    } catch (e) {
      return ctx?.send({ error: e });
    }
  },
};
