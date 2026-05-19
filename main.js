import * as THREE from "three";
import { createRotorBox, updateOrientation } from "./rotor.js";
import { createViewerBox } from "./viewer.js";
import { CadPanel } from "./cad-panel.js";

window.addEventListener("DOMContentLoaded", () => {
    const { rotor_renderer, rotor_scene, rotor_camera } = createRotorBox();
    const {
        renderer,
        scene,
        camera,
        canvas,
        sceneManager,
        getSize,
        setSize,
        look_x: initial_look_x,
        look_y: initial_look_y,
        distance: initial_distance,
    } = createViewerBox(tick);

    let look_x = initial_look_x;
    let look_y = initial_look_y;
    let distance = initial_distance;

    const cadPanel = new CadPanel(sceneManager);

    const odomEl = document.querySelector("#odom");
    let prevW = 0;
    let prevH = 0;
    let lastTime = performance.now();

    function tick() {
        const now = performance.now();
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        cadPanel.tick(dt);

        updateOrientation(rotor_camera);

        const w = window.innerWidth;
        const h = window.innerHeight - 150;
        if (w !== prevW || h !== prevH) {
            prevW = w;
            prevH = h;
            setSize(w, h);
            renderer.setSize(w, h);
            renderer.setPixelRatio(devicePixelRatio);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }

        rotor_renderer.render(rotor_scene, rotor_camera);

        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyQuaternion(rotor_camera.quaternion);
        direction.normalize();

        camera.position.set(
            look_x + direction.x * distance,
            direction.y * distance,
            look_y + direction.z * distance,
        );
        camera.quaternion.copy(rotor_camera.quaternion);

        renderer.render(scene, camera);
        odomEl.textContent = `{x: ${look_x.toFixed(0)}, y: ${look_y.toFixed(0)}}, distance: ${distance.toFixed(0)}`;
    }

    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    const sensitivity = 1.0;

    canvas.addEventListener("pointerdown", (e) => {
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
    });

    canvas.addEventListener("pointermove", (e) => {
        if (!isDragging) return;
        const euler = new THREE.Euler().setFromQuaternion(
            rotor_camera.quaternion,
            "YXZ",
        );

        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        look_x -=
            ((dx * Math.cos(-euler.y) * sensitivity -
                dy * Math.sin(-euler.y) * sensitivity) *
                distance) /
            1500;
        look_y -=
            ((dx * Math.sin(-euler.y) * sensitivity +
                dy * Math.cos(-euler.y) * sensitivity) *
                distance) /
            1500;
    });

    canvas.addEventListener("pointerup", () => {
        isDragging = false;
    });

    canvas.addEventListener("pointerleave", () => {
        isDragging = false;
    });

    canvas.addEventListener(
        "wheel",
        (e) => {
            e.preventDefault();
            const zoomSpeed = 0.002;
            distance *= 1 + e.deltaY * zoomSpeed;
            const min = 1;
            const max = 10000;
            distance = Math.min(Math.max(distance, min), max);
        },
        { passive: false },
    );
});
