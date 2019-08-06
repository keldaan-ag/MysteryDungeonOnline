const Player = require("../type/entity/player");
const Pokemon = require("../type/pokemon/pokemon");
const ENUMS = require("../type/enums");
const ENUM_STAT = ENUMS.ENUM_STAT;
const ENUM_GENDER = ENUMS.ENUM_GENDER;
const ENUM_NATURE = ENUMS.ENUM_NATURE;
const pokemonMath = require("./pokemonMath");
const fs = require("fs");
const utils = require("../engine/utils");
const MdoFactory = require("../type/MdoFactory");

class Game
{
  constructor(config) 
  {
    this.width = config.width;
    this.height = config.height;
    this.players = [];
    this.ias = [];
    this.objects = [];
    this.turn = 0;
    this.genericPokemonDBs = [];
    this.world = JSON.parse(fs.readFileSync(__dirname + "/../generation/maps/test.json"));
    this.loadMap();
    this.loadObjects();
    this.eventEmitter = null;
  }

  loadObjects()
  {
    this.world.layers[1].objects.forEach((jsonObject)=>
    {
      this.objects.push(MdoFactory.createMdoObject(jsonObject.x, jsonObject.y, jsonObject.type));
    })
  }

  loadMap()
  {
    let map = this.world.layers[0].data;
    this.map = [];
    while(map.length){
      this.map.push(map.splice(0,50));
    };
    this.world.layers[0].data = this.map;
  }

  createPokemon(uniqid, gameIndex)
  {
      let level = 5;
      let happiness = 0;
      let nickname = "";
      let nature = ENUM_NATURE[utils.randomIntFromInterval(0,ENUM_NATURE.length - 1)];
      let gender = ENUM_GENDER[utils.randomIntFromInterval(0,ENUM_GENDER.length - 1)];
      let genericPokemon = this.getGenericPokemonDbByGameIndex(gameIndex);
      let ability = genericPokemon.abilities[utils.randomIntFromInterval(0, genericPokemon.abilities.length - 1)].ability;
      let ivs = {};
      let evs = {};
      let stats = {};
      let shiny = false;

      Object.keys(ENUM_STAT).forEach(key=>{
        ivs[key] = utils.randomIntFromInterval(0,31);
        evs[key] = utils.randomIntFromInterval(0,31);
      });

      ['SPEED', 'SPECIAL_DEFENSE', 'SPECIAL_ATTACK', 'DEFENSE', 'ATTACK'].forEach(key=>
      {
        stats[key] = pokemonMath.computeStat(ENUM_STAT[key], genericPokemon.stats[key], ivs[key], evs[key], level, nature);
      });
      let hp = pokemonMath.computeHP(genericPokemon.stats.HP, ivs.HP, evs.HP, level);
      stats.HP = hp;

      return new Pokemon(
        level,
        ivs,
        evs,
        stats,
        gender,
        shiny,
        happiness,
        nature,
        nickname,
        genericPokemon.name,
        genericPokemon.types,
        ability,
        hp,
        uniqid,
        gameIndex) 
  }

  getVisibleObjects()
  {
    let visibleObjs = [];
    this.objects.forEach(obj =>
    {
      if(obj.visible)
      {
        visibleObjs.push(obj);
      }
    })
    return visibleObjs;
  }

  getGenericPokemonDbByGameIndex(gameIndex)
  {
    let pokemonFound =  null;
    this.genericPokemonDBs.forEach((genericPokemon)=>
    {
      if(gameIndex ==  genericPokemon.gameIndex)
      {
        pokemonFound = genericPokemon;
      }
    })
    return pokemonFound;
  }

  setupNewTurn()
  {
    this.players.forEach(player =>
      {
      if(player.action != '6')
      { // Dead can not play turns
        player.turnPlayed = false;
      }
    });
    this.ias.forEach(ia =>
      {
      ia.turnPlayed = false;
    });
    this.turn += 1;
  }

  getTurn()
  {
    return this.turn;
  }

