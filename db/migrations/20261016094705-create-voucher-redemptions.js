'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('voucher_redemptions', {
      redemption_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
      },
      voucher_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'voucher_catalog', key: 'voucher_id' },
      },
      processed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
      },
      exp_cost_snapshot: { type: Sequelize.INTEGER, allowNull: false },
      status: { type: Sequelize.STRING(12), allowNull: false, defaultValue: 'PENDING' },
      requested_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      processed_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addConstraint('voucher_redemptions', { type: 'check', name: 'ck_voucher_redemptions_exp_cost_snapshot', fields: ['exp_cost_snapshot'], where: { exp_cost_snapshot: { [Sequelize.Op.gt]: 0 } } });
    await queryInterface.addConstraint('voucher_redemptions', { type: 'check', name: 'ck_voucher_redemptions_status', fields: ['status'], where: { status: { [Sequelize.Op.in]: ['PENDING', 'APPROVED', 'REJECTED', 'ISSUED', 'CANCELLED'] } } });

    await queryInterface.addIndex('voucher_redemptions', ['user_id'], {
      name: 'uq_voucher_redemptions_pending_user',
      unique: true,
      where: { status: { [Sequelize.Op.eq]: 'PENDING' } },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('voucher_redemptions');
  },
};