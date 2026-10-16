'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('answers', {
      answer_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      player_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'players', key: 'player_id' },
        onDelete: 'CASCADE',
      },
      occurrence_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'session_question_history', key: 'occurrence_id' },
      },
      choice_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'choices', key: 'choice_id' },
      },
      answer_status: { type: Sequelize.STRING(12), allowNull: false },
      elapsed_ms: { type: Sequelize.INTEGER, allowNull: false },
      submitted_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });

    await queryInterface.addConstraint('answers', { type: 'unique', name: 'uq_answers_player_occurrence', fields: ['player_id', 'occurrence_id'] });
    await queryInterface.addConstraint('answers', { type: 'check', name: 'ck_answers_answer_status', fields: ['answer_status'], where: { answer_status: { [Sequelize.Op.in]: ['CORRECT', 'INCORRECT', 'TIMEOUT'] } } });
    await queryInterface.addConstraint('answers', { type: 'check', name: 'ck_answers_elapsed_ms', fields: ['elapsed_ms'], where: { elapsed_ms: { [Sequelize.Op.gte]: 0 } } });

    await queryInterface.sequelize.query(`
      ALTER TABLE answers
      ADD CONSTRAINT ck_answers_choice_status
      CHECK (
        (answer_status = 'TIMEOUT' AND choice_id IS NULL)
        OR (answer_status IN ('CORRECT', 'INCORRECT') AND choice_id IS NOT NULL)
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('answers');
  },
};