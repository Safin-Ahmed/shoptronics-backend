const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
/**
 * Given a dollar amount, return the amount in cents
 * @param {number} number
 * @returns
 */
const fromDecimalToInt = (number) => parseInt(number * 100);

module.exports = {
  generate: async (ctx, next) => {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        address,
        note,
        paymentMethod,
        cartProducts,
      } = ctx.params.data;

      // PRODUCT PRICE CALCULATION
      let subTotal = 0;
      const orderDetailObjs = [];
      const deliveryFee = ctx.params.data.deliveryFee;
      console.log({ deliveryFee });
      for (let i = 0; i < cartProducts.length; i++) {
        let product;
        if (!cartProducts[i].variantId) {
          product = await strapi.services["api::product.product"].findOne(
            cartProducts[i].id
          );
        } else {
          product = await strapi.services["api::variation.variation"].findOne(
            cartProducts[i].variantId
          );
        }

        if (
          cartProducts[i].quantity < 1 ||
          cartProducts[i].quantity > product.stock
        ) {
          return ctx.throw(400, "Stock Unavailable!");
        }

        // Stock Management
        if (!cartProducts[i].variantId) {
          await strapi.services["api::product.product"].update(product.id, {
            data: { stock: product.stock - cartProducts[i].quantity },
          });
        } else {
          await strapi.services["api::variation.variation"].update(
            cartProducts[i].variantId,
            {
              data: { stock: product.stock - cartProducts[i].quantity },
            }
          );
        }

        subTotal +=
          (product.discountPrice || product.price) * cartProducts[i].quantity;

        orderDetailObjs.push({
          product: cartProducts[i].id,
          variation: cartProducts[i].variantId,
          price: product.price,
          discountPrice: product.discountPrice,
          quantity: cartProducts[i].quantity,
        });
      }

      const orderObj = {
        firstName,
        lastName,
        email,
        phone,
        address,
        note,
        customer: ctx.params.user.id,
        paymentMethod,
        orderStatus: "pending",
        subTotal,
        total: subTotal + deliveryFee,
        deliveryFee,
      };

      const createOrder = await strapi.services["api::order.order"].create({
        data: orderObj,
      });

      // Create All Records of OrderDetail

      try {
        const createAllRecords = await Promise.all(
          orderDetailObjs.map((detail) => {
            console.log({ detail });
            return new Promise(async (resolve, reject) => {
              try {
                const created = await strapi.services[
                  "api::order-detail.order-detail"
                ].create({
                  data: { order: createOrder.id, ...detail },
                });
                resolve(created);
              } catch (e) {
                console.error(e);
                reject(e);
              }
            });
          })
        );
        console.log({ createOrder });
        return createOrder;
      } catch (e) {
        ctx.throw(400, { msg: "Order creation error" });
        console.error(e);
      }
    } catch (e) {
      console.error(e);
      ctx.send({ error: e });
    }
  },

  createStripe: async (ctx, next) => {
    const {
      cartProducts,
      firstName,
      lastName,
      email,
      phone,
      address,
      note,
      paymentMethod,
      deliveryFee,
    } = ctx.params.data;

    const { user, origin } = ctx.params;
    const realProducts = [];
    let subTotal = 0;
    for (let i = 0; i < cartProducts.length; i++) {
      let product;
      if (!cartProducts[i].variantId) {
        product = await strapi.services["api::product.product"].findOne(
          +cartProducts[i].id
        );
      } else {
        product = await strapi.services["api::variation.variation"].findOne(
          +cartProducts[i].variantId
        );
      }

      if (
        cartProducts[i].quantity < 1 ||
        cartProducts[i].quantity > product.stock
      ) {
        return ctx.throw(400, "Stock Unavailable!");
      }

      realProducts.push(product);
      subTotal +=
        (product.discountPrice || product.price) * cartProducts[i].quantity;
    }
    console.log({ cartProducts });
    const lineItems = realProducts.reduce((acc, cur) => {
      const cartProduct = cartProducts.find(
        (item) => +item.variantId || +item.id === +cur.id
      );
      console.log({ cartProduct, realProduct: cur });
      acc.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: cur.title,
          },
          unit_amount: fromDecimalToInt(cur.discountPrice || cur.price),
        },
        quantity: cartProduct.quantity,
      });

      return acc;
    }, []);

    const BASE_URL = origin || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: user.email,
      mode: "payment",
      success_url: `${BASE_URL}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: BASE_URL,
      line_items: lineItems,
    });

    // Create the order
    const orderObj = {
      firstName,
      lastName,
      email,
      phone,
      address,
      note,
      customer: ctx.params.user.id,
      paymentMethod,
      orderStatus: "pending",
      subTotal,
      total: subTotal + deliveryFee,
      deliveryFee,
      checkout_session: session.id,
    };

    const createOrder = await strapi.services["api::order.order"].create({
      data: orderObj,
    });

    return createOrder;
  },
};
