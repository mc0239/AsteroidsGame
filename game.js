var canvas, ctx, then;

var a; // assets variable

var player, bullets, asteroids, score, lives;

window.onload = function() {
    // init canvas
    canvas = document.getElementById("game");
    canvas.width = 800;
    canvas.height = 600;
    ctx = canvas.getContext("2d");

    // load assets
    a = {
        img: {},
        snd: {}
    };
    loadImages();

    then = Date.now();
    initPlayer();
    generateAsteroidWave();
    main();
};

function loadImages() {
    a.img.rocket1 = new Image();
    a.img.rocket1.src = "./img/rocket1.png";

    a.img.offpointer = new Image();
    a.img.offpointer.src = "./img/offscreen_pointer.png";

    a.img.offpointerAsteroid = new Image();
    a.img.offpointerAsteroid.src = "./img/offscreen_pointer2.png";

    a.img.bullet1 = new Image();
    a.img.bullet1.src = "./img/bullet1.png";
    a.img.bullet2 = new Image();
    a.img.bullet2.src = "./img/bullet2.png";

    a.img.asteroid1small = new Image();
    a.img.asteroid1small.src = "./img/asteroid1_small.png";
}

function initPlayer() {
    player = {
        dead: false,
        x: canvas.width/2,
        y: canvas.height/2,
        rot: 0,

        turnSpeed: 2,

        maxSpeed: 3,
        acceleration: 0.1,
        velocity: 0,

        bullet1Cooldown: 1000,
        bullet1CooldownCurrent: 0,
        bullet2Cooldown: 5000,
        bullet2CooldownCurrent: 0,
    };
    bullets = [];
    score = 0;
    lives = 3;
}

