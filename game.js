/*------------------------------------------------------
 * Program name: Polo But Not Really
 * Date: Sometime in 2018
 * Description: Small local multiplayer game about horses throwing soccer balls at each other
 -----------------------------------------------------*/

var container; //Reference to container of the game container HTML element
var width = 0; //Width of container
var height = 0; //Height of container
var keyMap = {}; //Object of all keys pressed

var playerWidth = 64; //Players width
var playerHeight = 62; //Height of players
var collideDis = 50; //Distance for players to collide with each other

var playerSpeed = 300; //The target horizontal speed for the players
var playerAcel = 20; //How fast they accelerate towards their goal
var playerDrag = 1000; //Slowing force applied when not moving left or right

var ballDisFromPlayer = 30; //Distance from the ball to center of player when ball is held by player
var jumpForce = 400; //Force applied when jumping off the ground
var jetpackForce = 700; //Force applied by the jetpack when in the air and holding the jump button
var throwForce = 1000; //Strength of how fast the ball is thrown

//Player 1 data container
var player1 = {
	name:"", //name of player that the user entered
	keys:{left:65, right:68, jump:87, down:83, shoot:32}, //player 1 key inputs
	direction:{x:1, y:0}, //direction the player is facing
	pos:{x:0, y:0}, //position of player
	vel:{x:0, y:0}, //velocity of player
	grounded:false, //whether or not player is standing on something
	hasBall:true, //whether or not player is currently holding a ball
	canPickup:false, //whether or not the player can pick up the ball
	score:0 //the players score
}

//Player 2 data container
var player2 = {
	name:"", //name of player that the user entered
	keys:{left:37, right:39, jump:38, down:40, shoot:190}, //player 2 key inputs
	direction:{x:-1, y:0}, //direction the player is facing
	pos:{x:0, y:0}, //position of player
	vel:{x:0, y:0}, //velocity of player
	grounded:false, //whether or not player is standing on something
	hasBall:true, //whether or not player is currently holding a ball
	canPickup:false, //whether or not the player can pick up the ball
	score:0 //the players score
}

//Physics object data containers (i.e. the soccer balls)
var objects = [{
	radius:25, //radius of ball
	diameter:50, //diameter of ball
	rotation:0, //current rotation of ball
	pos:{x:0, y:0}, //position of ball
	vel:{x:0, y:0} //velocity of ball
},
{
	radius:25, //radius of ball
	diameter:50, //diameter of ball
	rotation:0, //current rotation of ball
	pos:{x:0, y:0}, //position of ball
	vel:{x:0, y:0} //velocity of ball
}]

gravity = 500; //Gravity for the players and soccer balls
var dragX = 20; //Horizontal slowing force applied to the balls
var dragY = 0; //Vertical slowing force applied to the balls
var bounceMultiplier = 0.8; //Velocity multiplier applied when ball bounces

var pointsToWin = 5; //Number of points for a player to win the game
var tickRef; //Reference to the tick function of the game (needed for clearing/restarting the tick function)
var fixedTime = 0.02; //Current update rate of the game
var unscaledTime = 0.02; //Constant refresh rate of the game
var defaultTime = 0.02; //Default refresh rate of the game
var slowmoTime = 0.003; //Slowmo refresh rate of the game
var roundEnded = false; //Whether or not the round has ended

//Reference to the level objects that the players/balls can collide with
var level = [{minX:200, minY:325, maxX:475, maxY:475},
		{minX:100, minY:100, maxX:200, maxY:200},
		{minX:725, minY:100, maxX:850, maxY:200},
		{minX:650, minY:300, maxX:750, maxY:500},
		{minX:875, minY:400, maxX:1000, maxY:450}];

//Creates ball elements, player elements, and calls keyEvents
function init() {
	container = document.getElementById("container");
	width = 1000;
	height = 600;

	//load objects
	for(var i = 0; i < objects.length; i++) {
		var element = document.createElement('img');
		element.style.position = 'absolute';
		element.id = i;
		element.setAttribute('src', 'images/ball.gif');
		element.setAttribute('alt', 'ball');
		element.setAttribute('width', objects[i].diameter);
		container.appendChild(element);
	}

	var element = document.createElement('img');
	element.setAttribute('src', 'images/1idle.png');
	element.setAttribute('alt', 'Player 1');
	element.id = 'player1';
	element.className = 'player';
	container.appendChild(element);

	element = document.createElement('img');
	element.setAttribute('src', 'images/2idle.png');
	element.setAttribute('alt', 'Player 2');
	element.id = 'player2';
	element.className = 'player';
	container.appendChild(element);

	//load key events, reset, and start
	keyEvents();
}

//Shows/hides elements
function changeVisibility(divID, show) {
	var element = document.getElementById(divID);

	if(element) {
		element.className = show ? "unhidden" : "hidden";
	}
}

