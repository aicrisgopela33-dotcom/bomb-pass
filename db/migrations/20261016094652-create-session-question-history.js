'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('session_question_history', {
      occurrence_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      session_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'game_sessions', key: 'session_id' },
        onDelete: 'CASCADE',
      },
      cycle_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      question_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'questions', key: 'question_id' },
      },
      displayed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });

    await queryInterface.addConstraint('session_question_history', {
      type: 'unique',
      name: 'uq_session_question_history_session_cycle_question',
      fields: ['session_id', 'cycle_number', 'question_id'],
    });

    await queryInterface.addConstraint('session_question_history', {
      type: 'check',
      name: 'ck_session_question_history_cycle_number',
      fields: ['cycle_number'],
      where: { cycle_number: { [Sequelize.Op.gte]: 1 } },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('session_question_history');
  },
};