import Engine from './engine.js';
import Visualizer from './visualizer.js';

const canvas = document.getElementById('engineCanvas');
const rpmSlider = document.getElementById('rpmSlider');
const rpmValue = document.getElementById('rpmValue');
const angleSlider = document.getElementById('angleSlider');
const angleValue = document.getElementById('angleValue');
const playPauseBtn = document.getElementById('playPauseBtn');
const resetBtn = document.getElementById('resetBtn');

const engine = new Engine();
const visualizer = new Visualizer(canvas, engine);

let lastTime = 0;
let isPaused = true;

function resizeCanvas() {
    const container = canvas.parentElement;
    const width = container.clientWidth;

    // Force 16:9 landscape aspect ratio for mobile and desktop
    const height = width * 0.5625;

    canvas.width = width;
    canvas.height = height;

    // Update visualizer dimensions
    visualizer.updateDimensions(width, height);
}

function simulationLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (!isPaused) {
        engine.update(dt);
        // Sync sliders
        angleSlider.value = Math.floor(engine.angle);
        angleValue.textContent = Math.floor(engine.angle);
    }

    visualizer.draw();
    requestAnimationFrame(simulationLoop);
}

// UI Event Listeners
rpmSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    rpmValue.textContent = val;
    engine.setRPM(val);
});

angleSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    angleValue.textContent = val;
    engine.setAngle(val);
});

viewToggle.addEventListener('change', (e) => {
    const mode = e.target.checked ? 'side' : 'front';
    visualizer.setViewMode(mode);
    // Ghost is only relevant in Front View
    ghostToggleContainer.style.opacity = e.target.checked ? '0.3' : '1';
    ghostToggleContainer.style.pointerEvents = e.target.checked ? 'none' : 'auto';
});

ghostToggle.addEventListener('change', (e) => {
    visualizer.toggleGhost(e.target.checked);
});

playPauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    playPauseBtn.textContent = isPaused ? 'Play' : 'Pause';

    if (!isPaused && engine.rpm === 0) {
        // Default to some RPM if playing and rpm is 0
        engine.setRPM(5);
        rpmSlider.value = 5;
        rpmValue.textContent = 5;
    }
});

resetBtn.addEventListener('click', () => {
    engine.setAngle(0);
    engine.setRPM(0);
    rpmSlider.value = 0;
    rpmValue.textContent = 0;
    angleSlider.value = 0;
    angleValue.textContent = 0;
    isPaused = true;
    playPauseBtn.textContent = 'Play';
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Initial call

// Start loop
requestAnimationFrame(simulationLoop);
