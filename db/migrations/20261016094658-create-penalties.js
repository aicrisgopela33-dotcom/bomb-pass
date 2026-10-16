'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('penalties', {
      penalty_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      player_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'players', key: 'player_id' },
        onDelete: 'CASCADE',
      },
      reason: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'bomb_expiration' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });

    await queryInterface.addIndex('penalties', ['player_id'], { name: 'idx_penalties_player_id' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('penalties');
  },
};