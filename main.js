import * as THREE from "three";
import { createRotorBox, updateOrientation } from "./rotor.js";
import { createViewerBox } from "./viewer.js";
import { CadPanel } from "./cad-panel.js";
import { ShareDialog } from "./share-dialog.js";
import { encodeSceneToHash } from "./scene-serializer.js";

window.addEventListener("DOMContentLoaded", () => {
    // Confirm dialog when clicking the header link
    const headerLink = document.getElementById("headerLink");
    if (headerLink) {
        headerLink.addEventListener("click", (e) => {
            const isMobile = window.matchMedia("(max-width: 768px)").matches;
            if (isMobile) {
                e.preventDefault();
                return;
            }
            const confirmed = confirm("ページを移動すると、編集中のフィールドのデータは失われます。移動してもよろしいですか？");
            if (!confirmed) {
                e.preventDefault();
            }
        });
    }

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
    let targetDistance = distance;
    const minDistance = 1;
    const maxDistance = 10000;

    const cadPanel = new CadPanel(sceneManager);
    const shareDialog = new ShareDialog(sceneManager);

    // Create and append floating zoom buttons
    const zoomContainer = document.createElement("div");
    zoomContainer.className = "zoom-btn-container";

    const zoomInBtn = document.createElement("button");
    zoomInBtn.className = "zoom-btn zoom-in";
    zoomInBtn.innerHTML = "+";
    zoomInBtn.setAttribute("aria-label", "Zoom In");

    const zoomOutBtn = document.createElement("button");
    zoomOutBtn.className = "zoom-btn zoom-out";
    zoomOutBtn.innerHTML = "−";
    zoomOutBtn.setAttribute("aria-label", "Zoom Out");

    zoomContainer.appendChild(zoomInBtn);
    zoomContainer.appendChild(zoomOutBtn);
    document.body.appendChild(zoomContainer);

    let zoomInterval = null;
    let zoomTimeout = null;

    function startZoom(direction) {
        const step = direction === "in" ? 0.8 : 1.25;
        targetDistance = Math.min(Math.max(targetDistance * step, minDistance), maxDistance);

        zoomTimeout = setTimeout(() => {
            zoomInterval = setInterval(() => {
                const contStep = direction === "in" ? 0.95 : 1.05;
                targetDistance = Math.min(Math.max(targetDistance * contStep, minDistance), maxDistance);
            }, 30);
        }, 250);
    }

    function stopZoom() {
        clearTimeout(zoomTimeout);
        clearInterval(zoomInterval);
    }

    zoomInBtn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        startZoom("in");
    });
    zoomOutBtn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        startZoom("out");
    });

    const stopEvents = ["pointerup", "pointerleave", "pointercancel"];
    stopEvents.forEach(evt => {
        zoomInBtn.addEventListener(evt, stopZoom);
        zoomOutBtn.addEventListener(evt, stopZoom);
    });

    function updateHash() {
        try {
            const hash = encodeSceneToHash(sceneManager.exportScene().objects);
            history.replaceState(null, "", "#" + hash);
        } catch (err) {
            console.error("Failed to update hash:", err);
        }
    }

    sceneManager.onChange = updateHash;

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

        const isMobile = window.matchMedia("(max-width: 768px)").matches;
        const w = window.innerWidth;
        const h = isMobile ? window.innerHeight : window.innerHeight - 150;
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

        // Smoothly interpolate distance to targetDistance
        const lerpFactor = 0.15;
        distance += (targetDistance - distance) * lerpFactor;

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

    // Track active pointers for multi-touch gestures (pan & zoom)
    const activePointers = new Map();
    let initialPinchDistance = 0;
    let initialZoomDistance = 0;
    let lastMidX = 0;
    let lastMidY = 0;

    canvas.addEventListener("pointerdown", (e) => {
        canvas.setPointerCapture(e.pointerId);
        activePointers.set(e.pointerId, e);

        if (activePointers.size === 1) {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        } else if (activePointers.size === 2) {
            isDragging = false; // Disable single-finger drag
            const [p1, p2] = Array.from(activePointers.values());
            initialPinchDistance = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
            initialZoomDistance = targetDistance;
            lastMidX = (p1.clientX + p2.clientX) / 2;
            lastMidY = (p1.clientY + p2.clientY) / 2;
        }
    });

    canvas.addEventListener("pointermove", (e) => {
        if (!activePointers.has(e.pointerId)) return;
        activePointers.set(e.pointerId, e);

        const euler = new THREE.Euler().setFromQuaternion(
            rotor_camera.quaternion,
            "YXZ",
        );

        if (activePointers.size === 1 && isDragging) {
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
        } else if (activePointers.size === 2) {
            const [p1, p2] = Array.from(activePointers.values());

            // 1. Pinch to zoom
            const currentDistance = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
            if (initialPinchDistance > 10) {
                const ratio = initialPinchDistance / currentDistance;
                targetDistance = Math.min(Math.max(initialZoomDistance * ratio, minDistance), maxDistance);
            }

            // 2. Two-finger translation (panning)
            const midX = (p1.clientX + p2.clientX) / 2;
            const midY = (p1.clientY + p2.clientY) / 2;
            const dx = midX - lastMidX;
            const dy = midY - lastMidY;
            lastMidX = midX;
            lastMidY = midY;

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
        }
    });

    const handlePointerUp = (e) => {
        if (activePointers.has(e.pointerId)) {
            canvas.releasePointerCapture(e.pointerId);
            activePointers.delete(e.pointerId);
        }

        if (activePointers.size === 1) {
            // Restore single finger drag configuration using the remaining finger
            const remaining = Array.from(activePointers.values())[0];
            lastX = remaining.clientX;
            lastY = remaining.clientY;
            isDragging = true;
        } else if (activePointers.size === 0) {
            isDragging = false;
        }
    };

    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerUp);

    canvas.addEventListener(
        "wheel",
        (e) => {
            e.preventDefault();
            const zoomSpeed = 0.002;
            targetDistance *= 1 + e.deltaY * zoomSpeed;
            targetDistance = Math.min(Math.max(targetDistance, minDistance), maxDistance);
        },
        { passive: false },
    );
});
