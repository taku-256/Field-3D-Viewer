import { PRESET_COLORS } from "./scene-manager.js";

const BACK_SVG = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M14 4L7 11L14 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const DROPPER_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m2 22 1-1c1.2-1.2 1.2-3.1 0-4.2L15 5 19 9 7 21c-1.1 1.1-3 1.1-4.2 0Z"/>
    <path d="M15 5c.4-.4 1-.4 1.4 0l2.6 2.6c.4.4.4 1 0 1.4L15 5Z"/>
    <path d="M19 9 15 5"/>
    <path d="m5 17 2 2"/>
</svg>`;

function fieldRow(fields) {
    const cells = fields
        .map(([label, id, val]) =>
            `<div class="cad-field">
                <label class="cad-label">${label}</label>
                <input class="cad-input" type="number" id="${id}" value="${val}">
            </div>`)
        .join("");
    return `<div class="cad-field-row">${cells}</div>`;
}

export class CadPanel {
    constructor(sceneManager) {
        this.sm = sceneManager;
        this._editIdx = null;
        this._editType = "floor";
        this._blinkObject = null;
        this._blinkTime = 0;
        this._previewIdx = null;

        this._el = document.querySelector("#cadPanel .panelContent");
        this.showList();
    }

    _$(id) {
        const el = this._el.querySelector(`#${id}`);
        return el ? el.value : undefined;
    }

    _colorToCSS(color) {
        if (typeof color === "string") {
            const p = PRESET_COLORS[color];
            if (p !== undefined) return `#${(typeof p === "number" ? p : Number(p)).toString(16).padStart(6, "0")}`;
            if (color.startsWith("#")) return color;
            if (color.startsWith("0x")) return `#${color.slice(2).padStart(6, "0")}`;
            return "#ffffff";
        }
        if (typeof color === "number") return `#${color.toString(16).padStart(6, "0")}`;
        return "#ffffff";
    }

    tick(dt = 1 / 60) {
        if (!this._blinkObject) return;

        this._blinkTime += dt;

        const opacity =
            0.15 + 0.85 * (0.5 + 0.5 * Math.sin(this._blinkTime * 6));

        this._blinkObject.traverse((obj) => {
            if (!obj.isMesh) return;

            obj.material.opacity = opacity;
            obj.material.transparent = true;
        });
    }

    _startBlink(index) {
        this._stopBlink();

        const entry = this.sm._entries[index];

        if (!entry || !entry.mesh) return;

        this._blinkObject = entry.mesh;

        this._blinkObject.traverse((obj) => {
            if (!obj.isMesh) return;

            obj.material.transparent = true;
            obj.material.needsUpdate = true;
        });

        this._blinkTime = 0;
    }

    _stopBlink() {
        if (!this._blinkObject) return;

        this._blinkObject.traverse((obj) => {
            if (!obj.isMesh) return;

            obj.material.opacity = 1;
            obj.material.transparent = false;
            obj.material.needsUpdate = true;
        });

        this._blinkObject = null;
    }

    _removePreview() {
        if (this._previewIdx !== null) {
            this.sm.remove(this._previewIdx);
            this._previewIdx = null;
        }
    }

    _syncPreview() {
        const data = this._readAll();
        this._stopBlink();
        if (this._previewIdx !== null) {
            this.sm.update(this._previewIdx, data);
        } else {
            this._previewIdx = this.sm.addFromData(data);
        }
        this._startBlink(this._previewIdx);
    }

    _readAll() {
        const num = (id, fb) => parseFloat(this._$(id)) || fb;
        const optNum = (id) => { const v = this._$(id); return v !== undefined && v !== "" ? parseFloat(v) : undefined; };

        const colorSel = this._$("cadColor");
        let color;
        if (colorSel === "__custom") {
            const raw = this._$("cadColorCustom") || "0xffffff";
            color = raw.startsWith("#") ? parseInt(raw.slice(1), 16) : Number(raw);
        } else {
            color = colorSel;
        }

        const base = { type: this._editType, x: num("cadX", 0), y: num("cadY", 0), z: num("cadZ", 0), color };

        if (this._editType === "floor") {
            const data = { ...base, width: num("cadWidth", 1000), height: num("cadHeight", 1000) };
            const tall = optNum("cadTall");
            if (tall !== undefined) data.tall = tall;
            return data;
        }
        if (this._editType === "slope") {
            return { ...base, width: num("cadWidth", 1000), height: num("cadHeight", 1000), tall: num("cadTall", 200), rotation: num("cadRotation", 0) };
        }
        const data = { ...base, bottomRadius: num("cadBottomRadius", 100), tall: num("cadTall", 100) };
        const topR = optNum("cadTopRadius");
        if (topR !== undefined) data.topRadius = topR;
        return data;
    }

    showList() {
        this._stopBlink();
        this._removePreview();
        this._editIdx = null;

        const typeLabel = { floor: "ボックス", object: "シリンダー", slope: "スロープ" };
        const items = this.sm.getAll().map(({ index, data: d }) => {
            let label;
            if (d.type === "floor") {
                label = `ボックス (${d.x}, ${d.y}) ${d.width}×${d.height}`;
            } else if (d.type === "slope") {
                label = `スロープ (${d.x}, ${d.y}) ${d.width}×${d.height}×${d.tall}`;
            } else {
                label = `シリンダー (${d.x}, ${d.y}) r=${d.bottomRadius}`;
            }
            const colorName = typeof d.color === "string" ? d.color : `#${d.color.toString(16).padStart(6, "0")}`;
            return `<button class="cad-list-item" data-index="${index}">
                <span class="cad-item-icon"><span class="cad-color-dot" style="background:${this._colorToCSS(d.color)}"></span></span>
                <span class="cad-item-info">
                    <span class="cad-item-label">${label}</span>
                    <span class="cad-item-sub">z=${d.z}, color=${colorName}</span>
                </span>
                <span class="cad-item-arrow">›</span>
            </button>`;
        }).join("");

        this._el.innerHTML = `
            <h2 class="cad-title">Objects List</h2>
            <div class="cad-list-scroll">${items}</div>
            <button class="cad-fab" id="cadAddBtn" title="追加">+</button>`;

        this._el.querySelectorAll(".cad-list-item").forEach(btn =>
            btn.addEventListener("click", () => this.showEdit(parseInt(btn.dataset.index, 10))));
        this._el.querySelector("#cadAddBtn")?.addEventListener("click", () => this.showAdd());
    }

    showAdd() {
        this._editIdx = "new";
        this._editType = "floor";
        this._renderForm(null);
        this._syncPreview();
    }

    showEdit(index) {
        const data = this.sm.get(index);
        if (!data) { this.showList(); return; }
        this._editIdx = index;
        this._editType = data.type;
        this._startBlink(index);
        this._renderForm(data);
    }

    _renderForm(data) {
        const isNew = this._editIdx === "new";
        const type = data ? data.type : this._editType;
        const v = (key, fb = "") => data && data[key] !== undefined ? data[key] : fb;

        const colorOpts = Object.keys(PRESET_COLORS)
            .map(n => `<option value="${n}" ${data?.color === n ? "selected" : ""}>${n}</option>`)
            .join("")
            + `<option value="__custom" ${data && typeof data.color === "number" ? "selected" : ""}>カスタム...</option>`;

        const isCustom = data && typeof data.color === "number";
        const customVal = isCustom ? "0x" + data.color.toString(16).padStart(6, "0") : "";
        const pickerVal = isCustom ? "#" + data.color.toString(16).padStart(6, "0") : "#ffffff";

        let typeFields;
        if (type === "floor") {
            typeFields = fieldRow([["幅 (Width)", "cadWidth", v("width", 1000)], ["奥行 (Height)", "cadHeight", v("height", 1000)]])
                + fieldRow([["高さ (Tall)", "cadTall", v("tall", "")]]);
        } else if (type === "slope") {
            typeFields = fieldRow([["幅 (Width)", "cadWidth", v("width", 1000)], ["奥行 (Height)", "cadHeight", v("height", 1000)]])
                + fieldRow([["高さ (Tall)", "cadTall", v("tall", 200)]])
                + `<div class="cad-field-row"><div class="cad-field">
                    <label class="cad-label">回転 (Rotation)</label>
                    <select class="cad-input cad-select" id="cadRotation">
                        <option value="0" ${v("rotation", 0) == 0 ? "selected" : ""}>0°</option>
                        <option value="90" ${v("rotation", 0) == 90 ? "selected" : ""}>90°</option>
                        <option value="180" ${v("rotation", 0) == 180 ? "selected" : ""}>180°</option>
                        <option value="270" ${v("rotation", 0) == 270 ? "selected" : ""}>270°</option>
                    </select>
                </div></div>`;
        } else {
            typeFields = fieldRow([["下半径", "cadBottomRadius", v("bottomRadius", 100)], ["上半径", "cadTopRadius", v("topRadius", "")]])
                + fieldRow([["高さ (Tall)", "cadTall", v("tall", 100)]]);
        }

        this._el.innerHTML = `
            <div class="cad-edit-header">
                <button class="cad-back-btn" id="cadBackBtn" title="戻る">${BACK_SVG}</button>
                <h2 class="cad-title cad-title-inline">${isNew ? "追加" : "編集"}</h2>
                ${!isNew ? `<button class="cad-delete-btn" id="cadDeleteBtn" title="削除">Delete</button>` : ""}
            </div>
            <div class="cad-form-scroll">
                <label class="cad-label">タイプ</label>
                <div class="cad-type-switch">
                    <button class="cad-type-btn ${type === "floor" ? "active" : ""}" data-type="floor">ボックス</button>
                    <button class="cad-type-btn ${type === "object" ? "active" : ""}" data-type="object">シリンダー</button>
                    <button class="cad-type-btn ${type === "slope" ? "active" : ""}" data-type="slope">スロープ</button>
                </div>
                ${fieldRow([["X", "cadX", v("x", 0)], ["Y", "cadY", v("y", 0)], ["Z", "cadZ", v("z", 0)]])}
                ${typeFields}
                <label class="cad-label">色</label>
                <select class="cad-input cad-select" id="cadColor">${colorOpts}</select>
                <div id="cadColorCustomContainer" style="display: ${isCustom ? "flex" : "none"}; gap: 8px; margin-top: 6px;">
                    <input class="cad-input" type="text" id="cadColorCustom"
                        placeholder="例: 0xff0000 or #ff0000"
                        value="${customVal}" style="flex: 1; margin: 0;">
                    <input type="color" id="cadColorPicker" value="${pickerVal}" 
                        style="width: 40px; height: 36px; padding: 0; border: 1px solid #d0d0de; border-radius: 8px; cursor: pointer; background: none; flex-shrink: 0;">
                </div>
                <div class="cad-actions">
                    <button class="cad-save-btn" id="cadSaveBtn">${isNew ? "追加" : "保存"}</button>
                </div>
            </div>`;

        this._attachEvents();
    }

    _attachEvents() {
        this._el.querySelector("#cadBackBtn").addEventListener("click", () => {
            this._stopBlink();
            this._removePreview();
            this.showList();
        });

        this._el.querySelector("#cadDeleteBtn")?.addEventListener("click", () => {
            if (typeof this._editIdx === "number") {
                this._stopBlink();
                this.sm.remove(this._editIdx);
            }
            this.showList();
        });

        this._el.querySelectorAll(".cad-type-btn").forEach(btn =>
            btn.addEventListener("click", () => {
                this._editType = btn.dataset.type;
                const partial = { ...this._readAll(), type: this._editType };
                if (this._editIdx !== "new") {
                    const orig = this.sm.get(this._editIdx);
                    Object.assign(partial, { ...orig, ...partial });
                }
                this._renderForm(partial);
            }));

        const colorSel = this._el.querySelector("#cadColor");
        const colorCustomContainer = this._el.querySelector("#cadColorCustomContainer");
        const colorCustom = this._el.querySelector("#cadColorCustom");
        const colorPicker = this._el.querySelector("#cadColorPicker");

        colorSel.addEventListener("change", () => {
            if (colorSel.value === "__custom") {
                colorCustomContainer.style.display = "flex";
                if (!colorCustom.value) {
                    colorCustom.value = "0xffffff";
                    colorPicker.value = "#ffffff";
                }
            } else {
                colorCustomContainer.style.display = "none";
            }
        });

        // Sync text input edits back to the color picker
        colorCustom.addEventListener("input", () => {
            const raw = colorCustom.value.trim();
            let hex = "";
            if (raw.startsWith("#") && raw.length === 7) {
                hex = raw;
            } else if (raw.startsWith("0x") && raw.length === 8) {
                hex = "#" + raw.slice(2);
            } else if (raw.length === 6 && !isNaN(parseInt(raw, 16))) {
                hex = "#" + raw;
            }
            if (hex && /^#[0-9a-fA-F]{6}$/.test(hex)) {
                colorPicker.value = hex;
            }
        });

        // Sync color picker (including eyedropper tool) changes to text input
        colorPicker.addEventListener("input", () => {
            const hex = colorPicker.value; // format: '#ffffff'
            colorCustom.value = "0x" + hex.slice(1);
            // Dispatch input event to trigger livePreview
            colorCustom.dispatchEvent(new Event("input"));
        });

        this._el.querySelector("#cadSaveBtn").addEventListener("click", () => this._save());

        this._el.querySelectorAll(".cad-input, .cad-select").forEach(input =>
            input.addEventListener("input", () => this._livePreview()));
    }

    _save() {
        const data = this._readAll();
        if (this._editIdx === "new") {
            this._stopBlink();
            if (this._previewIdx !== null) {
                this.sm.update(this._previewIdx, data);
            } else {
                this.sm.addFromData(data);
            }
            this._previewIdx = null;
        } else if (typeof this._editIdx === "number") {
            this._stopBlink();
            this.sm.update(this._editIdx, data);
        }
        this.showList();
    }

    _livePreview() {
        if (this._editIdx === "new") {
            this._syncPreview();
            return;
        }
        if (typeof this._editIdx !== "number") return;
        this._stopBlink();
        this.sm.update(this._editIdx, this._readAll());
        this._startBlink(this._editIdx);
    }
}
