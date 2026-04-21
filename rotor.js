import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function createRotorBox(onTick) {
    const rotor_size = 256;
    const rotor_canvas = document.querySelector("#rotor");

    const rotor_renderer = new THREE.WebGPURenderer({
        canvas: rotor_canvas,
        alpha: true,
    });
    rotor_renderer.setSize(rotor_size, rotor_size);
    rotor_renderer.setPixelRatio(devicePixelRatio);
    rotor_renderer.setAnimationLoop(onTick);

    const rotor_scene = new THREE.Scene();
    rotor_renderer.setClearColor(0x0000000, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    rotor_scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(1, 1, 1);
    rotor_scene.add(directionalLight);

    const rotor_camera = new THREE.PerspectiveCamera(45, 1, 1, 10000);
    rotor_camera.position.set(0, rotor_size, 0);

    const controls = new OrbitControls(rotor_camera, rotor_canvas);
    controls.enableZoom = false;
    controls.enableRotate = true;
    controls.maxPolarAngle = Math.PI * 0.5;

    const materials = new THREE.MeshNormalMaterial();
    const box_size = rotor_size * 0.4;

    const rotor_box_geometry = new THREE.BoxGeometry(
        box_size,
        box_size,
        box_size,
    );

    const rotor_box = new THREE.Mesh(rotor_box_geometry, materials);
    rotor_scene.add(rotor_box);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const faceNames = ["+X", "-X", "+Y", "-Y", "+Z", "-Z"];

    rotor_canvas.addEventListener("click", (event) => {
        const rect = rotor_canvas.getBoundingClientRect();

        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, rotor_camera);

        const intersects = raycaster.intersectObject(rotor_box);

        if (intersects.length === 0) return;

        const hit = intersects[0];

        // --- 方法1: インデックスベース ---
        const quadIndex = Math.floor(hit.faceIndex / 2);
        const faceName = faceNames[quadIndex];

        // --- 方法2: 法線ベース（回転対応） ---
        const normal = hit.face.normal.clone();
        normal.applyQuaternion(rotor_box.quaternion);

        console.log("faceIndex:", hit.faceIndex);
        console.log("face(6面):", faceName);
        console.log("normal:", normal);

        controls.enabled = false;
        rotor_camera.position.set(0, rotor_size, 0);
        controls.enabled = true;
    });

    return { rotor_renderer, rotor_scene, rotor_camera };
}

export function updateOrientation(rotor_camera) {
    const orientationText = document.querySelector("#cameraOrientation");
    if (!orientationText) return;
    const radToDeg = (rad) => ((rad * 180) / Math.PI).toFixed(1);
    const euler = new THREE.Euler().setFromQuaternion(
        rotor_camera.quaternion,
        "YXZ",
    );

    const pitch = radToDeg(euler.x);
    const yaw = radToDeg(euler.y);
    const roll = radToDeg(euler.z);

    orientationText.textContent = `roll: ${roll}°, pitch: ${pitch}°, yaw: ${yaw}°`;
}
