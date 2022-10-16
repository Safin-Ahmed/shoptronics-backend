module.exports = {
    routes: [
      {
        method: "POST",
        path: "/orders/build",
        handler: "build.generate",
        config: {
          policies: [],
          middlewares: [],
        },
      },
    ],
  };