//Loads level and starts the game
function startGame() {
	resetGame();

	//load obstacles
	for(var i = 0; i < level.length; i++) {
		var newObs = document.createElement('div');
		var curObs = level[i];
		newObs.className = 'obstacle';
		newObs.style.left = curObs.minX + 'px';
		newObs.style.top = curObs.minY + 'px';
		newObs.style.width = curObs.maxX - curObs.minX + 'px';
		newObs.style.height = curObs.maxY - curObs.minY + 'px';
		container.appendChild(newObs);
	}

	changeVisibility('container', true);
	changeVisibility('score', true);
	changeVisibility('back', true);
	changeVisibility("endGameScreen", false);

	document.getElementById('menu').className = "hidden";
	document.getElementById('header').className = "hidden";

	player1.name = document.getElementById('player1Name').value;
	player2.name = document.getElementById('player2Name').value;

	document.getElementById('player1Score').innerHTML = player1.name;
	document.getElementById('player2Score').innerHTML = player2.name;

	player1.score = 0;
	player2.score = 0;
	updateScore();

	clearTimeout(tickRef);
	tick();
}

//Returns to menu (when back button is pressed)
function backToMenu() {
	changeVisibility('container', false);
	changeVisibility('score', false);
	changeVisibility('back', false);
	changeVisibility("endGameScreen", false);

	document.getElementById('menu').className = "container";
	document.getElementById('header').className = "jumbotron text-center";
}

//Reset the game elements to their starting values
function resetGame() {
	if(player1.score >= pointsToWin) {
		document.getElementById("endGameScreen").innerHTML = player1.name + " wins!";
		changeVisibility("endGameScreen", true);
		clearTimeout(tickRef);
	}
	else if(player2.score >= pointsToWin) {
		document.getElementById("endGameScreen").innerHTML = player2.name + " wins!";
		changeVisibility("endGameScreen", true);
		clearTimeout(tickRef);
	}

	fixedTime = defaultTime;
	var element = null;

	for(var i = 0; i < objects.length; i++) {
		element = document.getElementById(0);
		var obj = objects[i];

		obj.pos.x = 0;
		obj.pos.y = 0;

		obj.vel.x = 0;
		obj.vel.y = 0;

		element.style.left = obj.pos.x + 'px';
		element.style.top = obj.pos.y + 'px';
	}

	player1.pos.x = width * 0.05;
	player1.pos.y = height * 0.05;

	player1.vel.x = 0;
	player1.vel.y = 0;

	player1.direction.x = 1;
	player1.direction.y = 0;

	player1.usingJetpack = false,
	player1.grounded = false,
	player1.hasBall = true,
	player1.canPickup = false

	player2.pos.x = width * 0.9;
	player2.pos.y = height * 0.05;

	player2.vel.x = 0;
	player2.vel.y = 0;

	player2.direction.x = -1;
	player2.direction.y = 0;

	player2.usingJetpack = false,
	player2.grounded = false,
	player2.hasBall = true,
	player2.canPickup = false

	element = document.getElementById('player1');
	element.style.left = player1.pos.x + 'px';
	element.style.top = player1.pos.y + 'px';
	element.style.WebkitTransform = 'scaleX(-1)';
	element.style.transform = 'scaleX(-1)';

	element = document.getElementById('player2');
	element.style.left = player2.pos.x + 'px';
	element.style.top = player2.pos.y + 'px';
	element.style.WebkitTransform = 'scaleX(1)';
	element.style.transform = 'scaleX(1)';

	document.getElementById('winText').innerHTML = '';

	roundEnded = false;
}

//Update HTML score elements
function updateScore() {
	document.getElementById('actualScore').innerHTML = player1.score + ' - ' + player2.score;
}

//Handle key input and assign them to an object of keys pressed
function keyEvents() {
	onkeydown = onkeyup = function(e){
		e = e || event; // to deal with IE
		keyMap[e.keyCode] = e.type == 'keydown';
	}
}

//Main function that drives the game
function tick() {
	for(var i = 0; i < objects.length; i++) {
		var obj= objects[i];
		var self = document.getElementById(i);

		if(obj.vel.x < 0) {
			obj.vel.x += Math.max(obj.vel.x, dragX) * fixedTime;
		}
		else if(obj.vel.x > 0) {
			obj.vel.x -= Math.min(obj.vel.x, dragX) * fixedTime;
		}

		if(obj.vel.y < 0) {
			obj.vel.y += Math.max(obj.vel.y, dragY) * fixedTime;
		}
		else if(obj.vel.x > 0) {
			obj.vel.y -= Math.min(obj.vel.y, dragY) * fixedTime;
		}

		obj.vel.y += gravity * fixedTime;
		rotateBall(i);

		obj.pos =
			{x:obj.pos.x + obj.vel.x * fixedTime,
	 		 y:obj.pos.y + obj.vel.y * fixedTime};

		clampInScreen(obj, obj.diameter, obj.diameter, true, bounceMultiplier);
		obstacleCollision(obj, obj.diameter, obj.diameter, true, bounceMultiplier);

		var self = document.getElementById(i);
		self.style.left = obj.pos.x + 'px';
		self.style.top = obj.pos.y + 'px';
	}

	managePlayer(player1, 'player1', 0);
	managePlayer(player2, 'player2', 1);

	if(!roundEnded) {
		playerCollisions();
	}

	tickRef = setTimeout(tick, unscaledTime * 1000);
}

