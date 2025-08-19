// Game constants and variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const armorDisplay = document.getElementById('armor');
const finalScore = document.getElementById('finalScore');
const bestScore = document.getElementById('bestScore');
const bestScoreStart = document.getElementById('bestScoreStart');
const joystickContainer = document.getElementById('joystickContainer');
const joystickBase = document.getElementById('joystickBase');
const joystickHandle = document.getElementById('joystickHandle');
const armorEffect = document.querySelector('.armor-effect');

// Audio elements
const bgMusic = document.getElementById('bgMusic');
const appleSound = document.getElementById('appleSound');
const gameOverSound = document.getElementById('gameOverSound');
const armorSound = document.getElementById('armorSound');

// Player variables
let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20,
    speed: 5,
    color: '#4ecca3',
    hasArmor: false
};

// Game state
let obstacles = [];
let apples = [];
let keys = {};
let score = 0;
let gameTime = 0;
let gameSpeed = 1;
let obstacleSpawnRate = 60;
let appleSpawnRate = 1800; // Spawn an apple every 30 seconds (60fps * 30)
let frameCount = 0;
let gameRunning = false;
let storedBestScore = localStorage.getItem('dodgeOrDieBestScore') || 0;
let armorTime = 0;

// Joystick variables
let joystickActive = false;
let joystickX = 0;
let joystickY = 0;
const joystickRadius = 60; // Maximum joystick movement radius

// Monster colors
const monsterColors = ['#ff416c', '#ff4b2b', '#ff6b6b', '#ff9a3d', '#ffd166', '#06d6a0', '#118ab2', '#073b4c'];

// Initialize best score display
bestScoreStart.textContent = `Best Score: ${storedBestScore}`;

// Event listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Keyboard controls
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Virtual Joystick Implementation
function setupJoystick() {
    // Get the position of the joystick base
    const baseRect = joystickBase.getBoundingClientRect();
    const baseCenterX = baseRect.left + baseRect.width / 2;
    const baseCenterY = baseRect.top + baseRect.height / 2;

    // Touch events for mobile
    joystickContainer.addEventListener('touchstart', (e) => {
        e.preventDefault();
        joystickActive = true;
        updateJoystickPosition(e.touches[0].clientX, e.touches[0].clientY, baseCenterX, baseCenterY);
    });

    joystickContainer.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (joystickActive) {
            updateJoystickPosition(e.touches[0].clientX, e.touches[0].clientY, baseCenterX, baseCenterY);
        }
    });

    // Mouse events for devices with both touch and mouse (like some tablets)
    joystickContainer.addEventListener('mousedown', (e) => {
        joystickActive = true;
        updateJoystickPosition(e.clientX, e.clientY, baseCenterX, baseCenterY);
    });

    window.addEventListener('mousemove', (e) => {
        if (joystickActive) {
            updateJoystickPosition(e.clientX, e.clientY, baseCenterX, baseCenterY);
        }
    });

    // End joystick control on touch/mouse end
    window.addEventListener('touchend', () => {
        resetJoystick();
    });

    window.addEventListener('mouseup', () => {
        resetJoystick();
    });
}

function updateJoystickPosition(touchX, touchY, baseCenterX, baseCenterY) {
    // Calculate distance from center
    const dx = touchX - baseCenterX;
    const dy = touchY - baseCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Limit joystick movement to the base radius
    const limitedDistance = Math.min(distance, joystickRadius);

    // Calculate angle
    const angle = Math.atan2(dy, dx);

    // Update joystick handle position
    const handleX = Math.cos(angle) * limitedDistance;
    const handleY = Math.sin(angle) * limitedDistance;

    joystickHandle.style.transform = `translate(calc(-50% + ${handleX}px), calc(-50% + ${handleY}px)`;

    // Normalize joystick values for movement (-1 to 1)
    joystickX = limitedDistance > 10 ? dx / joystickRadius : 0;
    joystickY = limitedDistance > 10 ? dy / joystickRadius : 0;
}

function resetJoystick() {
    joystickActive = false;
    joystickX = 0;
    joystickY = 0;
    joystickHandle.style.transform = 'translate(-50%, -50%)';
}

