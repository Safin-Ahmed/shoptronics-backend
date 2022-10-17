module.exports = {
  routes: [
    {
      method: "GET",
      path: "/products/:_id/build",
      handler: "build.generate",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