//Deal with player physics, movement, input, etc.
function managePlayer(player, name, ballID) {
	var obj = objects[ballID];
	var element = document.getElementById(name);

	//Velocity
	if(keyMap[player.keys.right] || keyMap[player.keys.left]) {
		if(keyMap[player.keys.right]) {
			player.vel.x += (playerSpeed - player.vel.x) * fixedTime * playerAcel;
			player.direction.x = 1;
			player.direction.y = 0;
			element.style.WebkitTransform = 'scaleX(-1)';
			element.style.transform = 'scaleX(-1)';
		}
		else if(keyMap[player.keys.left]) {
			player.vel.x -= (playerSpeed + player.vel.x) * fixedTime * playerAcel;
			player.direction.x = -1;
			player.direction.y = 0;
			element.style.WebkitTransform = 'scaleX(1)';
			element.style.transform = 'scaleX(1)';
		}
	}
	else {
		//Drag
		if(player.vel.x < 0) {
			player.vel.x += playerDrag * fixedTime;

			if(player.vel.x > 0) {
				player.vel.x = 0;
			}
		}
		else if(player.vel.x > 0) {
			player.vel.x -= playerDrag * fixedTime;

			if(player.vel.x < 0) {
				player.vel.x = 0;
			}
		}
	}

	//Jump
	if(keyMap[player.keys.jump]) {
		if(player.grounded) {
			player.vel.y = -jumpForce;
		}
		else {
			player.vel.y -= jetpackForce * fixedTime;
		}

		player.direction.x = 0;
		player.direction.y = -1;
	}

	//Down
	if(keyMap[player.keys.down]) {
		player.direction.x = 0;
		player.direction.y = 1;
	}

	//Shoot
	if(keyMap[player.keys.shoot]) {
		if(player.hasBall) {
			if(player.direction.y != 0) {
				obj.vel.y = player.direction.y * throwForce;
				obj.vel.x = 0;
			}
			else if(player.direction.x != 0) {
				obj.vel.x = player.direction.x * throwForce;
				obj.vel.y = 0;
			}

			player.hasBall = false;
			player.canPickup = false;

			setTimeout(function(){player.canPickup = true;}, 100);
		}
	}

	//Gravity
	player.vel.y += gravity * fixedTime;

	player.pos =
		{x:player.pos.x + player.vel.x * fixedTime,
		 y:player.pos.y + player.vel.y * fixedTime};

	//Collisions
	player.grounded = false;
	clampInScreen(player, playerWidth, playerHeight, false, 0);
	obstacleCollision(player, playerWidth, playerHeight, false, 0);

	if(player.grounded) {
		player.vel.y = 0;
	}

	//Assign position to div element
	var self = document.getElementById(name);
	self.style.left = player.pos.x + 'px';
	self.style.top = player.pos.y + 'px';

	//Ball positioning
	if(player.hasBall) {
		obj.pos.x = player.pos.x + ((playerWidth - obj.diameter) / 2) + (ballDisFromPlayer * player.direction.x);
		obj.pos.y = player.pos.y + ((playerHeight - obj.diameter) / 2)  + (ballDisFromPlayer * player.direction.y);

		var self = document.getElementById(ballID);
		self.style.left = obj.pos.x + 'px';
		self.style.top = obj.pos.y + 'px';
	}
}

//Handle player collisions
function playerCollisions() {
	var obj = objects[0];
	if(!player1.hasBall && player1.canPickup && playersCollide(player1.pos, obj.pos)) {
		obj.vel.x = 0;
		obj.vel.y = 0;
		player1.hasBall = true;
	}

	if(!player1.hasBall && playersCollide(player2.pos, obj.pos)) {
		endRound(player1, player2);
	}

	var obj = objects[1];
	if(!player2.hasBall && player2.canPickup && playersCollide(player2.pos, obj.pos)) {
		obj.vel.x = 0;
		obj.vel.y = 0;
		player2.hasBall = true;
	}

	if(!player2.hasBall && playersCollide(player1.pos, obj.pos)) {
		endRound(player2, player1);
	}
}