// Setup joystick on load
setupJoystick();

// Start the game
function startGame() {
    // Reset game state
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    obstacles = [];
    apples = [];
    score = 0;
    gameTime = 0;
    gameSpeed = 1;
    obstacleSpawnRate = 60;
    frameCount = 0;
    player.hasArmor = false;
    armorTime = 0;

    // Update UI
    scoreDisplay.textContent = `Score: ${score}`;
    timerDisplay.textContent = `Time: ${gameTime}s`;
    armorDisplay.classList.add('hidden');
    armorEffect.classList.remove('active');

    // Hide screens
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    // Start the game loop
    gameRunning = true;

    // Start music
    bgMusic.currentTime = 0;
    bgMusic.volume = 0.3;
    bgMusic.play();

    requestAnimationFrame(gameLoop);
}

// Game loop
function gameLoop() {
    if (!gameRunning) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background grid
    drawBackground();

    // Update game state
    updatePlayer();
    updateObstacles();
    updateApples();
    spawnObstacles();
    spawnApples();
    updateDifficulty();
    updateArmor();

    // Draw everything
    drawPlayer();
    drawObstacles();
    drawApples();

    // Check for collisions
    if (checkCollisions()) {
        gameOver();
        return;
    }

    // Update time and score
    frameCount++;
    if (frameCount % 60 === 0) {
        gameTime++;
        timerDisplay.textContent = `Time: ${gameTime}s`;
        score = gameTime;
        scoreDisplay.textContent = `Score: ${score}`;
    }

    // Continue the loop
    requestAnimationFrame(gameLoop);
}

// Draw background grid
function drawBackground() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Update player position based on keys pressed or joystick
function updatePlayer() {
    // Use keyboard controls if any arrow key is pressed
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
        player.y = Math.max(player.radius, player.y - player.speed);
    } else if (keys['ArrowDown'] || keys['s'] || keys['S']) {
        player.y = Math.min(canvas.height - player.radius, player.y + player.speed);
    } else if (joystickY < -0.1) { // Joystick up
        player.y = Math.max(player.radius, player.y - player.speed * Math.abs(joystickY));
    } else if (joystickY > 0.1) { // Joystick down
        player.y = Math.min(canvas.height - player.radius, player.y + player.speed * Math.abs(joystickY));
    }

    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        player.x = Math.max(player.radius, player.x - player.speed);
    } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        player.x = Math.min(canvas.width - player.radius, player.x + player.speed);
    } else if (joystickX < -0.1) { // Joystick left
        player.x = Math.max(player.radius, player.x - player.speed * Math.abs(joystickX));
    } else if (joystickX > 0.1) { // Joystick right
        player.x = Math.min(canvas.width - player.radius, player.x + player.speed * Math.abs(joystickX));
    }
}