let angX = 0, angY = 0;
function update(dt) {

    movePlayer();
    moveAsteroids();
    bulletLogic();
    checkCollision();

    if(player.dead && lives > 0) {
        // respawn player when appropriate
        let isEmptyArea = true;
        asteroids.forEach(function(e, i) {
            let safeDistance = 40;
            if(isInCollision(canvas.width/2 - safeDistance, safeDistance*2, safeDistance*2, canvas.height/2 + safeDistance, e.x, e.y, 32, 32)) {
                isEmptyArea = false;
            }
        });
        if(isEmptyArea) {
            player.x = canvas.width/2;
            player.y = canvas.height/2;
            player.velocity = 0;
            player.rot = 0;
            player.dead = false;
        }
    }

    function movePlayer() {
        if(keysDown["a"] || keysDown["A"]) player.rot -= player.turnSpeed;
        if(keysDown["d"] || keysDown["D"]) player.rot += player.turnSpeed;
        if(player.rot >= 360) player.rot = 0;
        if(player.rot <= -360) player.rot = 0;

        // TODO: REDO THIS WHOLE THING OH MY GOD PLEASE
        let c = player.velocity; // speed ?
        player.x += angX * c;
        player.y -= angY * c;

        if(keysDown["w"] || keysDown["W"]) {
            angX = Math.sin(degToRad(player.rot));
            angY = Math.cos(degToRad(player.rot));

            player.velocity += player.acceleration;
            if(player.velocity > player.maxSpeed) {
                player.velocity = player.maxSpeed;
            }
        } else if(keysDown["s"] || keysDown["S"]) {
            angX = Math.sin(degToRad(player.rot));
            angY = Math.cos(degToRad(player.rot));

            player.velocity -= player.acceleration/10;
            if(player.velocity < -player.maxSpeed) {
                player.velocity = -player.maxSpeed;
            }
        } else {
            if(player.velocity < 0) {
                player.velocity += player.acceleration/8;
                if(player.velocity >= 0) player.velocity = 0;
            } else {
                player.velocity -= player.acceleration/8;
                if(player.velocity <= 0) player.velocity = 0;
            }
        }

        // wrap around
        if(player.x < -100) player.x = canvas.width + 100;
        if(player.x > canvas.width+100) player.x = -100;
        if(player.y < -100) player.y = canvas.height + 100;
        if(player.y > canvas.height+100) player.y = -100;
    }

    function bulletLogic() {
        // move existing bullets
        bullets.forEach(function(b, i) {
            b.x += Math.sin(degToRad(b.rot)) * b.speed;
            b.y -= Math.cos(degToRad(b.rot)) * b.speed;
            b.distance-=b.speed;
            if(b.distance <= 0) {
                // remove bullet after distance is covered
                bullets.splice(i, 1);
            }
            // wrap around
            if(b.x < -100) b.x = canvas.width + 100;
            if(b.x > canvas.width+100) b.x = -100;
            if(b.y < -100) b.y = canvas.height + 100;
            if(b.y > canvas.height+100) b.y = -100;
        });

        // player shooting bullets
        if(player.bullet1CooldownCurrent > 0) player.bullet1CooldownCurrent--;
        if(!player.dead && player.bullet1CooldownCurrent <= 0) {
            if(keysDown["j"] || keysDown["J"]) {
                // shoot bullet
                let b = makeBullet(a.img.bullet1, player.rot, 8, 1, 1000);
                // move bullet to the tip of the rocket
                b.x += Math.sin(degToRad(b.rot)) * 34/2;
                b.y -= Math.cos(degToRad(b.rot)) * 34/2;
                bullets.push(b);
                player.bullet1CooldownCurrent = player.bullet1Cooldown * dt;
            }
        }
        if(player.bullet2CooldownCurrent > 0) player.bullet2CooldownCurrent--;
        if(!player.dead && player.bullet2CooldownCurrent <= 0) {
            if(keysDown["k"] || keysDown["K"]) {
                // shoot bullets (alt)
                for(let i=0; i<360; i+=22.5) {
                    let b = makeBullet(a.img.bullet2, i, 10, 2, 80);
                    bullets.push(b);
                }
                player.bullet2CooldownCurrent = player.bullet2Cooldown * dt;
            }
        }
    }

    function moveAsteroids() {
        asteroids.forEach(function(t, i) {
            t.x += Math.sin(degToRad(t.rot)) * t.speed;
            t.y -= Math.cos(degToRad(t.rot)) * t.speed;
            // wrap around
            if(t.x < -100) t.x = canvas.width + 100;
            if(t.x > canvas.width+100) t.x = -100;
            if(t.y < -100) t.y = canvas.height + 100;
            if(t.y > canvas.height+100) t.y = -100;
        });
    }

    function checkCollision() {
        asteroids.forEach(function(e, i) {
            bullets.forEach(function(b, j) {
                if(isInCollision(e.x, e.y, 32, 32, b.x, b.y, 3, 3)) {
                    bullets.splice(j, 1);
                    e.health -= b.damage;
                    score += 100;
                    if(e.health <= 0) {
                        asteroids.splice(i, 1);
                    }
                }
            });

            if(!player.dead && isInCollision(e.x, e.y, 32, 32, player.x-16, player.y-16, 32, 32)) {
                // declare player dead
                player.dead = true;
                if(lives > 0) {
                    // remove a life if any left
                    lives--;
                }
            }
        });
    }
}

function makeBullet(img, rot, speed, damage, distance) {
    let bullet = {
        img: img,
        x: player.x,
        y: player.y,
        rot: rot,
        speed: speed,
        damage: damage,
        distance: distance
    };
    return bullet;
}

function makeAsteroid() {
    let asteroid = {
        x: Math.ceil(Math.random()*1000) - 100,
        y: Math.ceil(Math.random()*800) - 100,
        rot: Math.ceil(Math.random()*360),
        speed: 3,
        health: 4
    };
    return asteroid;
}

function generateAsteroidWave() {
    asteroids = [];
    for(let i=0; i<8; i++) {
        asteroids.push(makeAsteroid());
    }
}

function degToRad(deg) {
    return deg * Math.PI / 180;
}

function isInCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
    if (x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && h1 + y1 > y2) return true;
    else return false;
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawDebug();
    drawGUI();
    if(!player.dead)
        drawPlayer();
    drawBullets();
    drawAsteroids();

    //ctx.drawImage(a.img.asteroid1small, 50, 50);

    // https://stackoverflow.com/questions/2677671/how-do-i-rotate-a-single-object-on-an-html-5-canvas#11985464
    function drawImageRot(img, x, y, width, height, deg){
        // convert degrees to radian
        var rad = degToRad(deg);
        // set the origin to the center of the image
        ctx.translate(x + width/2, y + height/2);
        // rotate the canvas around the origin
        ctx.rotate(rad);
        //draw the image
        ctx.drawImage(img, -width/2, -height/2, width, height);
        //reset the canvas
        ctx.rotate(-rad);
        ctx.translate(-(x + width/2), -(y + height / 2));
    }

    function drawPlayer() {
        drawImageRot(a.img.rocket1, player.x - 34/2, player.y - 33/2, 34, 33, player.rot);

        // draw offscreen pointer
        let xm = 0, ym = 0;
        if(player.x < 0) xm = -1;
        if(player.x > 800) xm = 1;
        if(player.y < 0) ym = -1;
        if(player.y > 600) ym = 1;

        if(xm > 0 && ym > 0) drawImageRot(a.img.offpointer, canvas.width-13, canvas.height-15, 13, 15, 135);
        else if(xm > 0 && ym < 0) drawImageRot(a.img.offpointer, canvas.width-13, 0, 13, 15, 45);
        else if(xm < 0 && ym > 0) drawImageRot(a.img.offpointer, 0, canvas.height-15, 13, 15, -135);
        else if(xm < 0 && ym < 0) drawImageRot(a.img.offpointer, 0, 0, 13, 15, -45);

        else if(xm > 0) drawImageRot(a.img.offpointer, canvas.width-13, player.y, 13, 15, 90);
        else if(xm < 0) drawImageRot(a.img.offpointer, 0, player.y, 13, 15, -90);

        else if(ym > 0) drawImageRot(a.img.offpointer, player.x, canvas.height-13, 13, 15, 180);
        else if(ym < 0) drawImageRot(a.img.offpointer, player.x, 0, 13, 15, 0);
    }

    function drawBullets() {
        bullets.forEach(function(b) {
            drawImageRot(b.img, b.x, b.y, 3, 3, player.rot);
        });
    }

    function drawAsteroids() {
        asteroids.forEach(function(t) {
            drawImageRot(a.img.asteroid1small, t.x, t.y, 32, 32, t.rot);

            // draw offscreen pointer
            let xm = 0, ym = 0;
            if(t.x < 0) xm = -1;
            if(t.x > 800) xm = 1;
            if(t.y < 0) ym = -1;
            if(t.y > 600) ym = 1;

            if(xm > 0 && ym > 0) drawImageRot(a.img.offpointerAsteroid, canvas.width-9, canvas.height-9, 9, 9, 135);
            else if(xm > 0 && ym < 0) drawImageRot(a.img.offpointerAsteroid, canvas.width-9, 0, 9, 9, 45);
            else if(xm < 0 && ym > 0) drawImageRot(a.img.offpointerAsteroid, 0, canvas.height-9, 9, 9, -135);
            else if(xm < 0 && ym < 0) drawImageRot(a.img.offpointerAsteroid, 0, 0, 9, 9, -45);

            else if(xm > 0) drawImageRot(a.img.offpointerAsteroid, canvas.width-9, t.y, 9, 9, 90);
            else if(xm < 0) drawImageRot(a.img.offpointerAsteroid, 0, t.y, 9, 9, -90);

            else if(ym > 0) drawImageRot(a.img.offpointerAsteroid, t.x, canvas.height-9, 9, 9, 180);
            else if(ym < 0) drawImageRot(a.img.offpointerAsteroid, t.x, 0, 9, 9, 0);
        });
    }

    function drawGUI() {
        // draw score
        ctx.fillStyle = "white";
        ctx.font = "18px sans-serif";
        ctx.fillText(score, canvas.width-canvas.width/4, 20);

        if(lives <= 0 && player.dead) {
            ctx.fillStyle = "white";
            ctx.font = "24px sans-serif";
            ctx.fillText("DED, NOT BIG SOUPRICE", canvas.width/2, canvas.height/2);
        }

        //draw remaining lives
        for(let i=0; i<lives; i++) {
            ctx.drawImage(a.img.rocket1, canvas.width - 18 - i*18, canvas.height - 18, 16, 16);
        }
    }

    function drawDebug() {
        ctx.fillStyle = "white";
        ctx.font = "8px sans-serif";
        ctx.fillText(Math.round(player.x*1000)/1000, 2, 10);
        ctx.fillText(Math.round(player.y*1000)/1000, 2, 20);
    }

}

function main() {
	var now = Date.now();
	var delta = now - then;

	update(delta / 1000);
	render();

	then = now;

	// Request to do this again ASAP
	requestAnimationFrame(main);
}

// Handle keyboard controls
var keysDown = {};

addEventListener("keydown", function (e) {
	keysDown[e.key] = true;
}, false);

addEventListener("keyup", function (e) {
	delete keysDown[e.key];
}, false);
