import * as THREE from "three";

export const PRESET_COLORS = {
    red: 0xd8453f,
    red_light: 0xf2d5ca,
    red_mid: 0xf1b6b2,
    blue: 0x04438c,
    blue_light: 0xd0e2e5,
    blue_mid: 0xaacce1,
    white: 0xffffff,
    gray: 0x808080,
    field: 0xd7cda1,
};

export class SceneManager {
    constructor(threeScene, settings = {}) {
        this.threeScene = threeScene;
        this.settings = {
            scale: settings.scale ?? 0.02,
            floorTall: settings.floorTall ?? 0,
            backgroundColor: settings.backgroundColor ?? 0x000000,
            presetColors: { ...PRESET_COLORS, ...(settings.presetColors ?? {}) },
        };

        this._entries = [];
    }

    static _parseColorValue(value) {
        if (typeof value === "number") return value;
        if (typeof value === "string") {
            if (value.startsWith("0x") || value.startsWith("0X")) {
                return Number(value);
            }
            if (value.startsWith("#")) {
                return parseInt(value.slice(1), 16);
            }
        }
        return 0xffffff;
    }

    _resolveColor(color) {
        if (typeof color === "number") return color;
        if (typeof color === "string") {
            const resolved = this.settings.presetColors[color];
            if (resolved !== undefined) {
                return typeof resolved === "number"
                    ? resolved
                    : SceneManager._parseColorValue(resolved);
            }
            if (color.startsWith("0x") || color.startsWith("#")) {
                return SceneManager._parseColorValue(color);
            }
            console.warn(`Unknown preset color: "${color}", using white`);
            return 0xffffff;
        }
        return 0xffffff;
    }