// Draw the player
function drawPlayer() {
    // Draw player with armor effect if active
    if (player.hasArmor) {
        // Draw outer glow
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 209, 102, 0.3)';
        ctx.fill();

        // Draw golden armor circle
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
            player.x, player.y, player.radius * 0.3,
            player.x, player.y, player.radius
        );
        gradient.addColorStop(0, '#ffd166');
        gradient.addColorStop(1, '#f8b500');
        ctx.fillStyle = gradient;
        ctx.fill();
    } else {
        // Regular player
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
            player.x, player.y, player.radius * 0.3,
            player.x, player.y, player.radius
        );
        gradient.addColorStop(0, '#4ecca3');
        gradient.addColorStop(1, '#1a936f');
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    // Draw player face (eyes)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(player.x - 7, player.y - 3, 4, 0, Math.PI * 2);
    ctx.arc(player.x + 7, player.y - 3, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(player.x - 7, player.y - 3, 2, 0, Math.PI * 2);
    ctx.arc(player.x + 7, player.y - 3, 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw smile
    ctx.beginPath();
    ctx.arc(player.x, player.y + 3, 6, 0, Math.PI, false);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Draw scary monster face obstacle
function drawMonster(obs) {
    // Draw monster head
    ctx.fillStyle = obs.color;
    ctx.beginPath();
    ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw angry eyebrows
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = obs.radius * 0.1;
    ctx.beginPath();
    // Left eyebrow
    ctx.moveTo(obs.x - obs.radius * 0.6, obs.y - obs.radius * 0.3);
    ctx.lineTo(obs.x - obs.radius * 0.2, obs.y - obs.radius * 0.5);
    // Right eyebrow
    ctx.moveTo(obs.x + obs.radius * 0.6, obs.y - obs.radius * 0.3);
    ctx.lineTo(obs.x + obs.radius * 0.2, obs.y - obs.radius * 0.5);
    ctx.stroke();

    // Draw angry eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(obs.x - obs.radius * 0.4, obs.y - obs.radius * 0.1, obs.radius * 0.25, 0, Math.PI * 2);
    ctx.arc(obs.x + obs.radius * 0.4, obs.y - obs.radius * 0.1, obs.radius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(obs.x - obs.radius * 0.4, obs.y - obs.radius * 0.1, obs.radius * 0.1, 0, Math.PI * 2);
    ctx.arc(obs.x + obs.radius * 0.4, obs.y - obs.radius * 0.1, obs.radius * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Draw scary mouth with teeth
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(obs.x, obs.y + obs.radius * 0.2, obs.radius * 0.4, 0, Math.PI, false);
    ctx.fill();

    // Draw teeth
    ctx.fillStyle = '#ffffff';
    const teethCount = 6;
    const toothWidth = (obs.radius * 0.8) / teethCount;
    for (let i = 0; i < teethCount; i++) {
        const toothX = obs.x - obs.radius * 0.4 + i * toothWidth + toothWidth/2;
        ctx.beginPath();
        ctx.moveTo(toothX, obs.y + obs.radius * 0.2);
        ctx.lineTo(toothX - toothWidth/2, obs.y + obs.radius * 0.2 + obs.radius * 0.2);
        ctx.lineTo(toothX + toothWidth/2, obs.y + obs.radius * 0.2 + obs.radius * 0.2);
        ctx.closePath();
        ctx.fill();
    }

    // Draw horns
    ctx.fillStyle = obs.color;
    ctx.beginPath();
    // Left horn
    ctx.moveTo(obs.x - obs.radius * 0.7, obs.y - obs.radius * 0.7);
    ctx.lineTo(obs.x - obs.radius * 0.3, obs.y - obs.radius * 0.9);
    ctx.lineTo(obs.x, obs.y - obs.radius * 0.5);
    ctx.fill();
    // Right horn
    ctx.beginPath();
    ctx.moveTo(obs.x + obs.radius * 0.7, obs.y - obs.radius * 0.7);
    ctx.lineTo(obs.x + obs.radius * 0.3, obs.y - obs.radius * 0.9);
    ctx.lineTo(obs.x, obs.y - obs.radius * 0.5);
    ctx.fill();
}

// Draw apple
function drawApple(apple) {
    // Draw apple body
    const gradient = ctx.createRadialGradient(
        apple.x, apple.y, apple.radius * 0.3,
        apple.x, apple.y, apple.radius
    );
    gradient.addColorStop(0, '#ff9aa2');
    gradient.addColorStop(1, '#ff5e62');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(apple.x, apple.y, apple.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw apple leaf
    ctx.fillStyle = '#c1e1c1';
    ctx.beginPath();
    ctx.arc(apple.x - apple.radius * 0.3, apple.y - apple.radius * 0.8, apple.radius * 0.5, 0.5 * Math.PI, 1.5 * Math.PI);
    ctx.fill();

    // Draw apple stem
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(apple.x, apple.y - apple.radius);
    ctx.lineTo(apple.x, apple.y - apple.radius * 1.3);
    ctx.stroke();

    // Draw shine effect
    ctx.beginPath();
    ctx.arc(apple.x + apple.radius * 0.3, apple.y - apple.radius * 0.3, apple.radius * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();

    // Draw glow effect
    ctx.beginPath();
    ctx.arc(apple.x, apple.y, apple.radius + 3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Spawn new obstacles (monsters)
function spawnObstacles() {
    if (frameCount % obstacleSpawnRate === 0) {
        const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        let x, y, dx, dy;
        const radius = Math.random() * 15 + 15;
        const speed = Math.random() * 3 + 2 * gameSpeed;
        const color = monsterColors[Math.floor(Math.random() * monsterColors.length)];

        switch (side) {
            case 0: // top
                x = Math.random() * canvas.width;
                y = -radius;
                dx = (Math.random() - 0.5) * 2;
                dy = speed;
                break;
            case 1: // right
                x = canvas.width + radius;
                y = Math.random() * canvas.height;
                dx = -speed;
                dy = (Math.random() - 0.5) * 2;
                break;
            case 2: // bottom
                x = Math.random() * canvas.width;
                y = canvas.height + radius;
                dx = (Math.random() - 0.5) * 2;
                dy = -speed;
                break;
            case 3: // left
                x = -radius;
                y = Math.random() * canvas.height;
                dx = speed;
                dy = (Math.random() - 0.5) * 2;
                break;
        }

        obstacles.push({
            x: x,
            y: y,
            radius: radius,
            dx: dx,
            dy: dy,
            color: color
        });
    }
}

// Spawn new apples (less frequently)
function spawnApples() {
    if (frameCount % appleSpawnRate === 0) {
        const radius = 15;
        const x = Math.random() * (canvas.width - radius * 2) + radius;
        const y = Math.random() * (canvas.height - radius * 2) + radius;

        apples.push({
            x: x,
            y: y,
            radius: radius
        });
    }
}

// Update obstacles position
function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x += obs.dx;
        obs.y += obs.dy;

        // Remove obstacles that are off-screen
        if (obs.x < -100 || obs.x > canvas.width + 100 ||
            obs.y < -100 || obs.y > canvas.height + 100) {
            obstacles.splice(i, 1);
        }
    }
}

// Update apples
function updateApples() {
    // Apples don't move, just check for collection
}

// Draw all obstacles (monsters)
function drawObstacles() {
    for (const obs of obstacles) {
        drawMonster(obs);
    }
}

// Draw all apples
function drawApples() {
    for (const apple of apples) {
        drawApple(apple);
    }
}

// Increase difficulty over time
function updateDifficulty() {
    gameSpeed = 1 + gameTime * 0.05;
    obstacleSpawnRate = Math.max(20, 60 - gameTime * 0.5);
}

// Update armor state
function updateArmor() {
    if (player.hasArmor) {
        armorTime -= 1/60;
        armorDisplay.textContent = `Armor: ${Math.ceil(armorTime)}s`;

        if (armorTime <= 0) {
            player.hasArmor = false;
            armorDisplay.classList.add('hidden');
            armorEffect.classList.remove('active');
        }
    }
}

// Check for collisions
function checkCollisions() {
    // Check collision with monsters
    for (const obs of obstacles) {
        const dx = player.x - obs.x;
        const dy = player.y - obs.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + obs.radius) {
            if (player.hasArmor) {
                // Player has armor - bounce off the monster but don't die
                player.x += dx * 0.1;
                player.y += dy * 0.1;
                return false;
            } else {
                // Game over
                return true;
            }
        }
    }

    // Check collision with apples
    for (let i = apples.length - 1; i >= 0; i--) {
        const apple = apples[i];
        const dx = player.x - apple.x;
        const dy = player.y - apple.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + apple.radius) {
            // Collect apple
            apples.splice(i, 1);
            player.hasArmor = true;
            armorTime = 5;
            armorDisplay.classList.remove('hidden');
            armorEffect.classList.add('active');

            // Play sound
            appleSound.currentTime = 0;
            appleSound.play();

            // Play armor sound
            armorSound.currentTime = 0;
            armorSound.play();
        }
    }

    return false;
}

// Game over function
function gameOver() {
    gameRunning = false;

    // Stop background music
    bgMusic.pause();

    // Play game over sound
    gameOverSound.currentTime = 0;
    gameOverSound.play();

    // Update best score
    if (score > storedBestScore) {
        storedBestScore = score;
        localStorage.setItem('dodgeOrDieBestScore', storedBestScore);
    }

    // Update game over screen
    finalScore.textContent = score;
    bestScore.textContent = storedBestScore;

    // Show game over screen
    gameOverScreen.classList.remove('hidden');
}
