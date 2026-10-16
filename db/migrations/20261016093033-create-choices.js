'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('choices', {
      choice_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      question_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'questions', key: 'question_id' },
        onDelete: 'CASCADE',
      },
      choice_index: { type: Sequelize.SMALLINT, allowNull: false },
      text: { type: Sequelize.STRING(120), allowNull: false },
    });

    await queryInterface.addConstraint('choices', {
      type: 'unique',
      name: 'uq_choices_question_choice',
      fields: ['question_id', 'choice_index'],
    });

    await queryInterface.addIndex('choices', ['question_id'], {
      name: 'idx_choices_question_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('choices');
  },
};
