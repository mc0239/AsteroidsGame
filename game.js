var canvas, ctx, then;

var a; // assets variable

var player, bullets, asteroids, explosions, pickups, score, lives, level, time, achievements, selectedAchievement;

var debug = false;
var pause = false;
var safeDistance = 100;
var pickupCooldown = 0;
var bonusScoreDisplay = {amount: 0, drawTime: 0, blinks: -1};
var waveCompleteTime = 0;

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
    loadSound();

    achievements = [
        ["How do you turn this on", false, "Complete a wave without accelerating", 0],
        ["Backwards compatible", false, "Complete a wave while moving only backwards"],
        ["Not worth it", false, "Do less than 3 damage with charged shot"],
        ["Actually worth it", false, "Do more than 20 damage with charged shot"],
        ["I AM FULLY CHARGED", false, "Get an extra charge pickup while already fully charged"],
        ["Reckless driving", false, "Die twice within 3 seconds", 0],
    ];
    selectedAchievement = 0;

    loadAchievements();

    then = Date.now();

    startNewGame();
    main();
};

function loadImages() {
    a.img.font1 = new Image();
    a.img.font1.src = "./img/font1.png";

    a.img.explosionBlue = new Image();
    a.img.explosionBlue.src = "./img/explosion_blue.png";
    a.img.explosionRed = new Image();
    a.img.explosionRed.src = "./img/explosion_red.png";
    a.img.explosionBig = new Image();
    a.img.explosionBig.src = "./img/explosion_big.png";

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

    a.img.asteroid1_1 = new Image();
    a.img.asteroid1_1.src = "./img/asteroid1_1.png";
    a.img.asteroid1_2 = new Image();
    a.img.asteroid1_2.src = "./img/asteroid1_2.png";
    a.img.asteroid1_3 = new Image();
    a.img.asteroid1_3.src = "./img/asteroid1_3.png";
    a.img.asteroid1_4 = new Image();
    a.img.asteroid1_4.src = "./img/asteroid1_4.png";

    a.img.pickup0 = new Image();
    a.img.pickup0.src = "./img/pickup0.png";

    a.img.achievement0 = new Image();
    a.img.achievement0.src = "./img/achievement_off.png";
    a.img.achievement1 = new Image();
    a.img.achievement1.src = "./img/achievement_on.png";
    a.img.achievementS = new Image();
    a.img.achievementS.src = "./img/achievement_select.png";

    a.img.barFull = new Image();
    a.img.barFull.src = "./img/bar_full.png";
    a.img.barEmpty = new Image();
    a.img.barEmpty.src = "./img/bar_empty.png";
}

function loadSound() {
    a.snd.shoot1 = new Audio();
    a.snd.shoot1.src = "./snd/shoot1.wav";
    a.snd.shoot1.volume = 0.4;
    a.snd.shoot2 = new Audio();
    a.snd.shoot2.src = "./snd/shoot2.wav";
    a.snd.shoot2.volume = 0.4;

    a.snd.explosion = new Audio();
    a.snd.explosion.src = "./snd/explosion.wav";

    a.snd.win = new Audio();
    a.snd.win.volume = 0.55;
    a.snd.win.src = "./snd/win.wav";

    a.snd.charge = new Audio();
    a.snd.charge.volume = 0.55;
    a.snd.charge.src = "./snd/charge.wav";

    a.snd.pickup = new Audio();
    a.snd.pickup.volume = 0.55;
    a.snd.pickup.src = "./snd/pickup.wav";
    a.snd.pickup2 = new Audio();
    a.snd.pickup2.volume = 0.55;
    a.snd.pickup2.src = "./snd/pickup2.wav";
    a.snd.pickup3 = new Audio();
    a.snd.pickup3.volume = 0.55;
    a.snd.pickup3.src = "./snd/pickup3.wav";
}

function saveAchievements() {
    let t = "";
    for(let i=0; i<achievements.length; i++) {
        if(achievements[i][1]) t += "" + 1;
        else t += "" + 0;
    }
    createCookie("ach", t, 365);
}

function loadAchievements() {
    let t = readCookie("ach");
    if(t == null) return;
    for(let i=0; i<t.length; i++) {
        if(t[i] == 1) achievements[i][1] = true;
    }
}

function startNewGame() {
    initPlayer();
    level = 1;
    time = 0;
    generateAsteroidWave(level);
    explosions = [];
    pickups = [];
    bonusScoreDisplay.blinks = -1;
}

