/**
 * Engine Physics and Logic (Upgraded)
 * Handles dual-mode 4-stroke inline 4-cylinder engine mechanics.
 */
class Engine {
    constructor() {
        this.rpm = 0;
        this.angle = 0; // 0 to 720 degrees (crankshaft)
        this.isRunning = false;

        // Mechanical constants
        this.stroke = 80;
        this.crankRadius = this.stroke / 2;
        this.conRodLength = 150;

        // Firing Order 1-3-4-2
        this.pistonOffsets = [0, 180, 180, 0];
        this.strokeOffsets = [0, 180, 540, 360];

        // Valve Timing Constants (CRANK DEGREES)
        // Intake opens during Exhaust stroke (overlap) and closes after Intake stroke
        this.intakeDuration = 240;
        this.intakeCenter = 90; // Relative to cycle start (0 deg crank)

        // Exhaust opens during Power stroke and closes after Exhaust stroke
        this.exhaustDuration = 240;
        this.exhaustCenter = 630; // Relative to cycle start
    }

    get camAngle() {
        return (this.angle / 2) % 360;
    }

    update(dt) {
        if (this.isRunning) {
            const deltaAngle = (this.rpm * 6) * dt;
            this.angle = (this.angle + deltaAngle) % 720;
        }
    }

    setAngle(angle) {
        this.angle = angle % 720;
    }

    setRPM(rpm) {
        this.rpm = rpm;
        this.isRunning = rpm > 0;
    }

    /**
     * Side View (Full Kinematic)
     * Piston height from crank center: r*cos(theta) + sqrt(l^2 - (r*sin(theta))^2)
     */
    getPistonPositionSide(cylinderIndex) {
        const theta = (this.angle + this.pistonOffsets[cylinderIndex]) * (Math.PI / 180);
        const r = this.crankRadius;
        const l = this.conRodLength;
        const x = r * Math.cos(theta) + Math.sqrt(l * l - Math.pow(r * Math.sin(theta), 2));

        // Return normalized 0 (TDC) to 1 (BDC)
        const max = l + r;
        const min = l - r;
        return (max - x) / (max - min);
    }

    /**
     * Front View (Orthographic Projection)
     * Piston height is simply the vertical projection: r*cos(theta) + offset
     */
    getPistonPositionFront(cylinderIndex) {
        const theta = (this.angle + this.pistonOffsets[cylinderIndex]) * (Math.PI / 180);
        // Normalize 0 to 1 based on vertical projection path (2 * r)
        return (1 - Math.cos(theta)) / 2;
    }

    /**
     * Valve Lift calculation (0 to 1) based on simple lobe profile
     */
    getValveLift(cylinderIndex, type) {
        const cycleAngle = (this.angle + this.strokeOffsets[cylinderIndex]) % 720;
        const center = type === 'intake' ? this.intakeCenter : this.exhaustCenter;
        const duration = type === 'intake' ? this.intakeDuration : this.exhaustDuration;

        // Calculate distance from center of lobe (taking wrap-around into account)
        let diff = Math.abs(cycleAngle - center);
        if (diff > 360) diff = 720 - diff;

        if (diff < duration / 2) {
            // Sinusoidal lift profile
            const x = (diff / (duration / 2)) * (Math.PI / 2);
            return Math.cos(x);
        }
        return 0;
    }

    getStroke(cylinderIndex) {
        const cycleAngle = (this.angle + this.strokeOffsets[cylinderIndex]) % 720;
        if (cycleAngle < 180) return "Intake";
        if (cycleAngle < 360) return "Compression";
        if (cycleAngle < 540) return "Power";
        return "Exhaust";
    }

    getStrokeColor(stroke) {
        switch (stroke) {
            case "Intake": return "#39FF14";
            case "Compression": return "#7DF9FF";
            case "Power": return "#e74c3c";
            case "Exhaust": return "#f1c40f";
            default: return "#ffffff";
        }
    }
}

export default Engine;
