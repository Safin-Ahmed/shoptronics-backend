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
            acc
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

      //   ctx.send({ message: "OK", product });
    } catch (e) {
      ctx.send({ error: e });
    }
  },
};
