let skier;
let trees = [];
let jumps = []; // Array to hold jump objects
let numTrees = 7;
let numJumps = 3; // Number of jumps on screen
let speed = 6;
let lives = 15;
let score = 0; // Track player score
let hitEffect = 0; // Track hit effect duration
let normalSpeed = 6; // Store the normal speed
let isStopped = false; // Track if skier is stopped
let skiTracks = []; // Array to store ski track positions
let trackSpacing = 5; // Space between track points

function setup() {
    let canvas = createCanvas(400, 600);
    canvas.parent('game-container');
    // Initialize skier at the bottom center of the canvas
    skier = new Skier();
    // Create trees at random starting positions (above the canvas too)
    for (let i = 0; i < numTrees; i++) {
        trees.push(new Tree(random(20, width - 20), random(-height, 0)));
    }
    // Create jumps
    for (let i = 0; i < numJumps; i++) {
        jumps.push(new Jump(random(20, width - 20), random(-height, 0)));
    }
}

function draw() {
    // Flash red if hit effect is active
    if (hitEffect > 0) {
        background(255, 0, 0, 100); // Semi-transparent red
        hitEffect--;
    } else {
        background(255); // white background
    }

    // Draw ski tracks
    stroke(200); // Light gray for tracks
    strokeWeight(2);
    for (let i = 0; i < skiTracks.length - 1; i++) {
        // Calculate the angle of movement
        let dx = skiTracks[i+1].x - skiTracks[i].x;
        let dy = skiTracks[i+1].y - skiTracks[i].y;
        let angle = atan2(dy, dx);
        
        // Calculate perpendicular offset for parallel tracks
        let offsetX = cos(angle + PI/2) * trackSpacing;
        let offsetY = sin(angle + PI/2) * trackSpacing;
        
        // Draw parallel tracks
        line(skiTracks[i].x - offsetX, skiTracks[i].y - offsetY, 
             skiTracks[i+1].x - offsetX, skiTracks[i+1].y - offsetY);
        line(skiTracks[i].x + offsetX, skiTracks[i].y + offsetY, 
             skiTracks[i+1].x + offsetX, skiTracks[i+1].y + offsetY);
    }
    noStroke();

    // Update track positions
    for (let track of skiTracks) {
        track.y += speed;
    }

    // Handle gradual acceleration
    if (isStopped) {
        speed = Math.min(speed + 0.1, normalSpeed); // Gradually increase speed
        if (speed >= normalSpeed) {
            isStopped = false;
        }
    }

    // Update and show the skier
    skier.update();
    skier.show();

    // Add new track point if skier is moving and not jumping
    if (speed > 0 && !skier.isJumping) {
        skiTracks.push({x: skier.x, y: skier.y});
        // Remove old tracks that are off screen
        while (skiTracks.length > 0 && skiTracks[0].y > height) {
            skiTracks.shift();
        }
    }

    // Update and show each tree, and check for collisions
    for (let tree of trees) {
        tree.update();
        tree.show();
        if (tree.hits(skier) && !skier.isJumping) {
            // On collision: lose a life, stop the skier, and reset the tree
            lives--;
            normalSpeed += 0.2; // Increase normal speed
            tree.reset();
            hitEffect = 10; // Set hit effect duration
            speed = 0; // Stop immediately
            isStopped = true; // Start gradual acceleration
            skiTracks = []; // Clear tracks on collision
        }
    }
    
    // Update and show each jump, and check for collisions
    for (let jump of jumps) {
        jump.update();
        jump.show();
        if (jump.hits(skier) && !jump.used) {
            // On hitting a jump: get points, do a jump animation, and mark as used
            score += 50;
            skier.doJump();
            jump.used = true;
            // Speed boost
            speed += 0.5;
        }
    }

    // Display remaining lives and score
    fill(0);
    textSize(20);
    text("Lives: " + lives, 10, 30);
    text("Score: " + score, width - 120, 30);

    // Stop the game if out of lives
    if (lives <= 0) {
        noLoop();
        textSize(32);
        fill(0, 0, 0);
        text("You lose", width / 2 - 60, height / 2);
        text("Score: " + score, width / 2 - 80, height / 2 + 40);
        textSize(24);
        text("Press SPACE to restart", width / 2 - 120, height / 2 + 80);
    }
}

