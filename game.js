/* global Phaser */

var game = new Phaser.Game({
    antialias: false,
    height: 600,
    parent: document.getElementById("game"),
    state: { preload: preload, create: create, update: update },
    transparent: true,
    width: 800
});

var _a;

var player, bullets, asteroids, explosions, pickups;

var score, lives, level;

var time, debug = false;

var _ui;

function preload() {

    loadGraphics();
    loadAudio();

    _a = {
        img: {},
        snd: {}
    };

    loadAchievements();

    function loadGraphics() {
        game.load.image("font1", "./img/font1.png");

        game.load.spritesheet("explosionBlue", "./img/explosion_blue.png", 15, 15);
        game.load.spritesheet("explosionRed", "./img/explosion_red.png", 15, 15);
        game.load.spritesheet("explosionGreen", "./img/explosion_green.png", 15, 15);
        game.load.spritesheet("explosionGreenBig", "./img/explosion_green_big.png", 30, 30);
        game.load.spritesheet("explosionBig", "./img/explosion_big.png", 30, 30);

        game.load.image("rocket1", "./img/rocket1.png");
        game.load.image("offscreenPointer", "./img/offscreen_pointer.png");
        game.load.image("offscreenPointerAsteroid", "./img/offscreen_pointer2.png");

        game.load.image("bullet1", "./img/bullet1.png");
        game.load.image("bullet2", "./img/bullet2.png");
        game.load.image("bullet3", "./img/bullet3.png");
        game.load.image("bullet4", "./img/bullet4.png");

        game.load.image("asteroid1_1", "./img/asteroid1_1.png");
        game.load.image("asteroid1_2", "./img/asteroid1_2.png");
        game.load.image("asteroid1_3", "./img/asteroid1_3.png");
        game.load.image("asteroid1_4", "./img/asteroid1_4.png");

        game.load.spritesheet("pickup0", "./img/pickup0.png", 19, 19);

        game.load.image("achievementOff", "./img/achievement_off.png");
        game.load.image("achievementOn", "./img/achievement_on.png");
        game.load.image("achievementSelect", "./img/achievement_select.png");

        game.load.spritesheet("chargeBar", "./img/charge_bar.png", 10, 20);
    }

    function loadAudio() {
        game.load.audio("shoot1", "./snd/shoot1.wav");
        game.load.audio("shoot2", "./snd/shoot2.wav");

        game.load.audio("explosion", "./snd/explosion.wav");

        game.load.audio("win", "./snd/win.wav");
        game.load.audio("charge", "./snd/charge.wav");

        game.load.audio("pickup1", "./snd/pickup.wav");
        game.load.audio("pickup2", "./snd/pickup2.wav");
        game.load.audio("pickup3", "./snd/pickup3.wav");
    }
}