//Rotate ball based on horizontal speed
function rotateBall(i){
	var obj = objects[i];
	var ball = document.getElementById(i);

	ball.style.WebkitTransform = "rotate(" + obj.rotation + "deg)";
	obj.rotation += 360 * ((obj.vel.x * fixedTime) / (3.14 * (obj.radius + obj.radius)));

	if(obj.rotation > 359){
		obj.rotation = 0;
	}
}

//Collision between object and screen bounds
function clampInScreen(obj, sizeX, sizeY, bounce, multiplier) {
	if(obj.pos.x > width - sizeX && obj.vel.x > 0) {
		if(bounce) {
			obj.vel.x *= -multiplier;
		}

		obj.pos.x = width - sizeX;
	}
	else if(obj.pos.x < 0 && obj.vel.x < 0) {
		if(bounce) {
			obj.vel.x *= -multiplier;
		}

		obj.pos.x = 0;
	}
	else if(obj.pos.y > height - sizeY && obj.vel.y > 0) {
		if(bounce) {
			obj.vel.y *= -multiplier;
		}

		if(obj == player1 || obj == player2) {
			obj.grounded = true;
		}

		obj.pos.y = height - sizeY;
	}
	else if(obj.pos.y < 0 && obj.vel.y < 0) {
		if(bounce) {
			obj.vel.y *= -multiplier;
		}

		if(obj == player1 || obj == player2) {
			obj.vel.y = 0;
			obj.grounded = true;
		}

		obj.pos.y = 0;
	}
}

//Collision between object and obstacles (boxes)
function obstacleCollision(obj, sizeX, sizeY, bounce, multiplier) {
	var cur = {x:obj.pos.x + 25, y:obj.pos.y + 25};

	for(var o = 0; o < level.length; o++) {
		var obs = level[o];

		if(obj.pos.x < obs.maxX && obj.pos.x > obs.minX - sizeX) {
			if(obj.pos.y > obs.minY - sizeY && obj.pos.y < obs.maxY) {
				var obsWidth = obs.maxX - obs.minX;
				var obsHeight = obs.maxY - obs.minY;

				var topDis = sqrDistance(cur, {x:obs.minX + obsWidth / 2, y:obs.minY});
				var bottomDis = sqrDistance(cur, {x:obs.minX + obsWidth / 2, y:obs.maxY});
				var leftDis = sqrDistance(cur,  {x:obs.minX, y:obs.minY + obsHeight / 2});
				var rightDis = sqrDistance(cur, {x:obs.maxX, y:obs.minY + obsHeight / 2});

				var minDis = Math.min(topDis, bottomDis, leftDis, rightDis);

				if(minDis == leftDis) {
					if(bounce) {
						obj.vel.x *= -multiplier;
					}

					obj.pos.x = obs.minX - sizeX;
				}
				else if(minDis == rightDis) {
					if(bounce) {
						obj.vel.x *= -multiplier;
					}

					obj.pos.x = obs.maxX;
				}
				else if(minDis == topDis) {
					if(bounce) {
						obj.vel.y *= -multiplier;
					}

					if(obj == player1 || obj == player2) {
						obj.grounded = true;
					}

					obj.pos.y = obs.minY - sizeY;
				}
				else if(minDis == bottomDis) {
					if(bounce) {
						obj.vel.y *= -multiplier;
					}

					if(obj == player1 || obj == player2) {
						obj.vel.y = 0;
					}

					obj.pos.y = obs.maxY;
				}
			}
		}
	}
}

//Check if two players are inside each other
function playersCollide (p1, p2) {
	if(distance(p1, p2) < collideDis) {
		return true;
	}
	else {
		return false;
	}
}

//Get length of vector
function magnitude(x, y) {
	return Math.sqrt(x * x + y * y);
}

//Normalize vector (give length of 1)
function normalize(l, c) {
	if(c == 0) {
		return 0;
	}

	return l / c;
}

//More optimized way to compare distances as does not use the square root function.
function sqrDistance(p1, p2) {
	let xDist = (p2.x - p1.x);
 	let yDist = (p2.y - p1.y);
 	return (xDist * xDist) + (yDist * yDist);
}

//Calculate distance between two points
function distance(p1, p2) {
	let xDist = (p2.x - p1.x);
 	let yDist = (p2.y - p1.y);
 	return Math.sqrt((xDist * xDist) + (yDist * yDist));
}

//End round, enter slowmo, and reset game after a few seconds
function endRound(winner, loser) {
	winner.score++;

	var winText = document.getElementById("winText");
	if(winner.score == pointsToWin) {
		winText.innerHTML = "Game over";
	}
	else {
		winText.innerHTML = "Point for " + winner.name;
	}

	updateScore();
	fixedTime = slowmoTime;
	setTimeout(resetGame, 3000);
	roundEnded = true;
}
