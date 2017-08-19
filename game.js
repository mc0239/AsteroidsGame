/* global Phaser */

var game = new Phaser.Game(800, 600, Phaser.AUTO, document.getElementById("game"), { preload: preload, create: create, update: update}, true, true, null);

var _a;

var player, bullets, asteroids, explosions, pickups;

var score, lives, level;

var time, debug = false;

var _ui;

function preload() {
    _a = {
        img: {},
        snd: {}
    };
    loadImages();
    loadSound();
}

function create() {
    game.input.keyboard.addKey(Phaser.Keyboard.P).onDown.add(function() {
        game.paused = !game.paused;
        saveAchievements();
        updateUI();
    }, this);
    game.input.keyboard.addKey(Phaser.Keyboard.U).onDown.add(function() {
        debug = !debug;
        _ui.debug.visible = debug;
        game.debug.reset();
    }, this);
    game.input.keyboard.addKey(Phaser.Keyboard.R).onDown.add(function() {
        startNewGame();
    }, this);

    loadAchievements();

    game.physics.startSystem(Phaser.Physics.ARCADE);

    _a.snd.shoot1 = game.add.audio("shoot1");
    _a.snd.shoot2 = game.add.audio("shoot2");
    _a.snd.explosion = game.add.audio("explosion");
    _a.snd.win = game.add.audio("win");
    _a.snd.pickup1 = game.add.audio("pickup1");
    _a.snd.pickup2 = game.add.audio("pickup2");
    _a.snd.pickup3 = game.add.audio("pickup3");

    initPlayer();


    bullets = game.add.group();
    bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;

    asteroids = game.add.group();
    asteroids.enableBody = true;
    asteroids.physicsBodyType = Phaser.Physics.ARCADE;

    pickups = game.add.group();
    pickups.enableBody = true;
    pickups.physicsBodyType = Phaser.Physics.ARCADE;

    explosions = game.add.group();

    startNewGame();
    initUI();
}

function startNewGame() {
    player.reset();
    score = 0;
    lives = 3;
    level = 1;
    time = 0;

    waveCompleteCooldown = 0;
    pickupCooldown = 0;

    bullets.killAll();
    asteroids.killAll();
    pickups.killAll();
    explosions.removeAll(true);
    generateAsteroidWave(level);
}

function initUI() {
    _ui = {};
    _ui.score = makeText("kek: " + score, game.width*3/4, 10);
    _ui.waveCount = makeText("Wave " + level, 10, game.height-30);
    _ui.pauseTitle = makeText("GAME PAUSED", game.width/2, 150, 3);
    _ui.pauseTitle.image.anchor.setTo(0.5, 0);
    _ui.pauseTitle.image.visible = false;

    _ui.waveComplete = makeText("Wave complete!", game.width/2, 10, 2.2);
    _ui.waveComplete.image.anchor.setTo(0.5, 0);
    _ui.waveComplete.image.visible = false;

    _ui.bonusScore = makeText("", game.width*3/4, 35);
    _ui.bonusScore.amount = 0;
    _ui.bonusScore.blinks = -1;
    _ui.bonusScore.drawTime = 0;

    _ui.deathNotice = makeText("Boom. Dead.", game.width/2, game.height/2, 2.5);
    _ui.deathNotice.image.anchor.set(0.5);
    _ui.deathNotice.image.visible = false;

    _ui.lives = game.add.group();

    _ui.debug = game.add.group();
    _ui.debug.playerX = game.add.text(2, 0, Math.round(player.sprite.x*1000)/1000, {font: "8px sans-serif", fill: "white"}, _ui.debug);
    _ui.debug.playerY = game.add.text(2, 10, Math.round(player.sprite.y*1000)/1000, {font: "8px sans-serif", fill: "white"}, _ui.debug);
    _ui.debug.time = game.add.text(2, 20, Math.floor(time), {font: "8px sans-serif", fill: "white"}, _ui.debug);
    _ui.debug.visible = false;

}

function makeText(text, x, y, scale = 2) {
    let t = {};
    t.font = game.add.retroFont("font1", 5, 12, " !\"#$%&`()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_'abcdefghijklmnopqrstuvwxyz{|}~", 20);
    t.image = game.add.image(x, y, t.font);

    t.font.autoUpperCase = false;
    t.font.text = text;
    t.image.scale.set(scale);
    return t;
}

function updateText(uiElement, text, visible = true) {
    if(text != undefined)
        uiElement.font.text = text;
    uiElement.image.visible = visible;
}

