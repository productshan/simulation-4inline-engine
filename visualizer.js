/**
 * Multi-Projection Engine Visualizer
 * Supports Front (Orthographic) and Side (Kinematic) views.
 */
class Visualizer {
    constructor(canvas, engine) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.engine = engine;

        this.viewMode = 'side'; // 'front' or 'side'
        this.showGhost = false;

        this.width = canvas.width;
        this.height = canvas.height;

        // Initial layout constants
        this.cylCount = 4;
        this.cylWidth = 100;
        this.cylSpacing = 60;
        this.pistonHeight = 120;
        this.renderScale = 1.0;

        this.baseY = 240;
        this.crankCenterY = 540;
        this.camCenterY = 100;
    }

    updateDimensions(width, height) {
        this.width = width;
        this.height = height;

        // Dynamic layout scaling
        const baseWidth = 1000;
        const scale = Math.min(width / baseWidth, 1.2); // Cap scaling for ultra-wide screens

        this.cylWidth = 100 * scale;
        this.cylSpacing = 60 * scale;
        this.pistonHeight = 90 * scale;
        this.renderScale = 2.0 * scale;

        // Vertical positions
        this.baseY = height * 0.45; // Move block slightly lower
        this.crankCenterY = height * 0.88;
        this.camCenterY = height * 0.18;

        this.fontSizeSmall = Math.max(12, 14 * scale);
        this.fontSizeLarge = Math.max(18, 22 * scale);
    }

    setViewMode(mode) { this.viewMode = mode; }
    toggleGhost(show) { this.showGhost = show; }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        const totalWidth = (this.cylWidth * this.cylCount) + (this.cylSpacing * (this.cylCount - 1));
        this.startX = (this.width - totalWidth) / 2;

        this.drawEngineBlock(this.startX, totalWidth);
        this.drawCrankshaft(this.startX, totalWidth);
        this.drawCamshaft(this.startX, totalWidth);

        for (let i = 0; i < this.cylCount; i++) {
            const x = this.startX + i * (this.cylWidth + this.cylSpacing);
            this.drawCylinder(x, i);
        }
    }

    drawEngineBlock(startX, totalWidth) {
        const ctx = this.ctx;
        const blockHeight = this.crankCenterY - this.baseY + 60;

        const grad = ctx.createLinearGradient(0, this.baseY, 0, this.baseY + blockHeight);
        grad.addColorStop(0, '#151515');
        grad.addColorStop(0.5, '#111');
        grad.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = grad;
        ctx.fillRect(startX - 40, this.baseY - 40, totalWidth + 80, blockHeight);
    }

    drawCamshaft(startX, totalWidth) {
        const ctx = this.ctx;
        const centerY = this.camCenterY;

        ctx.fillStyle = '#444';
        ctx.fillRect(startX - 20, centerY - 8, totalWidth + 40, 16);

        for (let i = 0; i < this.cylCount; i++) {
            const centerX = startX + i * (this.cylWidth + this.cylSpacing) + this.cylWidth / 2;
            const camAngle = (this.engine.angle / 2 + this.engine.strokeOffsets[i] / 2) * (Math.PI / 180);

            this.drawCamLobe(centerX - 20, centerY, camAngle, '#3498db'); // Intake
            this.drawCamLobe(centerX + 20, centerY, camAngle + Math.PI / 2, '#95a5a6'); // Exhaust
        }
    }

    drawCamLobe(x, y, angle, color) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        const r = 12 * (this.width / 1000);
        const peak = 25 * (this.width / 1000);

        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-r, 0);
        ctx.lineTo(0, -peak);
        ctx.lineTo(r, 0);
        ctx.fill();
        ctx.restore();
    }

    drawCrankshaft(startX, totalWidth) {
        const ctx = this.ctx;
        const centerY = this.crankCenterY;
        const r = this.engine.crankRadius * this.renderScale * 0.5;

        for (let i = 0; i < this.cylCount; i++) {
            const centerX = startX + i * (this.cylWidth + this.cylSpacing) + this.cylWidth / 2;
            const theta = (this.engine.angle + this.engine.pistonOffsets[i]) * (Math.PI / 180);

            ctx.save();
            ctx.translate(centerX, centerY);

            const plateGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r + 20);
            plateGrad.addColorStop(0, '#222');
            plateGrad.addColorStop(1, '#333');
            ctx.fillStyle = plateGrad;
            ctx.beginPath();
            ctx.arc(0, 0, r + 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#555';
            ctx.stroke();

            const pinX = Math.sin(theta) * r;
            const pinY = -Math.cos(theta) * r;

            ctx.fillStyle = '#999';
            ctx.beginPath();
            ctx.arc(pinX, pinY, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }
    }

    drawCylinder(x, index) {
        const ctx = this.ctx;
        const stroke = this.engine.getStroke(index);
        const posFront = this.engine.getPistonPositionFront(index);
        const posSide = this.engine.getPistonPositionSide(index);

        const strokeScale = this.engine.crankRadius * this.renderScale * 1.2;
        const currentPos = this.viewMode === 'front' ? posFront : posSide;
        const pistonY = this.baseY + currentPos * strokeScale;
        const centerX = x + this.cylWidth / 2;

        this.drawStrokeGlow(x, pistonY, centerX, stroke, currentPos);
        this.drawValves(centerX, this.baseY, index);
        this.drawRod(centerX, pistonY, index);
        this.drawPiston(x, pistonY, stroke);

        this.drawLabels(centerX, stroke, this.engine.getStrokeColor(stroke), index);
    }

    drawRod(centerX, pistonY, index) {
        const ctx = this.ctx;
        const theta = (this.engine.angle + this.engine.pistonOffsets[index]) * (Math.PI / 180);
        const r = this.engine.crankRadius * this.renderScale * 0.5;
        const l = this.engine.conRodLength * this.renderScale;

        const pinX = centerX + Math.sin(theta) * r;
        const pinY = this.crankCenterY - Math.cos(theta) * r;
        const rodTopY = pistonY + this.pistonHeight * 0.3;

        if (this.viewMode === 'side') {
            this.drawActualRod(centerX, rodTopY, pinX, pinY, '#aaa', 1.0);
        } else {
            if (this.showGhost) {
                this.drawActualRod(centerX, rodTopY, pinX, pinY, 'rgba(100,200,255,0.3)', 0.5, true);
            }
            ctx.strokeStyle = 'red';
            ctx.fillStyle = '#c4c4c4';
            ctx.fillRect(centerX - 15, rodTopY, 30, pinY - rodTopY);
            ctx.fillStyle = 'red';
            ctx.fillRect(centerX - 40, pinY - 15, 80, 40);
            ctx.strokeRect(centerX - 40, pinY - 15, 80, 40);
        }
    }

    drawActualRod(tx, ty, bx, by, color, alpha, dashed = false) {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = alpha;
        if (dashed) ctx.setLineDash([5, 5]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 20;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.restore();
    }

drawPistonRings(step, ringCount, startPostionY) {
    let arrayY = [];
    for (let i = 0; i < ringCount; i++) {
        arrayY.push(startPostionY + i * step);
    }
    return arrayY;
}

drawPiston(x, pistonY, stroke = true) {
    const ctx = this.ctx;

    ctx.fillStyle = '#c4c4c4';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;

    const bodyHeight = this.pistonHeight - 20; // tinggi piston tanpa lengkungan
    const curveHeight = 20; // tinggi lengkungan bawah
    const leftX = x + 10;
    const rightX = x + this.cylWidth - 10;
    const bottomY = pistonY + bodyHeight;

    // ================== PISTON BODY DENGAN LENGKUNG BAWAH ==================
    ctx.beginPath();
    ctx.moveTo(leftX, pistonY); // kiri atas
    ctx.lineTo(rightX, pistonY); // kanan atas
    ctx.lineTo(rightX, bottomY); // turun ke kanan bawah
    ctx.quadraticCurveTo(
        x + this.cylWidth / 2, bottomY - curveHeight, // titik tengah naik
        leftX, bottomY // kiri bawah
    );
    ctx.closePath();
    ctx.fill();
    if(stroke) ctx.stroke();

    // ================== PISTON SHAFT HOLE ==================
    ctx.beginPath();
    const shaftX = x + this.cylWidth / 2;
    const shaftY = bottomY - curveHeight / 2 - 15; // di tengah lengkungan
    const shaftRadius = 10;
    ctx.arc(shaftX, shaftY, shaftRadius, 0, Math.PI * 2);
    ctx.fill();
    if(stroke) ctx.stroke();
    ctx.closePath();

    // ================== PISTON RINGS ==================
    ctx.fillStyle = '#111';
    this.drawPistonRings(7, 5, 10).forEach(yo => {
        ctx.fillRect(leftX, pistonY + yo, this.cylWidth - 20, 3);
    });
}

    drawStrokeGlow(x, pistonY, centerX, stroke, pos) {
        const ctx = this.ctx;
        const color = this.engine.getStrokeColor(stroke);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 10, this.baseY - 40, this.cylWidth - 20, pistonY - (this.baseY - 40));
        ctx.clip();
        ctx.globalCompositeOperation = 'lighter';

        let alpha = 0.3;
        let blur = 20;
        if (stroke === "Power") {
            alpha = 1.0 * (1 - pos);
            blur = 60 * (1 - pos);
        } else if (stroke === "Compression") {
            alpha = 0.5 * pos;
            blur = 30 * pos;
        }

        const radialGlow = ctx.createRadialGradient(centerX, this.baseY, 10, centerX, pistonY, this.cylWidth * 2);
        radialGlow.addColorStop(0, color);
        radialGlow.addColorStop(0.8, 'transparent');
        ctx.fillStyle = radialGlow;
        ctx.globalAlpha = alpha * 0.6;
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
        ctx.fillRect(x + 10, this.baseY - 40, this.cylWidth - 20, pistonY - (this.baseY - 40));

        const flare = ctx.createLinearGradient(centerX, this.baseY - 40, centerX, this.baseY + 60);
        flare.addColorStop(0, color);
        flare.addColorStop(1, 'transparent');
        ctx.fillStyle = flare;
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillRect(x + 10, this.baseY - 40, this.cylWidth - 20, 60);
        ctx.restore();
    }

    drawValves(x, y, index) {
        const ctx = this.ctx;
        const intakeLift = this.engine.getValveLift(index, 'intake');
        const exhaustLift = this.engine.getValveLift(index, 'exhaust');
        ctx.fillStyle = '#3498db';
        ctx.fillRect(x - 35, y - 50 + intakeLift * 15, 25, 8);
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(x + 10, y - 50 + exhaustLift * 15, 25, 8);
    }

    drawLabels(x, stroke, color, index) {
        const ctx = this.ctx;

        ctx.save();
        ctx.textAlign = 'center';

        // Position labels at the very top of the canvas
        const topY = this.height * 0.08;

        // Cylinder ID
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${this.fontSizeSmall}px Inter`;
        ctx.fillText(`CYL ${index + 1}`, x, topY);

        // Bold Glowing Stroke Label
        ctx.fillStyle = color;
        ctx.font = `900 ${this.fontSizeLarge}px "Inter", sans-serif`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;

        const strokeY = topY + this.fontSizeLarge + 5;
        ctx.fillText(stroke.toUpperCase(), x, strokeY);

        // Double fill for punchier color
        ctx.globalAlpha = 0.5;
        ctx.fillText(stroke.toUpperCase(), x, strokeY);

        ctx.restore();
    }
}

export default Visualizer;
