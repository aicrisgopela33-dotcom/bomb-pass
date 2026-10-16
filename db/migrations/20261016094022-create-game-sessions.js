'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('game_sessions', {
      session_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      host_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
      },
      question_set_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'question_sets', key: 'question_set_id' },
      },
      join_code: { type: Sequelize.CHAR(6), allowNull: false },
      status: { type: Sequelize.STRING(12), allowNull: false, defaultValue: 'waiting' },
      duration_limit_minutes: { type: Sequelize.SMALLINT, allowNull: false, defaultValue: 10 },
      bomb_time_limit_seconds: { type: Sequelize.SMALLINT, allowNull: false, defaultValue: 30 },
      session_end_reason: { type: Sequelize.STRING(20), allowNull: true },
      bomb_holder_player_id: { type: Sequelize.INTEGER, allowNull: true },
      bomb_expires_at: { type: Sequelize.DATE, allowNull: true },
      current_question_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'questions', key: 'question_id' },
      },
      current_cycle_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      question_expires_at: { type: Sequelize.DATE, allowNull: true },
      winner_player_id: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      started_at: { type: Sequelize.DATE, allowNull: true },
      ended_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addConstraint('game_sessions', {
      type: 'check',
      name: 'ck_game_sessions_status',
      fields: ['status'],
      where: { status: { [Sequelize.Op.in]: ['waiting', 'playing', 'ended'] } },
    });

    await queryInterface.addConstraint('game_sessions', {
      type: 'check',
      name: 'ck_game_sessions_duration_limit_minutes',
      fields: ['duration_limit_minutes'],
      where: { duration_limit_minutes: { [Sequelize.Op.between]: [5, 15] } },
    });

    await queryInterface.addConstraint('game_sessions', {
      type: 'check',
      name: 'ck_game_sessions_bomb_time_limit_seconds',
      fields: ['bomb_time_limit_seconds'],
      where: { bomb_time_limit_seconds: { [Sequelize.Op.between]: [20, 60] } },
    });

    await queryInterface.addConstraint('game_sessions', {
      type: 'check',
      name: 'ck_game_sessions_session_end_reason',
      fields: ['session_end_reason'],
      where: { session_end_reason: { [Sequelize.Op.in]: ['last_player', 'duration_limit', 'host_ended'] } },
    });

    await queryInterface.addConstraint('game_sessions', {
      type: 'check',
      name: 'ck_game_sessions_join_code',
      fields: ['join_code'],
      where: { join_code: { [Sequelize.Op.regexp]: '^[1-9][0-9]{5}$' } },
    });

    await queryInterface.addConstraint('game_sessions', {
      type: 'check',
      name: 'ck_game_sessions_current_cycle_number',
      fields: ['current_cycle_number'],
      where: { current_cycle_number: { [Sequelize.Op.gte]: 1 } },
    });

    await queryInterface.addIndex('game_sessions', ['join_code'], {
      name: 'uq_game_sessions_join_code_open',
      unique: true,
      where: { status: { [Sequelize.Op.in]: ['waiting', 'playing'] } },
    });

    await queryInterface.addIndex('game_sessions', ['host_user_id'], {
      name: 'idx_game_sessions_host_user_id',
    });

    await queryInterface.addIndex('game_sessions', ['question_set_id'], {
      name: 'idx_game_sessions_question_set_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('game_sessions');
  },
};