// Allow left/right movement using arrow keys
function keyPressed() {
    if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) {
        let direction = keyCode === LEFT_ARROW ? -1 : 1;
        skier.move(direction);
    }

    if (keyCode === UP_ARROW || keyCode === DOWN_ARROW) {
        let direction = keyCode === UP_ARROW ? -3 : 3;
        skier.forward(direction)
    }

    if (keyCode === 32) {
        lives = 10;
        speed = 6;
        score = 0;
        skier.x = width / 2;
        skier.y = height - 50;
        
        // Reset all jumps
        for (let jump of jumps) {
            jump.reset();
        }
        
        loop();
    }
}

function keyReleased() {
    if ((keyCode === LEFT_ARROW && skier.xdir === -1) ||
        (keyCode === RIGHT_ARROW && skier.xdir === 1)) {
        skier.move(0);
    }

    if (
        (keyCode === UP_ARROW && skier.ySpeed < 0) ||
        (keyCode === DOWN_ARROW && skier.ySpeed > 0)
    ) {
        skier.forward(0);
    }
}

// Skier class: represented as a triangle
class Skier {
    constructor() {
        this.x = width / 2;
        this.y = height - 50;
        this.xdir = 0;
        this.ySpeed = 0;
        this.headSize = 12;
        this.bodyLength = 25;
        this.skiLength = 40;
        this.skiWidth = 3;
        this.skiSpacing = 5;
        this.skiAngle = -PI/12; // Less steep angle (15 degrees)
        this.bodyAngle = PI/12; // Forward lean angle (15 degrees)
        this.isJumping = false;
        this.jumpHeight = 0;
        this.jumpSpeed = 0;
        this.maxJumpHeight = 60;
    }

    show() {
        push();
        translate(this.x, this.y - this.jumpHeight); // Apply jump height
        
        // Adjust ski angle based on direction
        let currentSkiAngle = 0; // Default pointing downhill
        
        if (this.xdir < 0) {
            // Turning left - point skis left
            currentSkiAngle = -PI/6; // 30 degrees left
        } else if (this.xdir > 0) {
            // Turning right - point skis right
            currentSkiAngle = PI/6; // 30 degrees right
        }
        
        // Draw skis with proper orientation
        push();
        rotate(currentSkiAngle);
        fill(30);
        // Left ski
        rect(-this.skiSpacing, -this.skiLength/2, this.skiWidth, this.skiLength);
        // Right ski
        rect(this.skiSpacing, -this.skiLength/2, this.skiWidth, this.skiLength);
        pop();

        // Adjust body angle to match ski direction
        push();
        translate(0, -this.bodyLength/4);
        
        // Body leans in the direction of travel
        let currentBodyAngle = PI/12; // Default forward lean
        
        if (this.xdir < 0) {
            currentBodyAngle = PI/12 - PI/12; // Lean left more
        } else if (this.xdir > 0) {
            currentBodyAngle = PI/12 + PI/12; // Lean right more
        }
        
        rotate(currentBodyAngle);
        
        // Legs
        fill(128, 0, 128); // Purple outfit
        rect(-5, -this.bodyLength/4, 4, this.bodyLength/2);
        rect(1, -this.bodyLength/4, 4, this.bodyLength/2);
        
        // Arms and Poles
        push();
        // Left arm and pole
        translate(-8, -this.bodyLength/2);
        // Adjust arm angle based on turning direction
        let leftArmAngle = PI/6; // Default angle
        if (this.xdir < 0) {
            leftArmAngle = PI/4; // More outward when turning left
        } else if (this.xdir > 0) {
            leftArmAngle = PI/8; // More inward when turning right
        }
        rotate(leftArmAngle);
        fill(128, 0, 128); // Purple arm
        rect(0, 0, 4, this.bodyLength/2.5);
        fill(200); // Gray pole
        rect(2, this.bodyLength/2.5, 2, this.bodyLength/1.5);
        pop();
        
        push();
        // Right arm and pole
        translate(8, -this.bodyLength/2);
        // Adjust arm angle based on turning direction
        let rightArmAngle = -PI/6; // Default angle
        if (this.xdir < 0) {
            rightArmAngle = -PI/8; // More inward when turning left
        } else if (this.xdir > 0) {
            rightArmAngle = -PI/4; // More outward when turning right
        }
        rotate(rightArmAngle);
        fill(128, 0, 128); // Purple arm
        rect(-4, 0, 4, this.bodyLength/2.5);
        fill(200); // Gray pole
        rect(-4, this.bodyLength/2.5, 2, this.bodyLength/1.5);
        pop();
        
        // Torso
        ellipse(0, -this.bodyLength/2, 12, 20);
        
        // Draw head
        fill(255, 220, 180); // Skin tone
        circle(0, -this.bodyLength/2 - this.headSize, this.headSize);
        
        // Draw helmet
        // Main helmet shape
        fill(0); // Black helmet
        noStroke();
        ellipse(0, -this.bodyLength/2 - this.headSize - 3, this.headSize + 8, this.headSize + 6);
        
        // Visor
        fill(50); // Dark gray visor
        arc(0, -this.bodyLength/2 - this.headSize - 1, this.headSize + 6, this.headSize + 2, PI, TWO_PI);
        
        // Helmet shine/reflection
        fill(40); // Slightly lighter black for shine
        ellipse(-2, -this.bodyLength/2 - this.headSize - 5, 4, 3);
        pop();
        
        pop();
    }