function giveBonusScore(amount, blinks = 3) {
    score += amount;

    _ui.bonusScore.font.text = "+" + amount;
    _ui.bonusScore.amount = amount;
    _ui.bonusScore.blinks = blinks;
}

function updateUI() {
    updateText(_ui.score, "" + score);
    updateText(_ui.waveCount, "Wave " + level);
    updateText(_ui.pauseTitle, undefined, game.paused);
    updateText(_ui.waveComplete, undefined, waveCompleteCooldown > 1.5);
    updateText(_ui.bonusScore, undefined, _ui.bonusScore.drawTime > 0.25);
    // blink bonus score
    if(_ui.bonusScore.drawTime > 0) {
        _ui.bonusScore.drawTime -= game.time.physicsElapsed;
    } else if(_ui.bonusScore.blinks >= 0) {
        _ui.bonusScore.blinks--;
        _ui.bonusScore.drawTime = 0.5;
    }

    // show death notice if player is dead and has no more lives
    _ui.deathNotice.image.visible = (lives <= 0 && !player.alive);

    // draw remaining lives
    for(let i=0; i<(_ui.lives.length > lives ? _ui.lives.length : lives); i++) {
        let l = _ui.lives.getAt(i);
        if(l == -1) {
            game.add.image(game.width-30 - i*22, game.height-30, "rocket1", undefined, _ui.lives).scale.set(0.55);
        } else {
            l.visible = !(i >= lives);
        }
    }

    // draw pointers
    drawOffScreenPointer(player.sprite, player.offscreenPointer);
    asteroids.forEach(function(a) {
        drawOffScreenPointer(a, a.offscreenPointer);
    }, this, true);

    if(debug) drawDebug();
}

function drawDebug() {
    asteroids.forEach(function(a){
        game.debug.body(a);
    }, this, true);
    bullets.forEach(function(b){
        game.debug.body(b);
    }, this, true);
    pickups.forEach(function(p){
        game.debug.body(p);
    }, this, true);
    game.debug.body(player.sprite);

    _ui.debug.time.text = Math.floor(time);
    _ui.debug.playerX = Math.round(player.x*1000)/1000;
    _ui.debug.playerY = Math.round(player.y*1000)/1000;
}

var waveCompleteCooldown = 0, pickupCooldown = 0;

