import * as THREE from "three/webgpu";

export const PRESET_COLORS = {
    red: 0xd8453f,
    blue: 0x04438c,
    field: 0xd7cda1,
    white: 0xffffff,
    gray: 0x808080,
    red_light: 0xf2d5ca,
    red_mid: 0xf1b6b2,
    blue_light: 0xd0e2e5,
    blue_mid: 0xaacce1,
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

    remove(index) {
        if (index < 0 || index >= this._entries.length) return false;
        const entry = this._entries[index];
        if (!entry) return false;

        this.threeScene.remove(entry.mesh);
        entry.mesh.geometry.dispose();
        entry.mesh.material.dispose();
        this._entries[index] = null;
        return true;
    }

    update(index, partialData) {
        if (index < 0 || index >= this._entries.length) return;
        const entry = this._entries[index];
        if (!entry) return;

        this.threeScene.remove(entry.mesh);
        entry.mesh.geometry.dispose();
        entry.mesh.material.dispose();

        Object.assign(entry.data, partialData);

        if (entry.data.type === "floor") {
            entry.mesh = this._createFloorMesh(entry.data);
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
                entry.mesh.geometry.dispose();
                entry.mesh.material.dispose();
            }
        }
        this._entries = [];
    }
}
