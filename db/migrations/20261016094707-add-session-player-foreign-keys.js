'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addConstraint('game_sessions', {
      type: 'foreign key',
      name: 'fk_game_sessions_bomb_holder_player_id',
      fields: ['bomb_holder_player_id'],
      references: { table: 'players', field: 'player_id' },
    });

    await queryInterface.addConstraint('game_sessions', {
      type: 'foreign key',
      name: 'fk_game_sessions_winner_player_id',
      fields: ['winner_player_id'],
      references: { table: 'players', field: 'player_id' },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('game_sessions', 'fk_game_sessions_bomb_holder_player_id');
    await queryInterface.removeConstraint('game_sessions', 'fk_game_sessions_winner_player_id');
  },
};