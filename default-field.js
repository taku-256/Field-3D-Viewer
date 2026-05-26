import { PRESET_COLORS } from "./scene-manager.js";

export const DEFAULT_SETTINGS = {
    scale: 0.02,
    floorTall: 0,
    backgroundColor: 0x000000,
    presetColors: PRESET_COLORS,
};

// floor (ボックス): { type, x, y, z, width, height, color, tall? }
// object (シリンダー): { type, x, y, z, bottomRadius, tall, color, topRadius? }
// slope (スロープ): { type, x, y, z, width, height, tall, color }
export const objects = [
    // フィールド床
    { type: "floor", x: 0, y: 0, z: 0, width: 10800, height: 11700, color: "field" },

    // ロンリ
    { type: "floor", x: 150, y: 150, z: 20, width: 1500, height: 1500, color: "red" },
    { type: "floor", x: 9150, y: 150, z: 20, width: 1500, height: 1500, color: "blue" },
    { type: "floor", x: 150, y: 3000, z: 20, width: 5000, height: 2400, color: "gray" },
    { type: "floor", x: 5650, y: 3000, z: 20, width: 5000, height: 2400, color: "gray" },

    // さく（赤側）
    { type: "floor", x: 0, y: 0, z: 0, width: 5300, height: 150, color: "red", tall: 150 },
    { type: "floor", x: 0, y: 0, z: 0, width: 150, height: 11700, color: "red", tall: 150 },
    { type: "floor", x: 0, y: 11550, z: 0, width: 5300, height: 150, color: "red", tall: 150 },
    { type: "floor", x: 5150, y: 0, z: 0, width: 150, height: 11700, color: "red", tall: 150 },

    // さく（青側）
    { type: "floor", x: 5500, y: 0, z: 0, width: 5300, height: 150, color: "blue", tall: 150 },
    { type: "floor", x: 5500, y: 0, z: 0, width: 150, height: 11700, color: "blue", tall: 150 },
    { type: "floor", x: 5500, y: 11550, z: 0, width: 5300, height: 150, color: "blue", tall: 150 },
    { type: "floor", x: 10650, y: 0, z: 0, width: 150, height: 11700, color: "blue", tall: 150 },

    // 白線
    { type: "floor", x: 150, y: 3000, z: 0, width: 5000, height: 40, color: "white", tall: 42 },
    { type: "floor", x: 150, y: 5400, z: 0, width: 5000, height: 40, color: "white", tall: 42 },
    { type: "floor", x: 5700, y: 3000, z: 0, width: 5000, height: 40, color: "white", tall: 42 },
    { type: "floor", x: 5700, y: 5400, z: 0, width: 5000, height: 40, color: "white", tall: 42 },

    // スポット（赤側）
    { type: "object", x: 2650, y: 8300, z: 50, bottomRadius: 400, tall: 50, color: "red" },
    { type: "object", x: 2650, y: 8300, z: 0, bottomRadius: 800, tall: 50, color: "red_light" },
    { type: "object", x: 2650, y: 8300, z: 5, bottomRadius: 1700, tall: 0, color: "red_mid" },

    // スポット（青側）
    { type: "object", x: 8150, y: 8300, z: 50, bottomRadius: 400, tall: 50, color: "blue" },
    { type: "object", x: 8150, y: 8300, z: 0, bottomRadius: 800, tall: 50, color: "blue_light" },
    { type: "object", x: 8150, y: 8300, z: 5, bottomRadius: 1700, tall: 0, color: "blue_mid" },
];

// export const objects = [];