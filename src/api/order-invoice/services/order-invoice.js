'use strict';

/**
 * order-invoice service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::order-invoice.order-invoice');