function initPlayer() {
    player = {
        isDead: false,
        isAccel : false,

        x: canvas.width/2,
        y: canvas.height/2,
        size: 35,
        collisionSize: 32,
        rot: 0,

        turnSpeed: 2.2,

        maxSpeed: 3,
        acceleration: 0.1,
        velocity: 0,

        bullet1Cooldown: 1000,
        bullet1CooldownCurrent: 0,
        bullet2Cooldown: 5000,
        bullet2CooldownCurrent: 0,
        bullet3Charge: 0,
        bullet3maxCharge: 10,

        addCharge: function(amount) {
            if(player.bullet3Charge < 10) {
                player.bullet3Charge += amount;
                if(player.bullet3Charge >= 10) {
                    a.snd.charge.play();
                    a.snd.charge.currentTime = 0;
                    player.bullet3Charge = 10;
                }
            }

        },
        kill: function() {
            if(achievements[5][3] <= 0) {
                achievements[5][3] = time;
            } else {
                if(time - achievements[5][3] < 3) achievements[5][1] = true;
            }
            player.isDead = true;
            if(lives > 0) lives--;
            player.bullet3Charge = 0;
        }
    };
    bullets = [];
    score = 0;
    lives = 3;
}

let angX = 0, angY = 0;
function update(dt) {
    if(pause) return;

    time += dt;
    pickupCooldown -= dt;
    if(bonusScoreDisplay.drawTime > 0) {
        bonusScoreDisplay.drawTime -= dt;
    } else if(bonusScoreDisplay.blinks >= 0) {
        bonusScoreDisplay.blinks--;
        bonusScoreDisplay.drawTime = 0.5;
    }
    if(waveCompleteTime > 0) waveCompleteTime -= dt;

    movePlayer();
    moveAsteroids();
    bulletLogic();
    checkCollision();
    updateExplosions();
    pickupLogic();

    if(player.isDead && lives > 0) {
        // respawn player when appropriate
        let isEmptyArea = true;
        asteroids.forEach(function(e, i) {
            if(isInCollisionAABB(canvas.width/2 - safeDistance, canvas.height/2 - safeDistance, safeDistance*2, safeDistance*2, e.x - e.size/2, e.y - e.size/2, e.size, e.size)) {
                isEmptyArea = false;
            }
        });
        if(isEmptyArea) {
            player.x = canvas.width/2;
            player.y = canvas.height/2;
            player.velocity = 0;
            player.rot = 0;
            player.isDead = false;
        }
    }

    if(asteroids.length == 0) {
        if(waveCompleteTime <= 0) {
            if(achievements[0][3] == 0) achievements[0][1] = true;
            achievements[0][3] = 0;
            level++;
            lives++;
            score += 1250*level;
            bonusScoreDisplay.amount = 1250*level;
            bonusScoreDisplay.blinks = 3;
            a.snd.win.play();
            a.snd.win.currentTime = 0;
            waveCompleteTime = 3;
        }
        if(waveCompleteTime < 1.5) generateAsteroidWave(level);
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
            achievements[0][3] = 1;
            angX = Math.sin(degToRad(player.rot));
            angY = Math.cos(degToRad(player.rot));

            player.velocity += player.acceleration;
            if(player.velocity > player.maxSpeed) {
                player.velocity = player.maxSpeed;
            }
        } else if(keysDown["s"] || keysDown["S"]) {
            achievements[0][3] = 1;
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
        if(!player.isDead && player.bullet1CooldownCurrent <= 0) {
            if(keysDown["j"] || keysDown["J"]) {
                // shoot bullet
                let b = makeBullet(a.img.bullet1, 8, 1, 1000);
                // move bullet to the tip of the rocket
                b.rot = player.rot;
                b.x += Math.sin(degToRad(b.rot)) * 34/2;
                b.y -= Math.cos(degToRad(b.rot)) * 34/2;
                bullets.push(b);
                player.bullet1CooldownCurrent = player.bullet1Cooldown * dt;
            }
        }
        if(player.bullet2CooldownCurrent > 0) player.bullet2CooldownCurrent--;
        if(!player.isDead && player.bullet2CooldownCurrent <= 0) {
            if(keysDown["k"] || keysDown["K"]) {
                // shoot bullets (alt)
                for(let i=0; i<360; i+=36) {
                    let b = makeBullet(a.img.bullet2, 2.5, 2, 250);
                    b.rot = i;
                    b.size = 7;
                    bullets.push(b);
                }
                player.bullet2CooldownCurrent = player.bullet2Cooldown * dt;
            }
        }
        if(!player.isDead && player.bullet3Charge >= 10) {
            if(keysDown["l"] || keysDown["L"]) {
                player.bullet3Charge = 0;
                // shoot special
                for(let i=0; i<360; i+=9) {
                    let b = makeBullet(a.img.bullet2, 2.5, 2, 500);
                    b.rot = i;
                    b.size = 7;
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
                //if(isInCollisionAABB(e.x - e.size/2, e.y - e.size/2, e.size, e.size, b.x, b.y, 3, 3)) {
                if(isInCollisionCirc(e.x, e.y, e.size/2, b.x, b.y, b.size/2)) {
                    bullets.splice(j, 1);

                    if(b.img == a.img.bullet1) explosions.push(makeExplosion(a.img.explosionBlue, b.x, b.y, 15, 4));
                    else if(b.img == a.img.bullet2) explosions.push(makeExplosion(a.img.explosionRed, b.x, b.y, 15, 8));

                    // only blue bullets give charge
                    if(b.img == a.img.bullet1) player.addCharge(0.5);

                    e.health -= b.damage;
                    score += 100;
                    if(e.health <= 0) {
                        // split asteroid into pieces if size > 1
                        asteroids.splice(i, 1);
                        let newSize = 5;
                        if(e.size == 250) {
                            newSize = 3;
                        } else if(e.size == 125) {
                            newSize = 2;
                        } else if(e.size == 60) {
                            newSize = 1;
                        }
                        for(let k=0; k<5-newSize; k++) {
                            let t = makeAsteroid(newSize);
                            t.x = e.x;
                            t.y = e.y;
                            asteroids.push(t);
                        }
                    }
                }
            });

            if(!player.isDead) {
                //if(isInCollisionAABB(e.x - e.size/2, e.y - e.size/2, e.size, e.size, player.x-16, player.y-16, 32, 32)) {
                if(isInCollisionCirc(e.x, e.y, e.size/2, player.x, player.y, player.collisionSize/2)) {

                    for(let i=0; i<3; i++) {
                        let randX = Math.random()*30 -15;
                        let randY = Math.random()*30 -15;
                        let expl = makeExplosion(a.img.explosionBig, player.x + randX, player.y + randY, 30, 40);
                        // delay explosion by setting negative drawDt
                        expl.drawDt -= i*0.15;
                        explosions.push(expl);
                    }

                    // declare player dead
                    player.kill();
                }
            }
        });
        pickups.forEach(function(p, i) {
            if(!player.isDead) {
                if(isInCollisionCirc(p.x, p.y, p.size/2, player.x, player.y, player.size/2)) {
                    pickups.splice(i, 1);
                    if(p.content == "score") {
                        score += p.amount;
                        bonusScoreDisplay.amount = p.amount;
                        bonusScoreDisplay.blinks = 3;
                        a.snd.pickup.play();
                        a.snd.pickup.currentTime = 0;
                    } else if(p.content == "life") {
                        lives += p.amount;
                        a.snd.pickup2.play();
                        a.snd.pickup2.currentTime = 0;
                    } else if(p.content == "charge") {
                        player.addCharge(p.amount);
                        a.snd.pickup3.play();
                        a.snd.pickup3.currentTime = 0;
                    }
                }
            }
        });
    }

    function updateExplosions() {
        explosions.forEach(function(e, i) {
            e.drawDt += dt;
            if(e.drawDt > 0.08) {
                e.frame++;
                e.drawDt = 0;
                // remove explosion when done
                if(e.frame > 5) explosions.splice(i, 1);
            }
        });
    }

    function pickupLogic() {
        if(pickupCooldown <= 0) {
            // spawn pickup
            pickups.push(makePickup(a.img.pickup0, 19));
            pickupCooldown = 20;
        }

        pickups.forEach(function(p) {
            // move pickups
            p.x += Math.sin(degToRad(p.rot)) * p.speed;
            p.y -= Math.cos(degToRad(p.rot)) * p.speed;

            //slowly rotate em
            p.drawRot += p.speed * 0.25;

            p.drawDt += dt;
            if(p.drawDt > 1) {
                p.drawDt = 0;
                p.frame++;
                // we wain either frame 0 or 1
                p.frame %= 2;
            }

            // wrap around
            if(p.x < -100) p.x = canvas.width + 100;
            if(p.x > canvas.width+100) p.x = -100;
            if(p.y < -100) p.y = canvas.height + 100;
            if(p.y > canvas.height+100) p.y = -100;
        });
    }
}

