// What the Library Game Hub shows about YOUR game (Hub Contract, rule 1).
// Lab Step 6: replace every CHANGE_ME value with your own.
const pkg = require('../../package.json');

module.exports = {
  slug: 'bomb-pass',            // your group's game, lower case with hyphens, for example shelf-climb
  name: 'Bomb Pass',            // the name players will see
  team: 'Bomb Pass Team (Group 7), BSCS 3-2',            // your group's name and section, for example Bookworms (3-1)
  developer: 'aicrisgopela33-dotcom',       // YOUR GitHub username: this build is yours
  description: 'Bomb Pass is a multiplayer quiz game in which the current bomb holder must answer a multiple-choice question correctly to pass the bomb; only an expired bomb timer causes a penalty.',     // one sentence about how the game is played
  min_players: 3,               // change to the limits your game is designed for
  max_players: 15,
  version: pkg.version,         // read from package.json, do not edit here
};
