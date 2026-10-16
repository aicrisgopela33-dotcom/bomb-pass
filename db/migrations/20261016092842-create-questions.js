'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('questions', {
      question_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      question_set_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'question_sets', key: 'question_set_id' },
        onDelete: 'CASCADE',
      },
      text: { type: Sequelize.TEXT, allowNull: false },
      type: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'multiple_choice' },
      correct_index: { type: Sequelize.SMALLINT, allowNull: false },
      time_limit_seconds: { type: Sequelize.SMALLINT, allowNull: false, defaultValue: 15 },
    });

    await queryInterface.addConstraint('questions', {
      type: 'check',
      name: 'ck_questions_type',
      fields: ['type'],
      where: { type: { [Sequelize.Op.in]: ['multiple_choice', 'true_false'] } },
    });

    await queryInterface.addConstraint('questions', {
      type: 'check',
      name: 'ck_questions_correct_index',
      fields: ['correct_index'],
      where: { correct_index: { [Sequelize.Op.gte]: 0 } },
    });

    await queryInterface.addConstraint('questions', {
      type: 'check',
      name: 'ck_questions_time_limit_seconds',
      fields: ['time_limit_seconds'],
      where: { time_limit_seconds: { [Sequelize.Op.between]: [5, 30] } },
    });

    await queryInterface.addIndex('questions', ['question_set_id'], {
      name: 'idx_questions_question_set_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('questions');
  },
};