function makeBullet(img, speed, damage, distance) {
    let bullet = {
        img: img,
        x: player.x,
        y: player.y,
        size: 3,
        rot: 0,
        speed: speed,
        damage: damage,
        distance: distance
    };
    if(img == a.img.bullet1) {
        a.snd.shoot1.play();
        a.snd.shoot1.currentTime = 0;
    } else if(img == a.img.bullet2) {
        a.snd.shoot2.play();
        a.snd.shoot2.currentTime = 0;
    }
    return bullet;
}

function makeAsteroid(size) {
    let asteroid = {
        img: null,
        x: Math.ceil(Math.random()*1000) - 100,
        y: Math.ceil(Math.random()*800) - 100,
        size: 0,
        rot: Math.ceil(Math.random()*360),
        speed: 0,
        health: 0
    };
    switch(size) {
        case 1:
            asteroid.img = a.img.asteroid1_1;
            asteroid.speed = 3;
            asteroid.health = 1;
            asteroid.size = 30;
            break;
        case 2:
            asteroid.img = a.img.asteroid1_2;
            asteroid.speed = 2;
            asteroid.health = 2;
            asteroid.size = 60;
            break;
        case 3:
            asteroid.img = a.img.asteroid1_3;
            asteroid.speed = 1.5;
            asteroid.health = 4;
            asteroid.size = 125;
            break;
        case 4:
            asteroid.img = a.img.asteroid1_4;
            asteroid.speed = 0.8;
            asteroid.health = 8;
            asteroid.size = 250;
            break;
        default:
            // EXCEPTION
        break;
    }
    return asteroid;
}

