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
            const productCurrentStocks = [];



            // PRODUCT PRICE CALCULATION
            let subTotal = 0;
            const deliveryFee = 100;
            for (let i = 0; i < cart.length; i++) {
                const product = await strapi.services["api::product.product"].findOne(cart[i].productId);


                // CHECK PRODUCT QUANTITY AVAILABILITY
                if (cart[i].quantity < 1) {
                    return ctx.throw(400, 'You have to add minimum quantity!');
                } else if (product.stock < cart[i].quantity) {
                    return ctx.throw(400, 'Stock Unavailable!');
                }



                // PUSH PRODUCT ID, VARIANT, QUANTITY AND STOCKS
                productIds.push(cart[i].productId);
                variationIds.push(cart[i].variantId);
                quantity.push(cart[i].quantity);
                productCurrentStocks.push(product.stock);


                // GET USER SELECTED VARIANT
                const variant = await strapi.services["api::variation.variation"].findOne(cart[i].variantId);



                // IF HAVE PRODUCT VARIANT PRICE TAKEN FROM VARIANT OTHERWISE PRICE TAKEN FROM MAIN PRODUCT
                if (variant) {
                    subTotal += (variant.discountPrice || variant.price) * cart[i].quantity;
                } else {
                    subTotal += (product.discountPrice || product.price) * cart[i].quantity;
                }
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



            // IF PRODUCT CREATED SUCCESSFULLY THEN MINUS PRODUCT STOCK
            for (let i = 0; productIds.length > i; i++) {
                await strapi.services["api::product.product"].update(productIds[i], { data: { stock: Number(productCurrentStocks[i]) - Number(cart[i].quantity) } })
            }


            ctx.send({ message: "Order created successfully!", payload: createOrder });
        } catch (e) {
            ctx.send({ error: e });
        }
    },
};