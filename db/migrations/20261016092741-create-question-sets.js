'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('question_sets', {
      question_set_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      owner_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
      },
      title: { type: Sequelize.STRING(120), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      subject: { type: Sequelize.STRING(80), allowNull: true },
      grade_level: { type: Sequelize.STRING(40), allowNull: true },
    });

    await queryInterface.addIndex('question_sets', ['owner_user_id'], {
      name: 'idx_question_sets_owner_user_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('question_sets');
  },
};