  computePositions()
  {
    // down, downleft, left, upleft, up, upright, right, downright
    this.players.forEach(player =>
      {
      // if the player did not already played his turn
      if(!player.turnPlayed)
      {
        // if the player really moved
        if(this.move(player))
        {
            // then his turn is played
            player.turnPlayed = true;
        }
      }
    });
  }
/**
 * check if all playe played their turn
 */
  checkEndTurn()
  {
    let endTurn = false;
    if(this.players.length != 0)
    {
      endTurn = true;
      this.players.forEach(player =>
        {
        if(!player.turnPlayed)
        {
          endTurn = false;
        }
      })
    }
    return endTurn;
  }

  computeIaTurn()
  {
    let directions = [-1,0,1];
    let dx = 0;
    let dy = 0;
      this.ias.forEach(ia =>{     
        dx = directions[utils.randomIntFromInterval(0, directions.length - 1)];
        dy = directions[utils.randomIntFromInterval(0, directions.length - 1)];
        ia.action = "5";
        if(!(dx == 0 && dy == 0)){
          if(!this.collide(ia, ia.x + dx,ia.y + dy)){
            ia.orientation = this.getOrientation(dx, dy);
            ia.x = ia.x + dx;
            ia.y = ia.y + dy;
          }
        }
        ia.turnPlayed = true;
      })
  }

  getOrientation(dx,dy){
    if(dx == 0 && dy == 1){
      return 'down';
    }
    else if(dx == 0 && dy == -1){
      return 'up';
    }
    else if(dx == 1 && dy == 0){
      return 'right';
    }
    else if(dx == -1 && dy == 0){
      return 'left';
    }
    else if(dx == 1 && dy == 1){
      return 'downright';
    }
    else if(dx == 1 && dy == -1){
      return 'upright';
    }
    else if(dx == -1 && dy == 1){
      return 'downleft';
    }
    else if(dx == -1 && dy == -1){
      return 'upleft';
    }
  }

/**
 * Attempt to move the player in direction he want
 * @param {Player} player 
 */
  move(player){
    let playerMoved = false;
    // check if move
    if(player.moveAlongX != 0 || player.moveAlongY != 0){
      //right
      if(player.moveAlongX == 1 && player.moveAlongY == 0){
        if(!this.collide(player, player.x + 1, player.y)){
          playerMoved = true;
        }
      }
      //left
      else if(player.moveAlongX == -1 && player.moveAlongY == 0){
        if(!this.collide(player, player.x -1, player.y)){
          playerMoved = true;
        }
      }
      //up
      else if(player.moveAlongX == 0 && player.moveAlongY == 1){
        if(!this.collide(player, player.x, player.y + 1)){
          playerMoved = true;
        }
      }
      //down
      else if(player.moveAlongX == 0 && player.moveAlongY == -1){
        if(!this.collide(player, player.x, player.y - 1)){
          playerMoved = true;
        }
      }
      //down right
      else if(player.moveAlongX == 1 && player.moveAlongY == -1){
        if(!this.collide(player, player.x + 1, player.y - 1)){
          playerMoved = true;
        }
      }
      //down left
      else if(player.moveAlongX == - 1 && player.moveAlongY == -1){
        if(!this.collide(player, player.x - 1, player.y - 1)){
          playerMoved = true;
        }
      }
      //up right
      else if(player.moveAlongX == 1 && player.moveAlongY == 1){
        if(!this.collide(player, player.x + 1, player.y + 1)){
          playerMoved = true;
        }
      }
      //up left
      else if(player.moveAlongX == - 1 && player.moveAlongY == 1){
        if(!this.collide(player, player.x - 1, player.y + 1)){
          playerMoved = true;
        }
      }
      if(playerMoved){
        player.x = player.x + player.moveAlongX;
        player.y = player.y + player.moveAlongY;
      }
    }
    return playerMoved;
  }


