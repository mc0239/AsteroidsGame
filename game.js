var canvas, ctx, then;

var a;

var player, bullets;

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
    main();
};

function loadImages() {
    a.img.rocket1 = new Image();
    a.img.rocket1.src = "./img/rocket1.png";

    a.img.offpointer = new Image();
    a.img.offpointer.src = "./img/offscreen_pointer.png";

    a.img.bullet1 = new Image();
    a.img.bullet1.src = "./img/bullet1.png";

    a.img.asteroid1small = new Image();
    a.img.asteroid1small.src = "./img/asteroid1_small.png";
}

function initPlayer() {
    player = {
        x: canvas.width/2,
        y: canvas.height/2,
        rot: 0,
        speed: 4,
        bullet1Cooldown: 1000,
        bullet1CooldownCurrent: 0
    };
    bullets = [];
}

function update(dt) {

    movePlayer();
    bulletLogic();

    function movePlayer() {
        if(keysDown["a"] || keysDown["A"]) player.rot-=3;
        if(keysDown["d"] || keysDown["D"]) player.rot+=3;
        if(player.rot >= 360) player.rot = 0;
        if(player.rot <= -360) player.rot = 0;

        let c = player.speed; // speed ?
        let alpha = player.rot;
        let a = Math.sin(degToRad(alpha)) * c;
        let b = Math.cos(degToRad(alpha)) * c;

        if(keysDown["w"] || keysDown["W"]) {
            player.x += a;
            player.y -= b;
        }
        if(keysDown["s"] || keysDown["S"]) {
            player.x += a * -0.3;
            player.y -= b * -0.3;
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
        if(player.bullet1CooldownCurrent <= 0) {
            if(keysDown["j"] || keysDown["J"]) {
                // shoot bullet
                let b = makeBullet();
                // move bullet to the tip of the rocket
                b.x += Math.sin(degToRad(b.rot)) * 34/2;
                b.y -= Math.cos(degToRad(b.rot)) * 34/2;
                bullets.push(b);
                player.bullet1CooldownCurrent = player.bullet1Cooldown * dt;
            }
        }
    }
}

function makeBullet() {
    let bullet = {
        x: player.x,
        y: player.y,
        rot: player.rot,
        speed: 8,
        distance: 1000
    };
    return bullet;
}

function makeAsteroid() {
    //TODO: make asteroids!!!
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

function degToRad(deg) {
    return deg * Math.PI / 180;
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawDebug();

    drawPlayer();
    drawBullets();

    ctx.drawImage(a.img.asteroid1small, 50, 50);

}

function drawPlayer() {
    drawImageRot(a.img.rocket1, player.x - 34/2, player.y - 33/2, 34, 33, player.rot);

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
        drawImageRot(a.img.bullet1, b.x, b.y, 3, 3, player.rot);
    });
}

function drawDebug() {
    ctx.fillStyle = "white";
    ctx.font = "10px sans-serif";
    ctx.fillText(Math.round(player.x*1000)/1000, 2, 12);
    ctx.fillText(Math.round(player.y*1000)/1000, 2, 24);
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