function makeExplosion(img, x, y, size, drawSize = size) {
    let explosion = {
        img: img,
        x: x,
        y: y,
        drawSize: drawSize,
        drawDt: 0,
        size: size,
        frame: 0
    };
    a.snd.explosion.play();
    a.snd.explosion.currentTime = 0;
    return explosion;
}

function makePickup(img, size) {
    let pickup = {
        img: img,
        x: Math.ceil(Math.random()*1000) - 100,
        y: Math.ceil(Math.random()*800) - 100,
        rot: Math.ceil(Math.random()*360),
        drawRot: Math.ceil(Math.random()*360),
        drawDt: Math.random(),
        frame: 0,
        size: size,
        speed: 1,
        content: "score",
        amount: 10000
    };
    let chance = Math.random()*100;
    // 10% chance of a 1UP pickup
    if(chance < 10) {
        pickup.content = "life";
        pickup.amount = 1;
    } else if(chance < 35) { // 25% chance of getting 1/4 of a charge
        pickup.content = "charge";
        pickup.amount = 2.5;
    }
    // the rest (65%) is a chance of getting 10000 score
    return pickup;
}

var levels = [
    [2, 1],
    [2, 2],
    [3, 2],
    [4],
    [3, 3, 3],
    [4, 2, 2],
    [4, 2, 1, 1, 1],
    [4, 3, 3],
    [3, 3, 3, 3, 3],
    [4, 4, 2],
    [4, 4, 3, 1, 1],
    [4, 4, 4],
    [4, 4, 4, 1],
    [4, 4, 3, 3, 2],
    [4, 4, 4, 3]
];

function generateAsteroidWave(level) {
    asteroids = [];
    let j = 0;
    if(level > 14) {
        j = level-14;
        level = 14;
    }
    let le = levels[level-1];
    for(let i=0; i<le.length; i++) {
        asteroids.push(makeAsteroid(le[i]));
    }
    for(let k=0; k<j; k++) {
        asteroids.push(makeAsteroid(le[2]));
    }
}

function degToRad(deg) {
    return deg * Math.PI / 180;
}

// https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
function isInCollisionAABB(x1, y1, w1, h1, x2, y2, w2, h2) {
    if (x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && h1 + y1 > y2) return true;
    else return false;
}

function isInCollisionCirc(x1, y1, r1, x2, y2, r2) {
    var dx = x1 - x2;
    var dy = y1 - y2;
    var distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < r1 + r2) return true;
    else return false;
}