  /**
   * Check if the entity (pokemon) collide with the map at position x,y
   * @param {Entity} entity 
   * @param {integer} x 
   * @param {interger} y 
   */
  collide(entity, x, y){
    // check for map borders
    if(y >= this.map.length || y < 0 || x >= this.map[0].length || x < 0){
      return true;
    }
    // check for walls
    if(this.map[y][x] == 0){
      return true;
    }
    // check for other players
    for (let i = 0; i < this.players.length; i++) {
      if(this.players[i] != entity && this.players[i].x == x && this.players[i].y == y){
        return true;
      }
    }

    //check with ias
    for (let i = 0; i < this.ias.length; i++) {
      if(this.ias[i] != entity && this.ias[i].x == x && this.ias[i].y == y){
        return true;
      }
    }
    return false;
  }

  getPlayerById(id) {
    let found = false;
    let foundPlayer;
    this.players.forEach(player => {
      if (player.userId == id) {
        found = true;
        foundPlayer = player;
      }
    });
    if (found) {
      return foundPlayer;
    }
    else {
      return new Error("no player for given id ( " + id +" ) found");
    }
  }
  /**
  * Check if the player is in the game
  * @param {string} id The identifiant of the player
  */
  isPlayer(id) {
    return this.players.filter(p => p.id === id).length > 0;
  }

  /**
   * Method called by the game controller when simple physical attack is triggered client side
   * @param {*} player 
   */
  playPhysicalAttack(player){
    let potentialEntity = this.collidePhysicalAttack(player);
    if(potentialEntity){
      this.dealPhysicalAttack(player, potentialEntity);
    }
  }

  /**
   * Deal Damage to entity damaged by an attack
   * @param {*} player 
   */
  dealPhysicalAttack(player, entity){
    let conversion = {
      "left":"right",
      "up":"down",
      "down":"up",
      "right":"left",
      "upright":"downleft",
      "upleft":"downleft",
      "downleft":"upright",
      "downright":"upleft"
    };
    let damage = pokemonMath.computeDamage(player.pokemon.level,player.pokemon.stats.ATTACK,entity.pokemon.stats.DEFENSE,20,1);
    entity.pokemon.health = entity.pokemon.health - damage;
    this.eventEmitter.emit('server-message',
    {
      message: player.name + ' ( ' + player.pokemon.name + ' ) ' + ' attacked ' + entity.pokemon.name  + ' dealing ' + damage + ' HP',
      username:"Server"
    });
    if(entity.pokemon.health <= 0){  
      this.onEntityKO(entity);
    }
    else{
      entity.action = "3";
      entity.orientation = conversion[player.orientation];
      setTimeout(()=>{entity.action = "5"},500);
    }
  }

  onEntityKO(entity){
    entity.action = "6"; //KO state
    entity.turnPlayed = true;
    
    switch (entity.entityType) {
      case 'player':
          this.eventEmitter.emit('server-message',
          {
            message: entity.name + ' ( ' + entity.pokemon.name + ' ) ' + ' is KO',
            username:"Server"
          });
        break;
      
      case 'ia':
          this.eventEmitter.emit('server-message',
          {
            message: entity.pokemon.name  + ' is KO',
            username:"Server"
          });
          let index = this.ias.indexOf(entity);
          if(index > -1){
            this.ias.splice(index, 1);
          }
          this.eventEmitter.emit('entity-suppression', entity);
        break;

      default:
        break;
    }
  }

  /**
   * Check if a simple physical attack of a pokemon hit an other entity
   * @param {*} player 
   */
  collidePhysicalAttack(player){
    let conversion = {
      "left":[-1,0],
      "up":[0,-1],
      "right":[1,0],
      "down":[0,1],
      "downleft":[-1,1],
      "downright":[1,1],
      "upleft":[-1,-1],
      "upright":[1,-1]
    }
    let x = player.x + conversion[player.orientation][0];
    let y = player.y + conversion[player.orientation][1];
    for (let i = 0; i < this.ias.length; i++) {
      if(
        this.ias[i].x == x
     && this.ias[i].y == y){
       return this.ias[i];
     } 
    }
    for (let i = 0; i < this.players.length; i++) {
      if(
           this.players[i].x == x
        && this.players[i].y == y
        && this.players[i].userId != player.userId){
        return this.players[i];
      }
    }
    return false;
  }
  
  /**
  * add given player to game.players
  * @param {Player} player
  */
  addPlayer(player) {
    this.players.push(player);
  }
}

module.exports = Game;
