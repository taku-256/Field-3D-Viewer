import * as THREE from "three/webgpu";

function make_floor(scene, x, y, z, width, height, color, tall = 0) {
    const floor = new THREE.Mesh(
        new THREE.BoxGeometry(width / 50, tall / 50, height / 50),
        new THREE.MeshBasicMaterial({ color: color }),
    );
    floor.position.set(
        (x + width / 2) / 50,
        (z + tall / 2) / 50,
        (y + height / 2) / 50,
    );
    scene.add(floor);
    return floor;
}

function make_cylinder(
    scene,
    x,
    y,
    z,
    bottom_radius,
    tall,
    color,
    top_radius = bottom_radius,
) {
    const cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(
            top_radius / 50,
            bottom_radius / 50,
            tall / 50,
        ),
        new THREE.MeshBasicMaterial({ color: color }),
    );
    cylinder.position.set(x / 50, (z + tall / 2) / 50, y / 50);
    scene.add(cylinder);
    return cylinder;
}

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

    const objects = [];

    // objects.push(make_floor(scene, 0, 0, 0, 5850, 10800, 0xf2d5ca));
    // objects.push(make_floor(scene, 3550, 150, 20, 1000, 1000, 0xd8453f));
    // objects.push(make_floor(scene, 5850, 0, 0, 5850, 10800, 0xd0e2e5));
    // objects.push(
    //     make_floor(scene, 10800 - 3550, 150, 20, 1000, 1000, 0x04438c),
    // );
    // objects.push(make_floor(scene, 5550, 150, 0, 600, 10500, 0xd7cda1, 200));

    // ロンリ
    objects.push(make_floor(scene, 150, 150, 20, 1500, 1500, 0xd8453f));
    objects.push(
        make_floor(scene, 10800 - 150 - 1500, 150, 20, 1500, 1500, 0x04438c),
    );
    objects.push(make_floor(scene, 150, 3000, 20, 5000, 2400, 0x808080));
    objects.push(
        make_floor(scene, 10800 - 150 - 5000, 3000, 20, 5000, 2400, 0x808080),
    );
    objects.push(make_floor(scene, 0, 0, 0, 10800, 11700, 0xd7cda1));

    //さく
    objects.push(make_floor(scene, 0, 0, 0, 5300, 150, 0xd8453f, 150));
    objects.push(make_floor(scene, 0, 0, 0, 150, 11700, 0xd8453f, 150));
    objects.push(make_floor(scene, 0, 11550, 0, 5300, 150, 0xd8453f, 150));
    objects.push(make_floor(scene, 5150, 0, 0, 150, 11700, 0xd8453f, 150));

    objects.push(make_floor(scene, 5500, 0, 0, 5300, 150, 0x04438c, 150));
    objects.push(make_floor(scene, 5500, 0, 0, 150, 11700, 0x04438c, 150));
    objects.push(make_floor(scene, 5500, 11550, 0, 5300, 150, 0x04438c, 150));
    objects.push(
        make_floor(scene, 5500 + 5150, 0, 0, 150, 11700, 0x04438c, 150),
    );

    objects.push(make_floor(scene, 150, 3000, 0, 5000, 40, 0xffffff, 42));
    objects.push(make_floor(scene, 150, 5400, 0, 5000, 40, 0xffffff, 42));
    objects.push(make_floor(scene, 5700, 3000, 0, 5000, 40, 0xffffff, 42));
    objects.push(make_floor(scene, 5700, 5400, 0, 5000, 40, 0xffffff, 42));

    // スポット
    objects.push(
        make_cylinder(
            scene,
            2650,
            11700 - 5500 / 2 - 500 - 150,
            50,
            400,
            50,
            0xd8453f,
        ),
    );
    objects.push(
        make_cylinder(
            scene,
            2650,
            11700 - 5500 / 2 - 500 - 150,
            0,
            800,
            50,
            0xf2d5ca,
        ),
    );
    objects.push(
        make_cylinder(
            scene,
            2650,
            11700 - 5500 / 2 - 500 - 150,
            5,
            1700,
            0,
            0xf1b6b2,
        ),
    );

    objects.push(
        make_cylinder(
            scene,
            10800 - 2650,
            11700 - 5500 / 2 - 500 - 150,
            50,
            400,
            50,
            0x04438c,
        ),
    );
    objects.push(
        make_cylinder(
            scene,
            10800 - 2650,
            11700 - 5500 / 2 - 500 - 150,
            0,
            800,
            50,
            0xd0e2e5,
        ),
    );
    objects.push(
        make_cylinder(
            scene,
            10800 - 2650,
            11700 - 5500 / 2 - 500 - 150,
            5,
            1700,
            0,
            0xaacce1,
        ),
    );

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
