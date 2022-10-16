module.exports = {
    generate: async (ctx, next) => {
        try {
            const { firstName, lastName, email, phone, address, note, customerId, paymentMethod, products } = ctx.request.body;

            


            // PRODUCT PRICE CALCULATION
            let subTotal = 0;
            const deliveryFee = 100;
            for (let i = 0; i < products.length; i++) {
                const product = await strapi.services["api::product.product"].findOne(products[i]);
                subTotal += product.discountPrice || product.price;
            }


            // CREATE INVOICE
            const invoice = {
                subTotal,
                deliveryFee,
                totalPrice: subTotal + deliveryFee,
                products
            }
            const createInvoice = await strapi.services["api::order-invoice.order-invoice"].create({ data: invoice });


            // FIND ORDER STATUS PENDING ID
            let pendingOrderStatusId = 0;
            const allOrderStatus = await strapi.services["api::order-status.order-status"].find();
            const orderStatus = allOrderStatus.results;

            for(let i=0;  i < orderStatus.length; i++){
                if(orderStatus[i].orderStatus === 'pending'){
                    pendingOrderStatusId = orderStatus[i].id;
                }
            }



            // CREATE ORDER
            const productObj = {
                firstName,
                lastName,
                email,
                phone,
                address,
                note,
                customerId, //Customer id will get from user auth token
                paymentMethod,
                invoice: createInvoice.id,
                orderStatus: pendingOrderStatusId,
                products,
            }
            const createOrder = await strapi.services["api::order.order"].create({ data: productObj });
            ctx.send({ message: "Order created successfully!", payload: createOrder });
        } catch (e) {
            ctx.send({ error: e });
        }
    },
};