    _addEdges(mesh, thresholdAngle = 1) {
        const edgeGeo = new THREE.EdgesGeometry(mesh.geometry, thresholdAngle);
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x222222, linewidth: 1 });
        const edges = new THREE.LineSegments(edgeGeo, edgeMat);
        mesh.add(edges);
    }

    _disposeMesh(mesh) {
        // Dispose edge children first
        for (const child of [...mesh.children]) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            mesh.remove(child);
        }
        mesh.geometry.dispose();
        mesh.material.dispose();
    }

    _createFloorMesh(data) {
        const s = this.settings.scale;
        const tall = data.tall ?? this.settings.floorTall;
        const color = this._resolveColor(data.color);

        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(
                data.width * s,
                tall * s,
                data.height * s,
            ),
            new THREE.MeshBasicMaterial({ color }),
        );
        mesh.position.set(
            (data.x + data.width / 2) * s,
            (data.z + tall / 2) * s,
            (data.y + data.height / 2) * s,
        );
        this._addEdges(mesh);
        this.threeScene.add(mesh);
        return mesh;
    }

    _createObjectMesh(data) {
        const s = this.settings.scale;
        const topRadius = data.topRadius ?? data.bottomRadius;
        const color = this._resolveColor(data.color);

        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(
                topRadius * s,
                data.bottomRadius * s,
                data.tall * s,
            ),
            new THREE.MeshBasicMaterial({ color }),
        );
        mesh.position.set(
            data.x * s,
            (data.z + data.tall / 2) * s,
            data.y * s,
        );
        this._addEdges(mesh);
        this.threeScene.add(mesh);
        return mesh;
    }

    _createSlopeMesh(data) {
        const s = this.settings.scale;
        const w = data.width * s;
        const h = data.height * s;
        const t = data.tall * s;
        const color = this._resolveColor(data.color);

        // Triangular prism (wedge): right angle at the bottom-front edge.
        // Cross-section is a right triangle: bottom-left (0,0), bottom-right (w,0), bottom-left top (0,t)
        // Extruded along Z (depth = h)
        const vertices = new Float32Array([
            // Front face (triangle)
            0, 0, 0,
            w, 0, 0,
            0, t, 0,
            // Back face (triangle)
            0, 0, h,
            w, 0, h,
            0, t, h,
            // Bottom face (rectangle)
            0, 0, 0,
            w, 0, 0,
            w, 0, h,
            0, 0, h,
            // Left face (rectangle) - vertical side
            0, 0, 0,
            0, t, 0,
            0, t, h,
            0, 0, h,
            // Hypotenuse face (rectangle) - slope surface
            w, 0, 0,
            0, t, 0,
            0, t, h,
            w, 0, h,
        ]);

        const indices = [
            // Front face
            0, 1, 2,
            // Back face
            3, 5, 4,
            // Bottom face
            6, 7, 8, 6, 8, 9,
            // Left face
            10, 11, 12, 10, 12, 13,
            // Hypotenuse face
            14, 15, 16, 14, 16, 17,
        ];

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const mesh = new THREE.Mesh(
            geometry,
            new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
        );
        mesh.position.set(
            data.x * s,
            data.z * s,
            data.y * s,
        );
        this._addEdges(mesh, 1);
        this.threeScene.add(mesh);
        return mesh;
    }

    addFloor(x, y, z, width, height, color, tall) {
        const data = { type: "floor", x, y, z, width, height, color };
        if (tall !== undefined) {
            data.tall = tall;
        }
        const mesh = this._createFloorMesh(data);
        this._entries.push({ data, mesh });
        return this._entries.length - 1;
    }

    addObject(x, y, z, bottomRadius, tall, color, topRadius) {
        const data = { type: "object", x, y, z, bottomRadius, tall, color };
        if (topRadius !== undefined) {
            data.topRadius = topRadius;
        }
        const mesh = this._createObjectMesh(data);
        this._entries.push({ data, mesh });
        return this._entries.length - 1;
    }

    addSlope(x, y, z, width, height, tall, color) {
        const data = { type: "slope", x, y, z, width, height, tall, color };
        const mesh = this._createSlopeMesh(data);
        this._entries.push({ data, mesh });
        return this._entries.length - 1;
    }

    remove(index) {
        if (index < 0 || index >= this._entries.length) return false;
        const entry = this._entries[index];
        if (!entry) return false;

        this.threeScene.remove(entry.mesh);
        this._disposeMesh(entry.mesh);
        this._entries[index] = null;
        return true;
    }

    update(index, partialData) {
        if (index < 0 || index >= this._entries.length) return;
        const entry = this._entries[index];
        if (!entry) return;

        this.threeScene.remove(entry.mesh);
        this._disposeMesh(entry.mesh);

        Object.assign(entry.data, partialData);

        if (entry.data.type === "floor") {
            entry.mesh = this._createFloorMesh(entry.data);
        } else if (entry.data.type === "slope") {
            entry.mesh = this._createSlopeMesh(entry.data);
        } else {
            entry.mesh = this._createObjectMesh(entry.data);
        }
    }

    get(index) {
        const entry = this._entries[index];
        return entry ? { ...entry.data } : null;
    }

    getAll() {
        return this._entries
            .map((entry, index) =>
                entry ? { index, data: { ...entry.data } } : null,
            )
            .filter(Boolean);
    }

    addFromData(data) {
        if (data.type === "floor") {
            return this.addFloor(data.x, data.y, data.z, data.width, data.height, data.color, data.tall);
        }
        if (data.type === "slope") {
            return this.addSlope(data.x, data.y, data.z, data.width, data.height, data.tall, data.color);
        }
        return this.addObject(data.x, data.y, data.z, data.bottomRadius, data.tall, data.color, data.topRadius);
    }

    get count() {
        return this._entries.filter(Boolean).length;
    }

    exportScene() {
        return {
            version: "1.0.0",
            settings: {
                scale: this.settings.scale,
                floorTall: this.settings.floorTall,
                backgroundColor: this.settings.backgroundColor,
                presetColors: { ...this.settings.presetColors },
            },
            objects: this._entries
                .filter(Boolean)
                .map((entry) => ({ ...entry.data })),
        };
    }

    importScene(sceneData) {
        this.clear();

        if (sceneData.settings) {
            if (sceneData.settings.scale !== undefined)
                this.settings.scale = sceneData.settings.scale;
            if (sceneData.settings.floorTall !== undefined)
                this.settings.floorTall = sceneData.settings.floorTall;
            if (sceneData.settings.backgroundColor !== undefined)
                this.settings.backgroundColor =
                    sceneData.settings.backgroundColor;
            if (sceneData.settings.presetColors) {
                const parsed = {};
                for (const [key, value] of Object.entries(
                    sceneData.settings.presetColors,
                )) {
                    parsed[key] = SceneManager._parseColorValue(value);
                }
                this.settings.presetColors = {
                    ...PRESET_COLORS,
                    ...parsed,
                };
            }
        }

        for (const obj of sceneData.objects) {
            if (obj.type === "floor") {
                this.addFloor(
                    obj.x,
                    obj.y,
                    obj.z,
                    obj.width,
                    obj.height,
                    obj.color,
                    obj.tall,
                );
            } else if (obj.type === "slope") {
                this.addSlope(
                    obj.x,
                    obj.y,
                    obj.z,
                    obj.width,
                    obj.height,
                    obj.tall,
                    obj.color,
                );
            } else if (obj.type === "object") {
                this.addObject(
                    obj.x,
                    obj.y,
                    obj.z,
                    obj.bottomRadius,
                    obj.tall,
                    obj.color,
                    obj.topRadius,
                );
            }
        }
    }

    clear() {
        for (const entry of this._entries) {
            if (entry) {
                this.threeScene.remove(entry.mesh);
                this._disposeMesh(entry.mesh);
            }
        }
        this._entries = [];
    }
}
