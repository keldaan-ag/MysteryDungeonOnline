const players = {};
 
const config = {
  type: Phaser.HEADLESS,
  parent: 'phaser-example',
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  autoFocus: false
};
 
function preload() {
  this.load.image('tiles','../../assets/test_tileset.png');
  this.load.tilemapTiledJSON('map','../../assets/test_map.json');
  this.load.multiatlas('sprites','../../assets/test_sprites.json');
}
 
function create() {
  const self = this;
  this.players = this.physics.add.group();
  this.map = this.make.tilemap({key:'map'});
  const tileset = this.map.addTilesetImage('test_tileset', 'tiles');
  const worldLayer = this.map.createStaticLayer('world', tileset, 0, 0);    
  worldLayer.setCollisionByProperty({ collides: true });
  this.physics.add.collider(this.players, worldLayer);
  
  const spawnPoint = this.map.findObject("Objects", obj => obj.name === "spawn_point");

  io.on('connection', function (socket) {
    let playerId = socket.handshake.session.passport.user._id;
    let player_email = socket.handshake.session.passport.user.email;
    let name = socket.handshake.session.passport.user.name;
    let pokedex = [1,2,5,7,12,25];
    let randomPokedexNumber = pokedex[randomIntFromInterval(0,pokedex.length - 1)];
    console.log( player_email +' connected');
    // if player not already in game, we add it
    if(!players[playerId]){
      // load a player and add it to our players object
      window.loadPlayer(playerId).then((dbPlayer)=>{
        players[playerId] = dbPlayer;
        players[playerId].socketId = socket.id;
        players[playerId].name = name;
        if(players[playerId].pokedexIdx == -1){
          players[playerId].pokedexIdx = randomPokedexNumber;
          players[playerId].x = spawnPoint.x;
          players[playerId].y = spawnPoint.y;
        }
        // add player to server
        addPlayer(self, players[playerId]);
        // send the players object to the new player
        socket.emit('currentPlayers', players);
        // update all other players of the new player
        socket.broadcast.emit('newPlayer', players[playerId]);
      })
    }
    else{
      socket.emit('alreadyLog',player_email);
      socket.disconnect();
    }

    
    socket.on('disconnect', function () {
      if(players[playerId]){
        // remove this player from our players object
        // save player properties in db
        window.savePlayer(players[playerId]).then((res)=>{
          // remove player from server
          removePlayer(self, playerId);
          io.emit('disconnect', playerId);
          delete players[playerId];
          console.log(player_email +' disconnected');
        });
      }
    });

    // when a player moves, update the player data
    socket.on('playerInput', function (inputData) {
      handlePlayerInput(self, playerId, inputData);
    });
  });
}
 
function update() {
  this.players.getChildren().forEach((player) => {
    const input = players[player.playerId].input;
    setMovement(player, input);
    setOrientation(player, input);
    setAction(player, input);
    players[player.playerId].x = player.x;
    players[player.playerId].y = player.y;
    players[player.playerId].orientation = player.orientation;
    players[player.playerId].action = player.action;
  });
  io.emit('playerUpdates', players);
}

/*
set Movement speed splayer depending of player input
*/
function setMovement(player, input){
  player.setVelocity(0);
  if (input.left) {
    player.setVelocityX(-80);
  } 
  if (input.right) {
    player.setVelocityX(80);
  } 
  if (input.down) {
    player.setVelocityY(80);
  }
  if (input.up) {
    player.setVelocityY(-80);
  }
}

/*
Set orientation of the player, it will be used to render proper pokemon sprite client side
Possible orientation are : down, downleft, left, upleft, up, upright, right, downright
*/
function setOrientation(player, input){
  if(input.left && input.up){
    player.orientation = 'upleft'
  }
  else if(input.left && input.down){
    player.orientation = 'downleft'
  }
  else if(input.right && input.up){
    player.orientation = 'upright'
  }
  else if(input.right && input.down){
    player.orientation = 'downright'
  }
  else if (input.right) {
    player.orientation = 'right'
  }
  else if(input.left){
    player.orientation = 'left'
  }
  else if(input.up){
    player.orientation = 'up'
  }
  else if(input.down){
    player.orientation = 'down'
  }
}

/*
Set action that the player is doing
Possibles actions are : 0: moving, 1: physical attack, 2: special attack, 3: hurt, 4: sleep
TODO support other actions than moving and idle
*/
function setAction(player, input) {
  //check if the player is moving in any directions, if not he is idle
  if(!(input.right || input.down || input.left || input.right)){
    player.action = '5';
  }
  // TODO implement more logic than if not afk then moving 
  else{
    player.action = '0';
  }
}

/**
 * Handle keyboard input send by client
 */
function handlePlayerInput(self, playerId, input) {
  self.players.getChildren().forEach((player) => {
    if (playerId === player.playerId) {
      players[player.playerId].input = input;
    }
  });
}

/*
Add a new player server side, this new player will have a down moving sprite hitbox.
*/
function addPlayer(self, playerInfo) {
  const player = self.physics.add.image(playerInfo.x, playerInfo.y, 'sprites', playerInfo.pokedexIdx + '_0_0_0').setOrigin(0.5, 0.5);
  player.playerId = playerInfo.playerId;
  player.action = playerInfo.action;
  player.orientation = playerInfo.orientation;
  player.name = playerInfo.name;
  // if we want collisions between players, uncomment below line
  //self.physics.add.collider(player, self.players);
  self.players.add(player);
}
 
/*
Remove player from existing phaser game
*/
function removePlayer(self, playerId) {
  self.players.getChildren().forEach((player) => {
    if (playerId === player.playerId) {
      player.destroy();
    }
  });
}

function randomIntFromInterval(min,max) // min and max included
{
    return Math.floor(Math.random()*(max-min+1)+min);
}
 
const game = new Phaser.Game(config);
window.gameLoaded();