function update() {
    time += game.time.physicsElapsed;

    movePlayer();
    bulletLogic();
    pickupLogic();
    asteroids.forEach(wrapAround, this, true);
    checkCollision();
    updateUI();

    if(!player.sprite.alive && lives > 0) {
        player.sprite.reset(game.width/2, game.height/2);
    }

    // when all asteroids are cleared, bring on next level
    if(asteroids.getFirstAlive() == null) {
        waveCompleteCooldown -= game.time.physicsElapsed;
        if(waveCompleteCooldown <= 0) {
            level++;
            lives++;
            giveBonusScore(1250 * level);
            _a.snd.win.play();
            waveCompleteCooldown = 3;
        }
        if(waveCompleteCooldown < 1) {
            generateAsteroidWave(level);
            waveCompleteCooldown = 0;
        }
    }

    function movePlayer() {
        if (game.input.keyboard.isDown(Phaser.KeyCode.W)) {
            game.physics.arcade.accelerationFromRotation(player.sprite.rotation - Math.PI/2, 200, player.sprite.body.acceleration);
        } else {
            player.sprite.body.acceleration.set(0);
        }

        if (game.input.keyboard.isDown(Phaser.KeyCode.A)) {
            player.sprite.body.angularVelocity = -100;
        } else if (game.input.keyboard.isDown(Phaser.KeyCode.D)) {
            player.sprite.body.angularVelocity = 100;
        } else {
            player.sprite.body.angularVelocity = 0;
        }

        wrapAround(player.sprite);
    }

    function bulletLogic() {
        bullets.forEach(wrapAround, this, true);
        bullets.forEach(function(b) {
            b.distance--;
            // if distance is covered, remove bullet
            if(b.distance < 0) bullets.remove(b, true);
        }, this, true);
        // player shooting bullets
        if(player.bullet1CooldownCurrent > 0) player.bullet1CooldownCurrent -= game.time.physicsElapsed;
        if(player.sprite.alive && player.bullet1CooldownCurrent <= 0) {
            if(game.input.keyboard.isDown(Phaser.KeyCode.J)) {
                // shoot bullet
                makeBullet("bullet1", 1, 500, 110);
                _a.snd.shoot1.play();
                player.bullet1CooldownCurrent = player.bullet1Cooldown;
            }
        }
        if(player.bullet2CooldownCurrent > 0) player.bullet2CooldownCurrent -= game.time.physicsElapsed;
        if(player.sprite.alive && player.bullet2CooldownCurrent <= 0) {
            if(game.input.keyboard.isDown(Phaser.KeyCode.K)) {
                // shoot bullets (alt)
                for(let i=0; i<360; i+=36) {
                    makeBullet("bullet2", 2, 156, 100, i);
                }
                _a.snd.shoot2.play();
                player.bullet2CooldownCurrent = player.bullet2Cooldown;
            }
        }
        if(player.sprite.alive && player.bullet3Charge >= 10) {
            if(game.input.keyboard.isDown(Phaser.KeyCode.L)) {
                player.bullet3Charge = 0;
                // TODO: shoot special
            }
        }
    }

    function pickupLogic() {
        pickups.forEach(wrapAround, this, true);
        pickups.forEach(function(p) {
            //slowly rotate em
            p.rotation += game.time.physicsElapsed * 0.5;
        }, this, true);

        pickupCooldown -= game.time.physicsElapsed;
        if(pickupCooldown <= 0) {
            // spawn pickup
            makePickup("pickup0");
            pickupCooldown = 20;
        }
    }

    function checkCollision() {
        game.physics.arcade.overlap(bullets, asteroids, function(b, a) {
            a.health -= b.damage;
            score += 100;

            if(a.health <= 0) {
                // split asteroid into pieces if size > 1
                let newSize = a.size-1;
                if(newSize > 0) {
                    for(let k=0; k<5-newSize; k++) makeAsteroidBySize(newSize, a.x, a.y);
                }
                a.kill();
            }
            if(b.key == "bullet1") {
                makeExplosion("explosionBlue", b.x, b.y, 0.5);
                player.addCharge(0.5);
            }
            else if(b.key == "bullet2") makeExplosion("explosionRed", b.x, b.y, 0.75);
            b.kill();
        });
        game.physics.arcade.overlap(player.sprite, asteroids, function(plr, a) {
            if(plr.alive) {
                // TODO: make explosions on player's death
                for(let i=0; i<3; i++) {
                    makeExplosion("explosionBig", player.sprite.x + random(-15, 15), player.sprite.y + random(-15, 15), random(1.2, 1.6), random(10, 60));
                }
                player.kill();
            }
        });
        game.physics.arcade.overlap(player.sprite, pickups, function(plr, pic) {
            if(plr.alive) {
                if(pic.content == "score") {
                    giveBonusScore(pic.amount);
                    _a.snd.pickup1.play();
                } else if(pic.content == "life") {
                    lives += pic.amount;
                    _a.snd.pickup2.play();
                } else if(pic.content == "charge") {
                    player.addCharge(pic.amount);
                    _a.snd.pickup3.play();
                }
                pic.kill();
            }
        });
    }
}

function loadImages() {
    _a.img.font1 = game.load.image("font1", "./img/font1.png");

    game.load.spritesheet("explosionBlue", "./img/explosion_blue.png", 15, 15);
    game.load.spritesheet("explosionRed", "./img/explosion_red.png", 15, 15);
    game.load.spritesheet("explosionBig", "./img/explosion_big.png", 30, 30);

    _a.img.rocket1 = game.load.image("rocket1", "./img/rocket1.png");
    _a.img.offscreenPointer = game.load.image("offscreenPointer", "./img/offscreen_pointer.png");
    _a.img.offscreenPointerAsteroid =game.load.image("offscreenPointerAsteroid", "./img/offscreen_pointer2.png");

    _a.img.bullet1 = game.load.image("bullet1", "./img/bullet1.png");
    _a.img.bullet2 = game.load.image("bullet2", "./img/bullet2.png");

    _a.img.asteroid1_1 = game.load.image("asteroid1_1", "./img/asteroid1_1.png");
    _a.img.asteroid1_2 = game.load.image("asteroid1_2", "./img/asteroid1_2.png");
    _a.img.asteroid1_3 = game.load.image("asteroid1_3", "./img/asteroid1_3.png");
    _a.img.asteroid1_4 = game.load.image("asteroid1_4", "./img/asteroid1_4.png");

    game.load.spritesheet("pickup0", "./img/pickup0.png", 19, 19);

    _a.img.achievementOff = game.load.image("achievementOff", "./img/achievement_off.png");
    _a.img.achievementOn = game.load.image("achievementOn", "./img/achievement_on.png");
    _a.img.achievementSelect = game.load.image("achievementSelect", "./img/achievement_select.png");

    _a.img.barFull = game.load.image("barFull", "./img/bar_full.png");
    _a.img.barEmpty = game.load.image("barEmpty", "./img/bar_empty.png");
}

