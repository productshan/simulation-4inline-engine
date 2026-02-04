import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls.js';

class Visualizer3D {
    constructor(container, engine) {
        this.container = container;
        this.engine = engine;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);

        this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(250, 150, 350);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.target.set(0, 80, 0);

        this.initLights();
        this.initModels();

        window.addEventListener('resize', () => this.onResize());
    }

    initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(100, 200, 100);
        mainLight.castShadow = true;
        this.scene.add(mainLight);

        const fillLight = new THREE.PointLight(0xffffff, 0.5, 500);
        fillLight.position.set(-200, 100, -100);
        this.scene.add(fillLight);
    }

    initModels() {
        const startX = -150;
        const spacing = 100;
        const r = this.engine.crankRadius * 1.5;
        const l = this.engine.conRodLength * 1.5;

        // 1. Engine Block / Cylinders
        this.cylinderLiners = [];
        const linerGeo = new THREE.CylinderGeometry(40, 40, 180, 32, 1, true);
        for (let i = 0; i < 4; i++) {
            const mat = new THREE.MeshStandardMaterial({
                color: 0x333333,
                transparent: true,
                opacity: 0.1,
                side: THREE.BackSide,
                emissiveIntensity: 0
            });
            const liner = new THREE.Mesh(linerGeo, mat);
            liner.position.set(startX + i * spacing, 140, 0);
            this.scene.add(liner);
            this.cylinderLiners.push(liner);
        }

        // 2. Crankshaft
        this.crankshaft = new THREE.Group();
        const shaftMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.9, roughness: 0.2 });
        const shaftGeo = new THREE.CylinderGeometry(8, 8, 450, 32);
        const shaftMain = new THREE.Mesh(shaftGeo, shaftMat);
        shaftMain.rotation.z = Math.PI / 2;
        this.crankshaft.add(shaftMain);

        // Crank Webs
        for (let i = 0; i < 4; i++) {
            const webGroup = new THREE.Group();
            webGroup.position.x = startX + i * spacing;

            const webGeo = new THREE.BoxGeometry(15, 60, 25);
            const web = new THREE.Mesh(webGeo, shaftMat);
            web.position.y = 20; // Offset from center
            webGroup.add(web);

            // Crank Pin Visualize
            const pinGeo = new THREE.CylinderGeometry(10, 10, 20, 16);
            const pin = new THREE.Mesh(pinGeo, shaftMat);
            pin.rotation.z = Math.PI / 2;
            pin.position.y = 40; // At radius
            webGroup.add(pin);

            // Set rotation offset for 180 crank
            webGroup.rotation.x = (this.engine.pistonOffsets[i]) * Math.PI / 180;
            this.crankshaft.add(webGroup);
        }
        this.scene.add(this.crankshaft);

        // 3. Pistons and Rods
        this.pistons = [];
        this.rods = [];

        const pistonGeo = new THREE.CylinderGeometry(38, 38, 60, 32);
        const ringGeo = new THREE.CylinderGeometry(38.5, 38.5, 2, 32);
        const rodGeo = new THREE.CylinderGeometry(6, 8, l, 16); // Actual length L

        for (let i = 0; i < 4; i++) {
            // Piston Head (Unique Material per Piston)
            const pMat = new THREE.MeshStandardMaterial({
                color: 0xdddddd,
                metalness: 1.0,
                roughness: 0.1,
                emissive: 0x000000,
                emissiveIntensity: 0
            });

            const pHead = new THREE.Mesh(pistonGeo, pMat);
            pHead.position.x = startX + i * spacing;

            // Rings
            const ringMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 1, roughness: 0 });
            for (let rIdx = 0; rIdx < 3; rIdx++) {
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.position.y = 10 + rIdx * 8;
                pHead.add(ring);
            }

            this.scene.add(pHead);
            this.pistons.push(pHead);

            // Connecting Rod
            const rod = new THREE.Mesh(rodGeo, shaftMat);
            this.scene.add(rod);
            this.rods.push(rod);
        }
    }

    onResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    draw() {
        const engineAngle = this.engine.angle;
        const angleRad = -engineAngle * (Math.PI / 180);

        // 1. Rotate Crankshaft
        this.crankshaft.rotation.x = angleRad;

        const r = this.engine.crankRadius * 1.5;
        const l = this.engine.conRodLength * 1.5;
        const startX = -150;
        const spacing = 100;
        const crankshaftY = 0; // Crank sits at 0

        for (let i = 0; i < 4; i++) {
            const theta = (engineAngle + this.engine.pistonOffsets[i]) * (Math.PI / 180);

            // Crank Pin Position (Relative to Crank Center)
            // Note: Canvas coods were Y down, Three.js is Y up.
            // In Three.js: Pin Y = sin(theta)*r, Pin Z = cos(theta)*r (rotated around X)
            // But let's align with our shaft rotation.
            const pinY = Math.cos(theta) * r;
            const pinZ = Math.sin(theta) * r;

            // Piston Position
            // Slider-crank height from crankshaft: y = r*cos(theta) + sqrt(l^2 - (r*sin(theta))^2)
            const pistonHeight = r * Math.cos(theta) + Math.sqrt(l * l - Math.pow(r * Math.sin(theta), 2));
            const pistonY = crankshaftY + pistonHeight;
            const pistonX = startX + i * spacing;

            // Update Piston Mesh
            this.pistons[i].position.y = pistonY;

            // Update Connecting Rod Mesh
            // Rod bridges (pistonX, pistonY, 0) and (pistonX, pinY, pinZ)
            const dx = 0;
            const dy = pistonY - pinY;
            const dz = 0 - pinZ;

            this.rods[i].position.set(pistonX, (pistonY + pinY) / 2, pinZ / 2);

            // Rod points from Pin to Piston
            // We use lookAt or manual rotation.
            this.rods[i].rotation.x = Math.atan2(dz, dy);

            // 3. Stroke Colors & Effects
            const stroke = this.engine.getStroke(i);
            const colorStr = this.engine.getStrokeColor(stroke);
            const color = new THREE.Color(colorStr);

            // Update Piston Material
            const mat = this.pistons[i].material;
            mat.emissive.copy(color);

            if (stroke === "Power") {
                const pos = this.engine.getPistonPosition(i);
                mat.emissiveIntensity = 1.0 * (1.0 - pos); // Flash at top
            } else {
                mat.emissiveIntensity = 0.2; // Constant subtle glow for visibility
            }

            // Update Cylinder Liner
            const linerMat = this.cylinderLiners[i].material;
            linerMat.color.copy(color);
            linerMat.emissive = color;
            linerMat.emissiveIntensity = (stroke === "Power") ? 0.5 : 0.1;
            linerMat.opacity = (stroke === "Power") ? 0.4 : 0.1;
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

export default Visualizer3D;