function create() {

    initSounds();

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

    game.physics.startSystem(Phaser.Physics.ARCADE);

    createPlayer();

    // TODO: generate everything ahead for reusing objects when game plays
    //       (there were some problems with make*() functions...)
    bullets = game.add.group();
    bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    //bullets.createMultiple(50, "bullet1");

    asteroids = game.add.group();
    asteroids.enableBody = true;
    asteroids.physicsBodyType = Phaser.Physics.ARCADE;
    //asteroids.createMultiple(20, "asteroid1_1");

    pickups = game.add.group();
    pickups.enableBody = true;
    pickups.physicsBodyType = Phaser.Physics.ARCADE;
    //pickups.createMultiple(10, "pickup0");

    explosions = game.add.group();
    //explosions.createMultiple(20, "explosionBlue");

    startNewGame();

    createUI();

    function initSounds() {
        _a.snd.shoot1 = game.add.audio("shoot1");
        _a.snd.shoot2 = game.add.audio("shoot2");
        _a.snd.explosion = game.add.audio("explosion");
        _a.snd.win = game.add.audio("win");
        _a.snd.charge = game.add.audio("charge");
        _a.snd.pickup1 = game.add.audio("pickup1");
        _a.snd.pickup2 = game.add.audio("pickup2");
        _a.snd.pickup3 = game.add.audio("pickup3");
    }

    function createPlayer() {
        player = game.add.sprite(game.width/2, game.height/2, "rocket1");
        player.data = {
            offscreenPointer: game.add.sprite(0, 0, "offscreenPointer"),

            bullet1Cooldown: 0.3,
            bullet1CooldownCurrent: 0,
            bullet2Cooldown: 1.5,
            bullet2CooldownCurrent: 0,
            bullet3Charge: 0,
            bullet3maxCharge: 10,

            addCharge: function(amount) {
                if(player.data.bullet3Charge < 10) {
                    player.data.bullet3Charge += amount;
                    if(player.data.bullet3Charge >= 10) {
                        _a.snd.charge.play();
                        player.data.bullet3Charge = 10;
                    }
                }
            },
            kill: function() {
                player.kill();
                if(lives > 0) lives--;
                player.data.bullet3Charge = 0;
            },
            reset: function() {
                player.reset(game.width/2, game.height/2);
                player.rotation = 0;
            }
        };

        player.anchor.set(0.5);
        game.physics.enable(player, Phaser.Physics.ARCADE);
        player.body.setCircle(player.texture.width/2, 0, 0);
        player.body.drag.set(250);
        player.body.maxVelocity.set(250);

        player.data.offscreenPointer.visible = false;
    }

    function createUI() {
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
        _ui.chargeBar = game.add.group();
        let sx = game.width/2 - player.data.bullet3maxCharge*10/2;
        for(let i=0; i<player.data.bullet3maxCharge; i++) game.add.image(sx + i*10, game.height-26, "chargeBar", 0, _ui.chargeBar);

        _ui.debug = game.add.group();
        _ui.debug.playerX = game.add.text(2, 0, Math.round(player.x*1000)/1000, {font: "8px sans-serif", fill: "white"}, _ui.debug);
        _ui.debug.playerY = game.add.text(2, 10, Math.round(player.y*1000)/1000, {font: "8px sans-serif", fill: "white"}, _ui.debug);
        _ui.debug.time = game.add.text(2, 20, Math.floor(time), {font: "8px sans-serif", fill: "white"}, _ui.debug);
        _ui.debug.visible = false;

    }
}