function loadSound() {
    game.load.audio("shoot1", "./snd/shoot1.wav");
    game.load.audio("shoot2", "./snd/shoot2.wav");

    game.load.audio("explosion", "./snd/explosion.wav");

    game.load.audio("win", "./snd/win.wav");
    _a.snd.charge = game.load.audio("charge", "./snd/charge.wav");

    game.load.audio("pickup1", "./snd/pickup.wav");
    game.load.audio("pickup2", "./snd/pickup2.wav");
    game.load.audio("pickup3", "./snd/pickup3.wav");
}

function wrapAround(sprite) {
    // wrap around
    if(sprite.x < -100) sprite.x = game.width + 100;
    if(sprite.x > game.width+100) sprite.x = -100;
    if(sprite.y < -100) sprite.y = game.height + 100;
    if(sprite.y > game.height+100) sprite.y = -100;
}

function drawOffScreenPointer(sprite, pointer) {
    // draw offscreen pointer
    let xm = 0, ym = 0;
    if(sprite.x < 0) xm = -1;
    if(sprite.x > 800) xm = 1;
    if(sprite.y < 0) ym = -1;
    if(sprite.y > 600) ym = 1;

    pointer.visible = true;

    if(xm > 0 && ym > 0) {
        pointer.position.setTo(game.width+4, game.height-6);
        pointer.angle = 135;
    } else if(xm > 0 && ym < 0) {
        pointer.position.setTo(game.width-4, -4);
        pointer.angle = 45;
    } else if(xm < 0 && ym > 0) {
        pointer.position.setTo(4, game.height+4);
        pointer.angle = -135;
    } else if(xm < 0 && ym < 0) {
        pointer.position.setTo(-4, 6);
        pointer.angle = -45;
    } else if(xm > 0) {
        pointer.position.setTo(game.width, sprite.y);
        pointer.angle = 90;
    } else if(xm < 0) {
        pointer.position.setTo(0, sprite.y);
        pointer.angle = -90;
    } else if(ym > 0) {
        pointer.position.setTo(sprite.x, game.height);
        pointer.angle = 180;
    } else if(ym < 0) {
        pointer.position.setTo(sprite.x, 0);
        pointer.angle = 0;
    } else {
        pointer.visible = false;
    }
}

function initPlayer() {
    // TODO: put all this into one object, like asteroid..
    player = {
        sprite: game.add.sprite(game.width/2, game.height/2, "rocket1"),
        offscreenPointer: game.add.sprite(0, 0, "offscreenPointer"),

        bullet1Cooldown: 0.3,
        bullet1CooldownCurrent: 0,
        bullet2Cooldown: 1.5,
        bullet2CooldownCurrent: 0,
        bullet3Charge: 0,
        bullet3maxCharge: 10,

        addCharge: function(amount) {
            if(player.bullet3Charge < 10) {
                player.bullet3Charge += amount;
                if(player.bullet3Charge >= 10) {
                    _a.snd.charge.play();
                    player.bullet3Charge = 10;
                }
            }

        },
        kill: function() {
            player.sprite.kill();
            if(lives > 0) lives--;
            player.bullet3Charge = 0;
        },
        reset: function() {
            player.sprite.reset(game.width/2, game.height/2);
            player.sprite.rotation = 0;
        }
    };
    player.sprite.anchor.set(0.5);

    game.physics.enable(player.sprite, Phaser.Physics.ARCADE);
    player.sprite.body.drag.set(250);
    player.sprite.body.maxVelocity.set(250);

    player.offscreenPointer.visible = false;
}

function makeBullet(img, damage, speed, distance, angle = player.sprite.rotation) {
    let b = bullets.getFirstDead();
    if(b == null) {
        b = game.add.sprite(player.sprite.x, player.sprite.y, img, undefined, bullets);
        b.anchor.set(0.5);
    } else {
        b.loadTexture(img, 0);
        b.reset(player.sprite.x, player.sprite.y);
    }
    b.damage = damage;
    b.distance = distance;
    game.physics.arcade.velocityFromRotation(angle - Math.PI/2, speed, b.body.velocity);
    return b;
}

