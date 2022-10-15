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
          },
        }
      );

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

      console.log({ product });

      ctx.send({ message: "OK", product });
    } catch (e) {
      ctx.send({ error: e });
    }
  },
};
