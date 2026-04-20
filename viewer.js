import * as THREE from "three/webgpu";

export function createViewerBox(onTick) {
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

    const geometry = new THREE.BoxGeometry(500, 1, 500);
    const material = new THREE.MeshNormalMaterial();
    const box = new THREE.Mesh(geometry, material);
    scene.add(box);

    const new_geometry = new THREE.BoxGeometry(100, 100, 100);
    const new_material = new THREE.MeshNormalMaterial();
    const new_box = new THREE.Mesh(new_geometry, new_material);
    new_box.position.set(0, 50, 0);
    scene.add(new_box);

    return {
        renderer,
        scene,
        camera,
        canvas,
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