function startNewGame() {
    player.data.reset();
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
    // update charge bar
    for(let i=0; i<_ui.chargeBar.length; i++) {
        let c = _ui.chargeBar.getAt(i);
        if(i+1 > player.data.bullet3Charge) {
            c.frame = 0;
        } else {
            c.frame = 1;
        }
    }



    // draw pointers
    drawOffScreenPointer(player, player.data.offscreenPointer);
    asteroids.forEach(function(a) {
        drawOffScreenPointer(a, a.data.offscreenPointer);
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
    game.debug.body(player);

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

    if(!player.alive && lives > 0) {
        player.data.reset();
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
            game.physics.arcade.accelerationFromRotation(player.rotation - Math.PI/2, 200, player.body.acceleration);
        } else {
            player.body.acceleration.set(0);
        }

        if (game.input.keyboard.isDown(Phaser.KeyCode.A)) {
            player.body.angularVelocity = -150;
        } else if (game.input.keyboard.isDown(Phaser.KeyCode.D)) {
            player.body.angularVelocity = 150;
        } else {
            player.body.angularVelocity = 0;
        }

        wrapAround(player);
    }

    function bulletLogic() {
        bullets.forEach(wrapAround, this, true);
        bullets.forEach(function(b) {
            b.data.distance -= game.time.physicsElapsed;
            // if distance is covered, remove bullet
            if(b.data.distance < 0) {
                if(b.key == "bullet3") {
                    let fullRot = 2*Math.PI;
                    for(let i=0; i<fullRot; i+=fullRot/10) {
                        let n = makeBullet("bullet4", 2, 350, 3, i);
                        n.position.setTo(b.x, b.y);
                    }
                }
                b.kill();
            }
        }, this, true);
        // player shooting bullets
        if(player.data.bullet1CooldownCurrent > 0) player.data.bullet1CooldownCurrent -= game.time.physicsElapsed;
        if(player.alive && player.data.bullet1CooldownCurrent <= 0) {
            if(game.input.keyboard.isDown(Phaser.KeyCode.J)) {
                // shoot bullet
                makeBullet("bullet1", 1, 500, 1.8);
                _a.snd.shoot1.play();
                player.data.bullet1CooldownCurrent = player.data.bullet1Cooldown;
            }
        }
        if(player.data.bullet2CooldownCurrent > 0) player.data.bullet2CooldownCurrent -= game.time.physicsElapsed;
        if(player.alive && player.data.bullet2CooldownCurrent <= 0) {
            if(game.input.keyboard.isDown(Phaser.KeyCode.K)) {
                // shoot bullets (alt)
                let fullRot = 2*Math.PI;
                for(let i=fullRot*2/12; i<fullRot*11/12; i+=fullRot/12) makeBullet("bullet2", 2, 156, 1.6, player.rotation+i);
                _a.snd.shoot2.play();
                player.data.bullet2CooldownCurrent = player.data.bullet2Cooldown;
            }
        }
        if(player.alive && player.data.bullet3Charge >= 0.5) {
            if(game.input.keyboard.isDown(Phaser.KeyCode.L)) {
                player.data.bullet3Charge = 0;
                let fullRot = 2*Math.PI;
                for(let i=0; i<fullRot; i+=fullRot/6) makeBullet("bullet3", 4, 140, 1.2, i);
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
            a.health -= b.data.damage;
            score += 100;

            if(a.health <= 0) {
                // split asteroid into pieces if size > 1
                let newSize = a.size-1;
                if(newSize > 0) {
                    for(let k=0; k<5-newSize; k++) makeAsteroidBySize(newSize, a.x, a.y);
                }
                a.kill();
            }
            switch (b.key) {
                case "bullet1":
                    makeExplosion("explosionBlue", b.x, b.y, 0.5);
                    player.data.addCharge(0.5);
                    break;
                case "bullet2":
                    makeExplosion("explosionRed", b.x, b.y, 0.75);
                    break;
                case "bullet3":
                    makeExplosion("explosionGreenBig", b.x, b.y, 0.75);
                    break;
                case "bullet4":
                    makeExplosion("explosionGreen", b.x, b.y, 0.75);
                    break;
                default:

            }
            b.kill();
        });
        game.physics.arcade.overlap(player, asteroids, function(plr, a) {
            if(plr.alive) {
                for(let i=0; i<3; i++) {
                    makeExplosion("explosionBig", player.x + random(-15, 15), player.y + random(-15, 15), random(1.2, 1.6), random(10, 60));
                }
                player.data.kill();
            }
        });
        game.physics.arcade.overlap(player, pickups, function(plr, pic) {
            if(plr.alive) {
                if(pic.data.content == "score") {
                    giveBonusScore(pic.data.amount);
                    _a.snd.pickup1.play();
                } else if(pic.data.content == "life") {
                    lives += pic.data.amount;
                    _a.snd.pickup2.play();
                } else if(pic.data.content == "charge") {
                    player.data.addCharge(pic.data.amount);

                    _a.snd.pickup3.play();
                }
                pic.kill();
            }
        });
    }
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

function makeBullet(img, damage, speed, distance, angle = player.rotation) {
    let b = bullets.getFirstDead();
    if(b == null) {
        b = game.add.sprite(player.x, player.y, img, undefined, bullets);
        b.anchor.set(0.5);
    } else {
        b.loadTexture(img, 0);
        b.reset(player.x, player.y);
    }
    b.data.damage = damage;
    b.data.distance = distance;
    b.body.setCircle(b.texture.width/2, 0, 0);
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

    p.data.content = "score";
    p.data.amount = 10000;

    p.animations.play("blink", 1, true, false);
    p.body.setCircle(p.texture.width/2/p.animations.frameTotal, 0, 0);
    game.physics.arcade.velocityFromRotation(random(0, 2*Math.PI) - Math.PI/2, 50, p.body.velocity);

    let chance = random(0, 100);
    // 10% chance of a 1UP pickup
    if(chance < 10) {
        p.data.content = "life";
        p.data.amount = 1;
    } else if(chance < 35) { // 25% chance of getting 1/4 of a charge
        p.data.content = "charge";
        p.data.amount = 2.5;
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
        a.data.offscreenPointer.visible = false;
    }

    a.health = health;
    // scale is relative to asteroid's sprite size
    a.scale.set(scale);
    a.size = size;

    a.body.setCircle(a.texture.width * scale /2, 0, 0);
    game.physics.arcade.velocityFromRotation(random(0, 2*Math.PI) - Math.PI/2, speed, a.body.velocity);

    a.data.offscreenPointer = game.add.sprite(0, 0, "offscreenPointerAsteroid");
    a.data.offscreenPointer.visible = false;
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
