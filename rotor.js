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

	return { rotor_renderer, rotor_scene, rotor_camera };
}

export function updateOrientation(rotor_camera) {
	const orientationText = document.querySelector("#cameraOrientation");
	const radToDeg = (rad) => ((rad * 180) / Math.PI).toFixed(1);
	if (!orientationText) return;
	const pitch = radToDeg(rotor_camera.rotation.x);
	const yaw = radToDeg(rotor_camera.rotation.y);
	const roll = radToDeg(rotor_camera.rotation.z);
	orientationText.textContent = `roll: ${roll}°, pitch: ${pitch}°, yaw: ${yaw}°`;
}
