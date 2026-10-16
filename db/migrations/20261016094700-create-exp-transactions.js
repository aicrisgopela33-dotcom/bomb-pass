'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('exp_transactions', {
      exp_transaction_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
      },
      session_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'game_sessions', key: 'session_id' },
      },
      amount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 },
      reason: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'SESSION_COMPLETION' },
      awarded_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });

    await queryInterface.addConstraint('exp_transactions', { type: 'check', name: 'ck_exp_transactions_amount', fields: ['amount'], where: { amount: { [Sequelize.Op.gt]: 0 } } });
    await queryInterface.addConstraint('exp_transactions', { type: 'check', name: 'ck_exp_transactions_reason', fields: ['reason'], where: { reason: { [Sequelize.Op.eq]: 'SESSION_COMPLETION' } } });
    await queryInterface.addConstraint('exp_transactions', { type: 'unique', name: 'uq_exp_transactions_user_session_reason', fields: ['user_id', 'session_id', 'reason'] });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('exp_transactions');
  },
};