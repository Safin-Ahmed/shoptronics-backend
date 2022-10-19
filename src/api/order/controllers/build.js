module.exports = {
    generate: async (ctx, next) => {
        try {
            const { firstName, lastName, email, phone, address, note, paymentMethod, cart } = ctx.request.body;
            /*
            [
                {
                    "productId": 1,
                    "quantity": 2,
                    "variantId": 1
                },
                {
                    "productId": 4,
                    "quantity": 3,
                    "variantId": 2
                }
            ]
            */

            const productIds = [];
            const variationIds = [];
            const quantity = [];



            // PRODUCT PRICE CALCULATION
            let subTotal = 0;
            const deliveryFee = 100;
            for (let i = 0; i < cart.length; i++) {

                // CHECK PRODUCT QUANTITY AVAILABILITY
                if (cart[i].quantity < 1) {
                    return ctx.throw(400, 'You have to add minimum quantity!');
                }



                // GET USER SELECTED VARIANT
                const variant = await strapi.services["api::variation.variation"].findOne(cart[i].variantId);
                if (cart.variantId && variant) {
                    if (variant.stock < cart[i].quantity) {
                        return ctx.throw(400, 'Stock Unavailable!');
                    }
                    subTotal += (variant.discountPrice || variant.price) * cart[i].quantity


                    // MINUS STOCK
                    await strapi.services["api::variation.variation"].update(variant.id, { data: { stock: variant.stock - cart[i].quantity } })

                } else {
                    const product = await strapi.services["api::product.product"].findOne(cart[i].productId);

                    if (product.stock < cart[i].quantity) {
                        return ctx.throw(400, 'Stock Unavailable!');
                    }

                    subTotal += (variant.discountPrice || variant.price) * cart[i].quantity


                    // MINUS STOCK
                    await strapi.services["api::product.product"].update(product.id, { data: { stock: product.stock - cart[i].quantity } })
                }



                // PUSH PRODUCT ID, VARIANT, QUANTITY AND STOCKS
                productIds.push(cart[i].productId);
                variationIds.push(cart[i].variantId);
                quantity.push(cart[i].quantity);
            }



            // CREATE INVOICE
            const invoice = {
                subTotal,
                deliveryFee,
                totalPrice: subTotal + deliveryFee,
                products: productIds,
                variations: variationIds,
                quantity
            }
            const createInvoice = await strapi.services["api::order-invoice.order-invoice"].create({ data: invoice });


            // CREATE ORDER
            const productObj = {
                firstName,
                lastName,
                email,
                phone,
                address,
                note,
                customer: ctx.state.user.id,
                invoice: createInvoice.id,
                paymentMethod,
                orderStatus: "pending",
                products: productIds,
            }
            const createOrder = await strapi.services["api::order.order"].create({ data: productObj });

            ctx.send({ message: "Order created successfully!", payload: createOrder });
        } catch (e) {
            ctx.send({ error: e });
        }
    },
};