    update() {
        this.x += this.xdir * 5;
        // Constrain using headSize since it's our reference point
        this.x = constrain(this.x, this.headSize, width - this.headSize);
        this.y = constrain(this.y + this.ySpeed, height/2, height - 20);
        
        // Handle jumping physics
        if (this.isJumping) {
            this.jumpHeight += this.jumpSpeed;
            this.jumpSpeed -= 0.5; // Gravity
            
            if (this.jumpHeight <= 0) {
                this.isJumping = false;
                this.jumpHeight = 0;
                this.jumpSpeed = 0;
            }
        }
    }

    move(dir) {
        this.xdir = dir;
    }

    forward(amount) {
        this.ySpeed = amount
    }

    doJump() {
        if (!this.isJumping) {
            this.isJumping = true;
            this.jumpSpeed = 8;
        }
    }
}

// Tree class: each tree is a green triangle
class Tree {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.trunkWidth = 8;
        this.trunkHeight = 25;
        this.layers = 4; // Number of triangle layers
        this.layerSpacing = 10; // Space between layers
    }

    update() {
        // Move tree downward based on the current speed
        this.y += speed;
        // Reset tree if it moves off the bottom of the canvas
        if (this.y - this.size > height) {
            this.reset();
        }
    }

    show() {
        // Draw trunk
        fill(139, 69, 19); // Brown color for trunk
        rectMode(CENTER);
        rect(this.x, this.y + this.size/2, this.trunkWidth, this.trunkHeight);
        
        // Draw triangular layers
        fill(34, 139, 34); // Forest green
        let layerSize = this.size;
        for(let i = 0; i < this.layers; i++) {
            let yOffset = this.y - (i * this.layerSpacing);
            triangle(
                this.x, yOffset - layerSize/2,
                this.x - layerSize, yOffset + layerSize/2,
                this.x + layerSize, yOffset + layerSize/2
            );
            layerSize *= 0.8; // Each layer gets slightly smaller
        }
    }

    // Simple collision detection based on distance
    hits(skier) {
        // Only check collision if skier is on the ground
        if (skier.isJumping) {
            return false;
        }
        let d = dist(this.x, this.y, skier.x, skier.y - skier.bodyLength/2);
        return d < this.size + skier.headSize;
    }

    // Reset tree to a new position at the top of the canvas
    reset() {
        this.x = random(20, width - 20);
        this.y = random(-100, -this.size);
    }
}

// Jump class: represented as a ramp
class Jump {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 15;
        this.used = false;
    }
    
    update() {
        // Move jump downward based on the current speed
        this.y += speed;
        // Reset jump if it moves off the bottom of the canvas
        if (this.y - this.height > height) {
            this.reset();
        }
    }
    
    show() {
        if (!this.used) {
            // Draw jump ramp
            fill(200, 200, 255); // Light blue
            stroke(0);
            strokeWeight(2);
            
            // Draw ramp shape
            beginShape();
            vertex(this.x - this.width/2, this.y + this.height/2);
            vertex(this.x - this.width/4, this.y - this.height/2);
            vertex(this.x + this.width/4, this.y - this.height/2);
            vertex(this.x + this.width/2, this.y + this.height/2);
            endShape(CLOSE);
            
            // Draw snow pile
            fill(255);
            noStroke();
            arc(this.x, this.y + this.height/2, this.width, this.height, PI, TWO_PI);
            
            strokeWeight(1);
        }
    }
    
    // Simple collision detection based on distance
    hits(skier) {
        let d = dist(this.x, this.y, skier.x, skier.y - skier.bodyLength/2);
        return d < this.width/2 + skier.headSize;
    }
    
    // Reset jump to a new position at the top of the canvas
    reset() {
        this.x = random(20, width - 20);
        this.y = random(-200, -this.height);
        this.used = false;
    }
}
