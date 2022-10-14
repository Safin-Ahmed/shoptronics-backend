'use strict';

/**
 * attribute service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::attribute.attribute');
