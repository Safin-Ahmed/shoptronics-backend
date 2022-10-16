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
          (acc, cur) => acc + "-" + cur.replace(/ /g, "-"),
          product.slug
        );

        return {
          title: capitalize(title),
          description: product.description,
          price: product.price,
          discountPrice: product.discountPrice ?? null,
          image: null,
          slug,
          product: product.id,
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
        return ctx.send({
          msg: "Variation creation successful!",
          createAllRecords,
        });
      } catch (e) {
        console.error(e);
      }
    } catch (e) {
      return ctx.send({ error: e });
    }
  },
};
