/*
x : pokemon position on map
y : same
gameIndex : the pokedex number of the pokemon Ex Charmander 4
id : the id of the player
*/
class Player{
  constructor(id, x, y, pokemonIndex, name){
    this.id = id;
    this.x = x;
    this.y = y;
    this.pokemonIndex = pokemonIndex;
    this.name = name;
    this.orientation = "left";
    this.action = "0";
    this.moveAlongX = 0;
    this.moveAlongY = 0;
    this.turnPlayed = false;
  }
}

module.exports = Player;
