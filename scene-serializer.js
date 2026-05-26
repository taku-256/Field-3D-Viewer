import pako from "pako";

const TYPE_MAP = { floor: "F", object: "O", slope: "S" };
const TYPE_REV = { F: "floor", O: "object", S: "slope" };

const COLOR_MAP = {
    red: "r", blue: "b", white: "w", gray: "g", field: "f",
    red_light: "R", red_mid: "M", blue_light: "B", blue_mid: "C",
};
const COLOR_REV = Object.fromEntries(
    Object.entries(COLOR_MAP).map(([k, v]) => [v, k]),
);

function encNum(v) {
    return Number(v).toString(36);
}

function decNum(s) {
    return parseInt(s, 36);
}

function encColor(c) {
    if (typeof c === "string" && COLOR_MAP[c]) return COLOR_MAP[c];
    if (typeof c === "number") return c.toString(36);
    return String(c);
}

function decColor(s) {
    if (COLOR_REV[s]) return COLOR_REV[s];
    const n = parseInt(s, 36);
    return isNaN(n) ? s : n;
}

function encodeRecord(obj) {
    const t = TYPE_MAP[obj.type];
    if (!t) return "";

    const parts = [t];

    if (obj.type === "floor") {
        parts.push(encNum(obj.x), encNum(obj.y), encNum(obj.z));
        parts.push(encNum(obj.width), encNum(obj.height));
        parts.push(encColor(obj.color));
        parts.push(obj.tall !== undefined ? encNum(obj.tall) : "");
    } else if (obj.type === "object") {
        parts.push(encNum(obj.x), encNum(obj.y), encNum(obj.z));
        parts.push(encNum(obj.bottomRadius), encNum(obj.tall));
        parts.push(encColor(obj.color));
        parts.push(obj.topRadius !== undefined ? encNum(obj.topRadius) : "");
    } else if (obj.type === "slope") {
        parts.push(encNum(obj.x), encNum(obj.y), encNum(obj.z));
        parts.push(encNum(obj.width), encNum(obj.height), encNum(obj.tall));
        parts.push(encColor(obj.color));
        parts.push(obj.rotation !== undefined ? encNum(obj.rotation) : "");
    }

    return parts.join(",") + ";";
}

function decodeRecord(str) {
    const parts = str.split(",");
    const type = TYPE_REV[parts[0]];
    if (!type) return null;

    if (type === "floor") {
        const obj = {
            type,
            x: decNum(parts[1]),
            y: decNum(parts[2]),
            z: decNum(parts[3]),
            width: decNum(parts[4]),
            height: decNum(parts[5]),
            color: decColor(parts[6]),
        };
        if (parts[7] && parts[7] !== "") obj.tall = decNum(parts[7]);
        return obj;
    }

    if (type === "object") {
        const obj = {
            type,
            x: decNum(parts[1]),
            y: decNum(parts[2]),
            z: decNum(parts[3]),
            bottomRadius: decNum(parts[4]),
            tall: decNum(parts[5]),
            color: decColor(parts[6]),
        };
        if (parts[7] && parts[7] !== "") obj.topRadius = decNum(parts[7]);
        return obj;
    }

    if (type === "slope") {
        const obj = {
            type,
            x: decNum(parts[1]),
            y: decNum(parts[2]),
            z: decNum(parts[3]),
            width: decNum(parts[4]),
            height: decNum(parts[5]),
            tall: decNum(parts[6]),
            color: decColor(parts[7]),
        };
        if (parts[8] && parts[8] !== "") obj.rotation = decNum(parts[8]);
        return obj;
    }

    return null;
}

export function encodeObjects(objects) {
    return objects.map(encodeRecord).join("");
}

export function decodeObjects(text) {
    return text
        .split(";")
        .filter((s) => s.length > 0)
        .map(decodeRecord)
        .filter(Boolean);
}

function toBase64url(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(str) {
    const padded = str.replace(/-/g, "+").replace(/_/g, "/");
    const pad = (4 - (padded.length % 4)) % 4;
    const b64 = padded + "=".repeat(pad);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

export function encodeSceneToHash(objects) {
    const text = encodeObjects(objects);
    const compressed = pako.deflateRaw(new TextEncoder().encode(text));
    return toBase64url(compressed);
}

export function decodeSceneFromHash(hash) {
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!raw) return [];
    const bytes = fromBase64url(raw);
    const inflated = pako.inflateRaw(bytes);
    const text = new TextDecoder().decode(inflated);
    return decodeObjects(text);
}
