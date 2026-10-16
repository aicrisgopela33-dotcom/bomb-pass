'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('players', {
      player_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      session_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'game_sessions', key: 'session_id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
      },
      nickname: { type: Sequelize.STRING(24), allowNull: false },
      score: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      player_status: { type: Sequelize.STRING(12), allowNull: false, defaultValue: 'JOINED' },
      connection_status: { type: Sequelize.STRING(12), allowNull: false, defaultValue: 'CONNECTED' },
      joined_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      last_seen_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      disconnected_at: { type: Sequelize.DATE, allowNull: true },
      eliminated_at: { type: Sequelize.DATE, allowNull: true },
      forfeited_at: { type: Sequelize.DATE, allowNull: true },
      finished_at: { type: Sequelize.DATE, allowNull: true },
      final_rank: { type: Sequelize.INTEGER, allowNull: true },
    });

    await queryInterface.addConstraint('players', { type: 'unique', name: 'uq_players_session_user', fields: ['session_id', 'user_id'] });
    await queryInterface.addConstraint('players', { type: 'unique', name: 'uq_players_session_nickname', fields: ['session_id', 'nickname'] });
    await queryInterface.addConstraint('players', { type: 'unique', name: 'uq_players_session_final_rank', fields: ['session_id', 'final_rank'] });

    await queryInterface.addConstraint('players', { type: 'check', name: 'ck_players_score', fields: ['score'], where: { score: { [Sequelize.Op.gte]: 0 } } });
    await queryInterface.addConstraint('players', { type: 'check', name: 'ck_players_status', fields: ['player_status'], where: { player_status: { [Sequelize.Op.in]: ['JOINED', 'ACTIVE', 'ELIMINATED', 'FORFEITED', 'FINISHED'] } } });
    await queryInterface.addConstraint('players', { type: 'check', name: 'ck_players_connection_status', fields: ['connection_status'], where: { connection_status: { [Sequelize.Op.in]: ['CONNECTED', 'DISCONNECTED'] } } });
    await queryInterface.addConstraint('players', { type: 'check', name: 'ck_players_final_rank', fields: ['final_rank'], where: { final_rank: { [Sequelize.Op.gt]: 0 } } });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('players');
  },
};