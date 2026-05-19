import * as THREE from "three/webgpu";
import { SceneManager } from "./scene-manager.js";
import { objects, DEFAULT_SETTINGS } from "./default-field.js";

export function createViewerBox(onTick) {
    let width = window.innerWidth;
    let height = window.innerHeight - 150;
    const canvas = document.querySelector("#myCanvas");
    let look_x = 0;
    let look_y = 0;
    let distance = 1000;
    const renderer = new THREE.WebGPURenderer({ canvas, forceWebGL: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setAnimationLoop(onTick);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(DEFAULT_SETTINGS.backgroundColor);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
    camera.position.set(0, 0, 1000);

    const sceneManager = new SceneManager(scene, DEFAULT_SETTINGS);

    for (const obj of objects) {
        if (obj.type === "floor") {
            sceneManager.addFloor(obj.x, obj.y, obj.z, obj.width, obj.height, obj.color, obj.tall);
        } else if (obj.type === "object") {
            sceneManager.addObject(obj.x, obj.y, obj.z, obj.bottomRadius, obj.tall, obj.color, obj.topRadius);
        }
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
