'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      user_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      school_id: { type: Sequelize.STRING(32), allowNull: false, unique: true },
      full_name: { type: Sequelize.STRING(120), allowNull: false },
      email: { type: Sequelize.STRING(254), allowNull: false, unique: true },
      role: { type: Sequelize.STRING(12), allowNull: false, defaultValue: 'PLAYER' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });

    await queryInterface.addConstraint('users', {
      type: 'check',
      name: 'ck_users_role',
      fields: ['role'],
      where: { role: { [Sequelize.Op.in]: ['PLAYER', 'HOST', 'ADMIN'] } },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