function makeExplosion(img, x, y, scale = 1, frameRate = 20) {
    let e = explosions.getFirstDead();
    if(e == null) {
        e = game.add.sprite(x, y, img, undefined, explosions);
        e.anchor.set(0.5);
        e.animations.add("explode");
    } else {
        e.reset(x, y);
        e.loadTexture(img, 0);
        e.frame = 0;
    }

    e.scale.set(scale);
    e.animations.play("explode", frameRate, false, true);
    _a.snd.explosion.play();
    return e;
}

function makePickup(img, x = random(-100, game.width+100), y = random(-100, game.height+100)) {
    let p = pickups.getFirstDead();
    if(p == null) {
        p = game.add.sprite(x, y, img, undefined, pickups);
        p.anchor.set(0.5);
        p.animations.add("blink");
    } else {
        p.reset(x, y);
        p.loadTexture(img, 0);
        p.frame = 0;
    }

    p.content = "score";
    p.amount = 10000;

    p.animations.play("blink", 1, true, false);
    game.physics.arcade.velocityFromRotation(random(0, 2*Math.PI) - Math.PI/2, 50, p.body.velocity);

    let chance = random(0, 100);
    // 10% chance of a 1UP pickup
    if(chance < 10) {
        p.content = "life";
        p.amount = 1;
    } else if(chance < 35) { // 25% chance of getting 1/4 of a charge
        p.content = "charge";
        p.amount = 2.5;
    }
    // the rest (65%) is a chance of getting 10000 score
    return p;
}

function makeAsteroid(size, img, x, y, speed, health, scale) {
    let a = asteroids.getFirstDead();
    if(a == null) {
        a = game.add.sprite(x, y, img, undefined, asteroids);
        a.anchor.set(0.5);
    } else {
        a.reset(x, y);
        a.loadTexture(img, 0);
        a.offscreenPointer.visible = false;
    }

    a.health = health;
    // scale is relative to asteroid's sprite size
    a.scale.set(scale);
    a.size = size;
    game.physics.arcade.velocityFromRotation(random(0, 2*Math.PI) - Math.PI/2, speed, a.body.velocity);

    a.offscreenPointer = game.add.sprite(0, 0, "offscreenPointerAsteroid");
    a.offscreenPointer.visible = false;
    return a;
}

function makeAsteroidBySize(size, x = random(-100, game.width+100), y = random(-100, game.height+100)) {
    switch (size) {
        case 1: return makeAsteroid(1, "asteroid1_1", x, y, 150, 1, 0.94);
        case 2: return makeAsteroid(2, "asteroid1_2", x, y, 100, 2, 0.94);
        case 3: return makeAsteroid(3, "asteroid1_3", x, y, 75, 4, 0.98);
        case 4: return makeAsteroid(4, "asteroid1_4", x, y, 40, 8, 0.98);
        default: return undefined;
    }
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
    //asteroids.removeAll(true);
    let j = 0;
    if(level > 14) {
        j = level-14;
        level = 14;
    }
    let le = levels[level-1];
    for(let i=0; i<le.length; i++) {
        makeAsteroidBySize(le[i]);
    }
    for(let k=0; k<j; k++) {
        makeAsteroidBySize(le[2]);
    }
}

function random(min, max) {
    return Math.random()*(max-min) + min;
}

// TODO: implement achievements
var achievements = [
    ["How do you turn this on", false, "Complete a wave without accelerating", 0],
    ["Backwards compatible", false, "Complete a wave while moving only backwards", 0],
    ["??????", false, ""],
    ["??????", false, ""],
    ["I AM FULLY CHARGED", false, "Get an extra charge pickup while already fully charged"],
    ["Reckless driving", false, "Die twice within 3 seconds", 0],
];
var selectedAchievement = 0;

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

function render_old() {
    // TODO: re-implement draw special charge bar
    /*
    let startX = canvas.width/2 - player.bullet3maxCharge*10/2;
    for(let i=0; i<player.bullet3maxCharge; i++) {
        if(i-player.bullet3Charge <= -1)
            ctx.drawImage(a.img.barFull, startX + i*10, canvas.height-26, 10, 20);
        else
            ctx.drawImage(a.img.barEmpty, startX + i*10, canvas.height-26, 10, 20);

    }
    */
    // TODO: re-implement achievements screen
    /*
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
    */
}

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
