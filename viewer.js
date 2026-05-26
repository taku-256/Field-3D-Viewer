import * as THREE from "three";
import { SceneManager } from "./scene-manager.js";
import { objects as defaultObjects, DEFAULT_SETTINGS } from "./default-field.js";
import { decodeSceneFromHash } from "./scene-serializer.js";

export function createViewerBox(onTick) {
    let width = window.innerWidth;
    let height = window.innerHeight - 150;
    const canvas = document.querySelector("#myCanvas");
    let look_x = 0;
    let look_y = 0;
    let distance = 1000;
    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(width, height);
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setAnimationLoop(onTick);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(DEFAULT_SETTINGS.backgroundColor);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
    camera.position.set(0, 0, 1000);

    const sceneManager = new SceneManager(scene, DEFAULT_SETTINGS);

    let initialObjects = defaultObjects;

    if (location.hash.length > 1) {
        try {
            const decoded = decodeSceneFromHash(location.hash);
            if (decoded.length > 0) {
                initialObjects = decoded;
            }
        } catch (err) {
            console.error("Failed to decode scene from hash:", err);
        }
    }

    for (const obj of initialObjects) {
        sceneManager.addFromData(obj);
    }

    return {
        renderer,
        scene,
        camera,
        canvas,
        sceneManager,
        getSize: () => ({ width, height }),
        setSize: (w, h) => {
            width = w;
            height = h;
        },
        look_x,
        look_y,
        distance,
    };
}
