import * as THREE from "three/webgpu";

/**
 * プリセットカラーテーブル
 * 文字列キーで参照可能な定義済みカラー
 */
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

/**
 * SceneManager
 *
 * CADオブジェクト（floor / object）の管理と Three.js シーンへの同期を行う。
 *
 * - floor: 床材。パラメータは make_floor と同じ（x, y, z, width, height, color）。
 *          厚さ (tall) はデフォルト設定を持ち、個別上書き可能。
 * - object: 円柱。パラメータは make_cylinder と同じ（x, y, z, bottomRadius, tall, color, topRadius?）。
 *
 * カラー指定:
 *   - string → PRESET_COLORS から解決
 *   - number → そのまま 0xRRGGBB として使用
 */
export class SceneManager {
    /**
     * @param {THREE.Scene} threeScene - Three.js のシーン
     * @param {Object} [settings]
     * @param {number} [settings.scale=0.02] - mm → Three.js 変換スケール (1/50)
     * @param {number} [settings.floorTall=0] - floor のデフォルト厚さ (mm)
     * @param {number} [settings.backgroundColor=0x000000]
     * @param {Object} [settings.presetColors] - プリセットカラー上書き
     */
    constructor(threeScene, settings = {}) {
        this.threeScene = threeScene;
        this.settings = {
            scale: settings.scale ?? 0.02,
            floorTall: settings.floorTall ?? 0,
            backgroundColor: settings.backgroundColor ?? 0x000000,
            presetColors: { ...PRESET_COLORS, ...(settings.presetColors ?? {}) },
        };

        /** @type {Array<{data: FloorData|ObjectData, mesh: THREE.Mesh}>} */
        this._entries = [];
    }

    // =========================================================================
    // カラー解決
    // =========================================================================

    /**
     * 色値を数値に正規化する（"0xd8453f" → 数値、"#d8453f" → 数値）
     * @param {string|number} value
     * @returns {number}
     */
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

    /**
     * プリセット名 or 数値リテラルを実際のカラー値に解決する
     * @param {string|number} color
     * @returns {number} 0xRRGGBB
     */
    _resolveColor(color) {
        if (typeof color === "number") return color;
        if (typeof color === "string") {
            // プリセット名として検索
            const resolved = this.settings.presetColors[color];
            if (resolved !== undefined) {
                return typeof resolved === "number"
                    ? resolved
                    : SceneManager._parseColorValue(resolved);
            }
            // プリセットにない場合、直接カラー値として解釈を試みる
            if (color.startsWith("0x") || color.startsWith("#")) {
                return SceneManager._parseColorValue(color);
            }
            console.warn(`Unknown preset color: "${color}", using white`);
            return 0xffffff;
        }
        return 0xffffff;
    }

    // =========================================================================
    // Three.js メッシュ生成
    // =========================================================================

    /**
     * FloorData から Three.js Mesh を生成してシーンに追加
     * @param {FloorData} data
     * @returns {THREE.Mesh}
     */
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

    /**
     * ObjectData から Three.js Mesh を生成してシーンに追加
     * @param {ObjectData} data
     * @returns {THREE.Mesh}
     */
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

    // =========================================================================
    // CRUD
    // =========================================================================

    /**
     * Floor（床材）を追加
     * @param {number} x - X座標 (mm, コーナー基準)
     * @param {number} y - Y座標 (mm, コーナー基準)
     * @param {number} z - Z座標 (mm)
     * @param {number} width - 幅 (mm)
     * @param {number} height - 奥行き (mm)
     * @param {string|number} color - プリセット名 or 0xRRGGBB
     * @param {number} [tall] - 個別厚さ上書き (mm)。省略時は settings.floorTall
     * @returns {number} 追加されたオブジェクトのインデックス
     */
    addFloor(x, y, z, width, height, color, tall) {
        const data = { type: "floor", x, y, z, width, height, color };
        if (tall !== undefined) {
            data.tall = tall;
        }
        const mesh = this._createFloorMesh(data);
        this._entries.push({ data, mesh });
        return this._entries.length - 1;
    }

    /**
     * Object（円柱）を追加
     * @param {number} x - X座標 (mm, 中心基準)
     * @param {number} y - Y座標 (mm, 中心基準)
     * @param {number} z - Z座標 (mm)
     * @param {number} bottomRadius - 下面半径 (mm)
     * @param {number} tall - 高さ (mm)
     * @param {string|number} color - プリセット名 or 0xRRGGBB
     * @param {number} [topRadius] - 上面半径 (mm)。省略時 = bottomRadius
     * @returns {number} 追加されたオブジェクトのインデックス
     */
    addObject(x, y, z, bottomRadius, tall, color, topRadius) {
        const data = { type: "object", x, y, z, bottomRadius, tall, color };
        if (topRadius !== undefined) {
            data.topRadius = topRadius;
        }
        const mesh = this._createObjectMesh(data);
        this._entries.push({ data, mesh });
        return this._entries.length - 1;
    }

    /**
     * インデックスを指定してオブジェクトを削除
     * @param {number} index
     * @returns {boolean} 削除成功したか
     */
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

    /**
     * インデックスを指定してオブジェクトを更新
     * @param {number} index
     * @param {Object} partialData - 更新するフィールド
     */
    update(index, partialData) {
        if (index < 0 || index >= this._entries.length) return;
        const entry = this._entries[index];
        if (!entry) return;

        // 古いメッシュを削除
        this.threeScene.remove(entry.mesh);
        entry.mesh.geometry.dispose();
        entry.mesh.material.dispose();

        // データ更新
        Object.assign(entry.data, partialData);

        // 新しいメッシュを生成
        if (entry.data.type === "floor") {
            entry.mesh = this._createFloorMesh(entry.data);
        } else {
            entry.mesh = this._createObjectMesh(entry.data);
        }
    }

    /**
     * インデックスを指定してオブジェクトデータを取得
     * @param {number} index
     * @returns {FloorData|ObjectData|null}
     */
    get(index) {
        const entry = this._entries[index];
        return entry ? { ...entry.data } : null;
    }

    /**
     * 全オブジェクトデータを取得（削除済み=nullは除外）
     * @returns {Array<{index: number, data: FloorData|ObjectData}>}
     */
    getAll() {
        return this._entries
            .map((entry, index) =>
                entry ? { index, data: { ...entry.data } } : null,
            )
            .filter(Boolean);
    }

    /**
     * 全オブジェクトの数（削除済み除外）
     * @returns {number}
     */
    get count() {
        return this._entries.filter(Boolean).length;
    }

    // =========================================================================
    // シリアライズ / デシリアライズ
    // =========================================================================

    /**
     * 現在のシーンを JSON-serializable なオブジェクトとしてエクスポート
     * @returns {SceneData}
     */
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

    /**
     * JSON からシーンをインポート（既存オブジェクトはクリアされる）
     * @param {SceneData} sceneData
     */
    importScene(sceneData) {
        this.clear();

        // 設定を更新
        if (sceneData.settings) {
            if (sceneData.settings.scale !== undefined)
                this.settings.scale = sceneData.settings.scale;
            if (sceneData.settings.floorTall !== undefined)
                this.settings.floorTall = sceneData.settings.floorTall;
            if (sceneData.settings.backgroundColor !== undefined)
                this.settings.backgroundColor =
                    sceneData.settings.backgroundColor;
            if (sceneData.settings.presetColors) {
                // JSON由来の文字列カラー値を数値に変換
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

        // オブジェクトを追加
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

    /**
     * 全オブジェクトをシーンから削除
     */
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