var fontMap = {
    ' ': 0, '!': 1, '\"': 2,
    '#': 3, '$': 4, '%': 5, '&': 6, '\'': 7,
    '(': 8, ')': 9, '*': 10, '+': 11, ',': 12,
    '-': 13, '.': 14, '/': 15,
    '0': 16, '1': 17, '2': 18, '3': 19, '4': 20,
    '5': 21, '6': 22, '7': 23, '8': 24, '9': 25,
    ':': 26, ';': 27, '<': 28, '=': 29, '>': 30,
    '?': 31, '@': 32,
    'A': 33, 'B': 34, 'C': 35, 'D': 36, 'E': 37,
    'F': 38, 'G': 39, 'H': 40, 'I': 41, 'J': 42,
    'K': 43, 'L': 44, 'M': 45, 'N': 46, 'O': 47,
    'P': 48, 'Q': 49, 'R': 50, 'S': 51, 'T': 52,
    'U': 53, 'V': 54, 'W': 55, 'X': 56, 'Y': 57,
    'Z': 58,
    '[': 59, '\\': 60, ']': 61, '\^': 62, '_': 63,
    '`': 64,
    'a': 65, 'b': 66, 'c': 67, 'd': 68, 'e': 69,
    'f': 70, 'g': 71, 'h': 72, 'i': 73, 'j': 74,
    'k': 75, 'l': 76, 'm': 77, 'n': 78, 'o': 79,
    'p': 80, 'q': 81, 'r': 82, 's': 83, 't': 84,
    'u': 85, 'v': 86, 'w': 87, 'x': 88, 'y': 89,
    'z': 90,
    '{': 91, '|': 92, '}': 93, '~': 94
};
function drawFont(fontImage, x, y, word, scale = 1) {
    for(let i=0; i<word.length; i++) {
        ctx.drawImage(fontImage, 10*fontMap[word[i]], 0, 10, 24, x + (10*i*scale), y, 10*scale, 24*scale);
    }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if(debug) drawDebug();
    drawGUI();
    drawBullets();
    if(!player.isDead) drawPlayer();
    drawPickups();
    drawAsteroids();
    drawExplosions();
    if(pause) {
        drawFont(a.img.font1, canvas.width/2 - 82.5, 150, "GAME PAUSED", 1.5);
        drawAchievementScreen();
    }

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

    function drawImagePartRot(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight, deg) {
        // convert degrees to radian
        var rad = degToRad(deg);
        // set the origin to the center of the image
        ctx.translate(dx + dWidth/2, dy + dHeight/2);
        // rotate the canvas around the origin
        ctx.rotate(rad);
        //draw the image
        ctx.drawImage(img, sx, sy, sWidth, sHeight, -dWidth/2, -dHeight/2, dWidth, dHeight);
        //reset the canvas
        ctx.rotate(-rad);
        ctx.translate(-(dx + dWidth/2), -(dy + dHeight / 2));
    }

    function drawPlayer() {
        drawImageRot(a.img.rocket1, player.x - player.size/2, player.y - player.size/2, player.size, player.size, player.rot);
        if(debug) {
            // debug draw
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.collisionSize/2, 0, 2 * Math.PI, false);
            ctx.strokeStyle = '#FF00AA';
            ctx.stroke();
        }

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
            drawImageRot(b.img, b.x - b.size/2, b.y - b.size/2, b.size, b.size, player.rot);
            if(debug) {
                // debug draw
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.size/2, 0, 2 * Math.PI, false);
                ctx.strokeStyle = '#FF0000';
                ctx.stroke();
            }
        });
    }

    function drawAsteroids() {
        asteroids.forEach(function(t) {
            drawImageRot(t.img, t.x - t.size/2, t.y - t.size/2, t.size, t.size, t.rot);
            if(debug) {
                // debug draw
                ctx.beginPath();
                ctx.arc(t.x, t.y, t.size/2, 0, 2 * Math.PI, false);
                ctx.strokeStyle = '#FF0000';
                ctx.stroke();
            }

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

    function drawExplosions() {
        explosions.forEach(function(e) {
            if(e.drawDt >= 0) ctx.drawImage(e.img, e.size*e.frame, 0, e.size, e.size, e.x-e.drawSize/2, e.y-e.drawSize/2, e.drawSize, e.drawSize);
        });
    }

    function drawPickups() {
        pickups.forEach(function(p) {
            drawImagePartRot(p.img, p.size*p.frame, 0, p.size, p.size, p.x-p.size/2, p.y-p.size/2, p.size, p.size, p.drawRot);
            if(debug) {
                // debug draw
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size/2, 0, 2 * Math.PI, false);
                ctx.strokeStyle = '#FF2299';
                ctx.stroke();
            }
        });
    }

    function drawGUI() {
        // draw score
        drawFont(a.img.font1, canvas.width*3/4, 10, "" + score);
        if(bonusScoreDisplay.drawTime > 0.25) {
            drawFont(a.img.font1, canvas.width*3/4, 35, "+" + bonusScoreDisplay.amount);
        }

        if(lives <= 0 && player.isDead) drawFont(a.img.font1, canvas.width*3/5, canvas.height*4/5, "Boom. Dead.", 1.25);
        if(waveCompleteTime > 0) drawFont(a.img.font1, canvas.width/2 - 77, 10, "Wave complete!", 1.1);

        //draw remaining lives
        for(let i=0; i<lives; i++) {
            ctx.drawImage(a.img.rocket1, canvas.width - 30 - i*22, canvas.height - 30, 20, 20);
        }

        //draw wave count
        drawFont(a.img.font1, 10, canvas.height-30, "Wave " + level);

        //draw special charge bar
        let startX = canvas.width/2 - player.bullet3maxCharge*10/2;
        for(let i=0; i<player.bullet3maxCharge; i++) {
            if(i-player.bullet3Charge <= -1)
                ctx.drawImage(a.img.barFull, startX + i*10, canvas.height-26, 10, 20);
            else
                ctx.drawImage(a.img.barEmpty, startX + i*10, canvas.height-26, 10, 20);

        }
    }

    function drawDebug() {
        ctx.fillStyle = "white";
        ctx.font = "8px sans-serif";
        ctx.fillText(Math.round(player.x*1000)/1000, 2, 10);
        ctx.fillText(Math.round(player.y*1000)/1000, 2, 20);

        ctx.fillText(Math.floor(time), 2, 30);

        // debug draw
        ctx.beginPath();
        ctx.strokeStyle = '#FFCC00';
        ctx.strokeRect(canvas.width/2 - safeDistance, canvas.height/2 - safeDistance, safeDistance*2, safeDistance*2);
    }

    function drawAchievementScreen() {
        let startX = canvas.width/2 - 236/2;
        let j = 0;
        let startY = 200;
        for(let i=0; i<achievements.length; i++) {
            if(achievements[i][1]) ctx.drawImage(a.img.achievement1, startX+j*50, startY, 36, 36);
            else ctx.drawImage(a.img.achievement0, startX+j*50, startY, 36, 36);

            if(selectedAchievement == i) ctx.drawImage(a.img.achievementS, startX+j*50, startY, 36, 36);

            j++;
            if(j >= 5) {
                j=0; startY += 50;
            }
        }

        let aTitle = achievements[selectedAchievement][0];
        let aText = achievements[selectedAchievement][2];
        drawFont(a.img.font1, canvas.width/2 - aTitle.length*10/2, startY+50, aTitle);
        drawFont(a.img.font1, canvas.width/2 - aText.length*0.9*10/2, startY+80, aText, 0.9);
    }

}

function main() {
	var now = Date.now();
	var delta = (now - then) / 1000;

	update(delta);
	render(delta);

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
    if(e.key == "u" || e.key == "U") debug = !debug;
    if(e.key == "p" || e.key == "P") {
        pause = !pause;
        saveAchievements();
    }
    if(e.key == "r" || e.key == "R") startNewGame();

    if(pause) {
        // moving in achievements
        if(e.key == "a" || e.key == "A") selectedAchievement--;
        if(e.key == "d" || e.key == "D") selectedAchievement++;
        if(e.key == "w" || e.key == "W") selectedAchievement-=5;
        if(e.key == "s" || e.key == "S") selectedAchievement+=5;
        if(selectedAchievement < 0) selectedAchievement += 10;
        selectedAchievement = Math.abs(selectedAchievement%achievements.length);
    }
}, false);

//https://stackoverflow.com/questions/14573223/set-cookie-and-get-cookie-with-javascript#24103596
function createCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + value + expires + "; path=/";
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}
