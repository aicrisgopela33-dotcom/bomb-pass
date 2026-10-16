'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('voucher_catalog', {
      voucher_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
      },
      name: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      exp_cost: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 100 },
      stock_limit: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });

    await queryInterface.addConstraint('voucher_catalog', { type: 'check', name: 'ck_voucher_catalog_exp_cost', fields: ['exp_cost'], where: { exp_cost: { [Sequelize.Op.gt]: 0 } } });
    await queryInterface.addConstraint('voucher_catalog', { type: 'check', name: 'ck_voucher_catalog_stock_limit', fields: ['stock_limit'], where: { stock_limit: { [Sequelize.Op.gte]: 0 } } });

    await queryInterface.addIndex('voucher_catalog', ['is_active'], { name: 'idx_voucher_catalog_is_active' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('voucher_catalog');
  },
};