import * as THREE from "three/webgpu";
import { SceneManager } from "./scene-manager.js";

/**
 * JSON の presetColors は文字列 "0xRRGGBB" 形式なので数値に変換する
 */
function parseColorTable(presetColors) {
    const result = {};
    for (const [key, value] of Object.entries(presetColors)) {
        result[key] = typeof value === "string" ? Number(value) : value;
    }
    return result;
}

export async function createViewerBox(onTick) {
    let width = window.innerWidth;
    let height = window.innerHeight - 150;
    const canvas = document.querySelector("#myCanvas");
    let look_x = 0;
    let look_y = 0;
    let distance = 1000;
    const renderer = new THREE.WebGPURenderer({ canvas });
    renderer.setSize(width, height);
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setAnimationLoop(onTick);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
    camera.position.set(0, 0, 1000);

    // デフォルトフィールドJSONの読み込み
    const response = await fetch("./default-field.json");
    const defaultField = await response.json();

    // SceneManager の初期化とデフォルトフィールドのロード
    const sceneManager = new SceneManager(scene, {
        scale: defaultField.settings.scale,
        floorTall: defaultField.settings.floorTall,
        backgroundColor:
            typeof defaultField.settings.backgroundColor === "string"
                ? parseInt(defaultField.settings.backgroundColor, 16)
                : defaultField.settings.backgroundColor,
        presetColors: parseColorTable(defaultField.settings.presetColors),
    });

    sceneManager.importScene(defaultField);

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
