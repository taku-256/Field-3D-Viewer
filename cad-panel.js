import { PRESET_COLORS } from "./scene-manager.js";

export class CadPanel {
    constructor(sceneManager) {
        this.sm = sceneManager;
        this._editingIndex = null;
        this._editingType = "floor";
        this._blinkMesh = null;
        this._blinkTime = 0;
        this._previewIndex = null;

        this._container = document.querySelector("#cadPanel .panelContent");
        this._buildStyles();
        this.showList();
    }

    tick(dt = 1 / 60) {
        if (!this._blinkMesh) return;
        this._blinkTime += dt;
        const opacity = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(this._blinkTime * 6));
        this._blinkMesh.material.opacity = opacity;
        this._blinkMesh.material.transparent = true;
    }

    _startBlink(index) {
        this._stopBlink();
        const entry = this.sm._entries[index];
        if (!entry) return;
        this._blinkMesh = entry.mesh;
        this._blinkMesh.material.transparent = true;
        this._blinkMesh.material.needsUpdate = true;
        this._blinkTime = 0;
    }

    _stopBlink() {
        if (this._blinkMesh) {
            this._blinkMesh.material.opacity = 1;
            this._blinkMesh.material.transparent = false;
            this._blinkMesh.material.needsUpdate = true;
            this._blinkMesh = null;
        }
    }

    _resolveColorForCSS(color) {
        if (typeof color === "string") {
            const preset = PRESET_COLORS[color];
            if (preset !== undefined) {
                const hex = typeof preset === "number" ? preset : Number(preset);
                return `#${hex.toString(16).padStart(6, "0")}`;
            }
            if (color.startsWith("#")) return color;
            if (color.startsWith("0x")) return `#${color.slice(2).padStart(6, "0")}`;
            return "#ffffff";
        }
        if (typeof color === "number") {
            return `#${color.toString(16).padStart(6, "0")}`;
        }
        return "#ffffff";
    }

    showList() {
        this._stopBlink();
        this._removePreview();
        this._editingIndex = null;
        const entries = this.sm.getAll();

        let html = `<h2 class="cad-title">Objects List</h2>`;
        html += `<div class="cad-list-scroll">`;

        if (entries.length != 0) {
            for (const entry of entries) {
                const d = entry.data;
                const resolvedColor = this._resolveColorForCSS(d.color);
                const label = d.type === "floor"
                    ? `Floor (${d.x}, ${d.y}) ${d.width}×${d.height}`
                    : `Object (${d.x}, ${d.y}) r=${d.bottomRadius}`;
                const colorName = typeof d.color === "string" ? d.color : `#${d.color.toString(16).padStart(6, "0")}`;
                html += `
                    <button class="cad-list-item" data-index="${entry.index}">
                        <span class="cad-item-icon"><span class="cad-color-dot" style="background:${resolvedColor}"></span></span>
                        <span class="cad-item-info">
                            <span class="cad-item-label">${label}</span>
                            <span class="cad-item-sub">z=${d.z}, color=${colorName}</span>
                        </span>
                        <span class="cad-item-arrow">›</span>
                    </button>`;
            }
        }
        html += `</div>`;

        html += `<button class="cad-fab" id="cadAddBtn" title="追加">+</button>`;

        this._container.innerHTML = html;

        this._container.querySelectorAll(".cad-list-item").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.dataset.index, 10);
                this.showEdit(idx);
            });
        });

        const addBtn = this._container.querySelector("#cadAddBtn");
        if (addBtn) {
            addBtn.addEventListener("click", () => this.showAdd());
        }
    }

    showAdd() {
        this._editingIndex = "new";
        this._editingType = "floor";
        this._renderEditForm(null);
        this._createOrUpdatePreview();
    }

    showEdit(index) {
        this._editingIndex = index;
        const data = this.sm.get(index);
        if (!data) { this.showList(); return; }
        this._editingType = data.type;
        this._startBlink(index);
        this._renderEditForm(data);
    }

    _renderEditForm(data) {
        const isNew = this._editingIndex === "new";
        const type = data ? data.type : this._editingType;

        const colorOptions = Object.keys(PRESET_COLORS)
            .map(name => `<option value="${name}" ${data && data.color === name ? "selected" : ""}>${name}</option>`)
            .join("");

        let html = `
            <div class="cad-edit-header">
                <button class="cad-back-btn" id="cadBackBtn" title="戻る">
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <path d="M14 4L7 11L14 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <h2 class="cad-title cad-title-inline">${isNew ? "追加" : "編集"}</h2>
                ${!isNew ? `<button class="cad-delete-btn" id="cadDeleteBtn" title="削除">Delete</button>` : ""}
            </div>

            <div class="cad-form-scroll">
                <label class="cad-label">タイプ</label>
                <div class="cad-type-switch">
                    <button class="cad-type-btn ${type === "floor" ? "active" : ""}" data-type="floor">Floor</button>
                    <button class="cad-type-btn ${type === "object" ? "active" : ""}" data-type="object">Object</button>
                </div>

                <div class="cad-field-row">
                    <div class="cad-field">
                        <label class="cad-label">X</label>
                        <input class="cad-input" type="number" id="cadX" value="${data ? data.x : 0}">
                    </div>
                    <div class="cad-field">
                        <label class="cad-label">Y</label>
                        <input class="cad-input" type="number" id="cadY" value="${data ? data.y : 0}">
                    </div>
                    <div class="cad-field">
                        <label class="cad-label">Z</label>
                        <input class="cad-input" type="number" id="cadZ" value="${data ? data.z : 0}">
                    </div>
                </div>

                ${type === "floor" ? this._floorFields(data) : this._objectFields(data)}

                <label class="cad-label">色</label>
                <select class="cad-input cad-select" id="cadColor">
                    ${colorOptions}
                    <option value="__custom" ${data && typeof data.color === "number" ? "selected" : ""}>カスタム...</option>
                </select>
                <input class="cad-input cad-color-custom" type="text" id="cadColorCustom"
                    placeholder="例: 0xff0000 or #ff0000"
                    value="${data && typeof data.color === "number" ? "0x" + data.color.toString(16).padStart(6, "0") : ""}"
                    style="display: ${data && typeof data.color === "number" ? "block" : "none"}">

                <div class="cad-actions">
                    <button class="cad-save-btn" id="cadSaveBtn">${isNew ? "追加" : "保存"}</button>
                </div>
            </div>`;

        this._container.innerHTML = html;
        this._attachEditEvents();
    }

    _floorFields(data) {
        return `
            <div class="cad-field-row">
                <div class="cad-field">
                    <label class="cad-label">幅 (Width)</label>
                    <input class="cad-input" type="number" id="cadWidth" value="${data ? data.width : 1000}">
                </div>
                <div class="cad-field">
                    <label class="cad-label">奥行 (Height)</label>
                    <input class="cad-input" type="number" id="cadHeight" value="${data ? data.height : 1000}">
                </div>
            </div>
            <div class="cad-field-row">
                <div class="cad-field">
                    <label class="cad-label">高さ (Tall)</label>
                    <input class="cad-input" type="number" id="cadTall" value="${data && data.tall !== undefined ? data.tall : ""}">
                </div>
            </div>`;
    }

    _objectFields(data) {
        return `
            <div class="cad-field-row">
                <div class="cad-field">
                    <label class="cad-label">下半径</label>
                    <input class="cad-input" type="number" id="cadBottomRadius" value="${data ? data.bottomRadius : 100}">
                </div>
                <div class="cad-field">
                    <label class="cad-label">上半径</label>
                    <input class="cad-input" type="number" id="cadTopRadius" value="${data && data.topRadius !== undefined ? data.topRadius : ""}">
                </div>
            </div>
            <div class="cad-field-row">
                <div class="cad-field">
                    <label class="cad-label">高さ (Tall)</label>
                    <input class="cad-input" type="number" id="cadTall" value="${data ? data.tall : 100}">
                </div>
            </div>`;
    }

    _attachEditEvents() {
        this._container.querySelector("#cadBackBtn")
            .addEventListener("click", () => {
                this._stopBlink();
                this._removePreview();
                this.showList();
            });

        const delBtn = this._container.querySelector("#cadDeleteBtn");
        if (delBtn) {
            delBtn.addEventListener("click", () => {
                if (typeof this._editingIndex === "number") {
                    this._stopBlink();
                    this.sm.remove(this._editingIndex);
                }
                this.showList();
            });
        }

        this._container.querySelectorAll(".cad-type-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                this._editingType = btn.dataset.type;
                const partialData = this._readCommonFields();
                partialData.type = this._editingType;
                if (this._editingIndex === "new") {
                    this._renderEditForm(partialData);
                } else {
                    const orig = this.sm.get(this._editingIndex);
                    this._renderEditForm({ ...orig, ...partialData, type: this._editingType });
                }
            });
        });

        const colorSelect = this._container.querySelector("#cadColor");
        const colorCustom = this._container.querySelector("#cadColorCustom");
        colorSelect.addEventListener("change", () => {
            colorCustom.style.display = colorSelect.value === "__custom" ? "block" : "none";
        });

        this._container.querySelector("#cadSaveBtn").addEventListener("click", () => this._handleSave());

        const inputs = this._container.querySelectorAll(".cad-input, .cad-select");
        inputs.forEach(input => {
            input.addEventListener("input", () => this._handleLivePreview());
        });
    }

    _readCommonFields() {
        const get = (id) => {
            const el = this._container.querySelector(`#${id}`);
            return el ? el.value : undefined;
        };
        return {
            x: parseFloat(get("cadX")) || 0,
            y: parseFloat(get("cadY")) || 0,
            z: parseFloat(get("cadZ")) || 0,
        };
    }

    _readAllFields() {
        const get = (id) => {
            const el = this._container.querySelector(`#${id}`);
            return el ? el.value : undefined;
        };
        const common = this._readCommonFields();
        const colorSelect = get("cadColor");
        let color;
        if (colorSelect === "__custom") {
            const raw = get("cadColorCustom") || "0xffffff";
            color = raw.startsWith("#")
                ? parseInt(raw.slice(1), 16)
                : Number(raw);
        } else {
            color = colorSelect;
        }

        if (this._editingType === "floor") {
            const data = {
                type: "floor",
                ...common,
                width: parseFloat(get("cadWidth")) || 1000,
                height: parseFloat(get("cadHeight")) || 1000,
                color,
            };
            const tall = get("cadTall");
            if (tall !== undefined && tall !== "") {
                data.tall = parseFloat(tall);
            }
            return data;
        } else {
            const data = {
                type: "object",
                ...common,
                bottomRadius: parseFloat(get("cadBottomRadius")) || 100,
                tall: parseFloat(get("cadTall")) || 100,
                color,
            };
            const topR = get("cadTopRadius");
            if (topR !== undefined && topR !== "") {
                data.topRadius = parseFloat(topR);
            }
            return data;
        }
    }

    _handleSave() {
        const data = this._readAllFields();

        if (this._editingIndex === "new") {
            this._stopBlink();
            if (this._previewIndex !== null) {
                this.sm.update(this._previewIndex, data);
            } else {
                if (data.type === "floor") {
                    this.sm.addFloor(data.x, data.y, data.z, data.width, data.height, data.color, data.tall);
                } else {
                    this.sm.addObject(data.x, data.y, data.z, data.bottomRadius, data.tall, data.color, data.topRadius);
                }
            }
            this._previewIndex = null;
            this.showList();
        } else if (typeof this._editingIndex === "number") {
            this._stopBlink();
            this.sm.update(this._editingIndex, data);
            this.showList();
        }
    }

    _handleLivePreview() {
        if (this._editingIndex === "new") {
            this._createOrUpdatePreview();
            return;
        }
        if (typeof this._editingIndex !== "number") return;
        const data = this._readAllFields();
        this._stopBlink();
        this.sm.update(this._editingIndex, data);
        this._startBlink(this._editingIndex);
    }

    _createOrUpdatePreview() {
        const data = this._readAllFields();
        this._stopBlink();

        if (this._previewIndex !== null) {
            this.sm.update(this._previewIndex, data);
        } else {
            let idx;
            if (data.type === "floor") {
                idx = this.sm.addFloor(data.x, data.y, data.z, data.width, data.height, data.color, data.tall);
            } else {
                idx = this.sm.addObject(data.x, data.y, data.z, data.bottomRadius, data.tall, data.color, data.topRadius);
            }
            this._previewIndex = idx;
        }
        this._startBlink(this._previewIndex);
    }

    _removePreview() {
        if (this._previewIndex !== null) {
            this.sm.remove(this._previewIndex);
            this._previewIndex = null;
        }
    }

    _buildStyles() {
        if (document.querySelector("#cadPanelStyles")) return;
        const style = document.createElement("style");
        style.id = "cadPanelStyles";
        style.textContent = `
            .cad-title {
                margin: 0 0 12px 0;
                font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
                font-size: 18px;
                font-weight: 700;
                color: #1a1a2e;
                letter-spacing: 0.02em;
            }
            .cad-title-inline {
                margin: 0;
                flex: 1;
            }

            /* -- List -- */
            .cad-list-scroll {
                overflow-y: auto;
                max-height: calc(100vh - 280px);
                padding-right: 4px;
            }
            .cad-list-scroll::-webkit-scrollbar {
                width: 6px;
            }
            .cad-list-scroll::-webkit-scrollbar-thumb {
                background: rgba(0,0,0,0.18);
                border-radius: 3px;
            }

            .cad-list-item {
                display: flex;
                align-items: center;
                width: 100%;
                background: #f6f6fa;
                border: 1px solid #e0e0e8;
                border-radius: 10px;
                padding: 12px 14px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: all 0.18s ease;
                font-family: 'Inter', 'Segoe UI', sans-serif;
                font-size: 13px;
                text-align: left;
                outline: none;
            }
            .cad-list-item:hover {
                background: #eeeef6;
                border-color: #c0c0d8;
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(26,26,46,0.08);
            }
            .cad-list-item:active {
                transform: translateY(0);
            }
            .cad-item-icon {
                font-size: 18px;
                margin-right: 12px;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .cad-color-dot {
                display: inline-block;
                width: 22px;
                height: 22px;
                border-radius: 6px;
                border: 2px solid rgba(0,0,0,0.12);
                box-shadow: 0 1px 3px rgba(0,0,0,0.10);
            }
            .cad-item-info {
                display: flex;
                flex-direction: column;
                flex: 1;
                min-width: 0;
            }
            .cad-item-label {
                font-weight: 600;
                color: #1a1a2e;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .cad-item-sub {
                font-size: 11px;
                color: #777;
                margin-top: 2px;
            }
            .cad-item-arrow {
                font-size: 22px;
                color: #bbb;
                margin-left: 8px;
                flex-shrink: 0;
            }

            /* -- FAB (floating + button) -- */
            .cad-fab {
                position: absolute;
                bottom: 28px;
                right: 28px;
                width: 52px;
                height: 52px;
                border-radius: 50%;
                border: none;
                background: linear-gradient(135deg, #6366f1, #818cf8);
                color: #fff;
                font-size: 26px;
                font-weight: 300;
                cursor: pointer;
                box-shadow: 0 4px 16px rgba(99,102,241,0.35);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                z-index: 15;
                line-height: 1;
            }
            .cad-fab:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 24px rgba(99,102,241,0.45);
            }
            .cad-fab:active {
                transform: scale(0.96);
            }

            /* -- Edit header -- */
            .cad-edit-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 16px;
            }
            .cad-back-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                border: none;
                border-radius: 8px;
                background: #f0f0f6;
                color: #1a1a2e;
                cursor: pointer;
                transition: background 0.15s;
                flex-shrink: 0;
            }
            .cad-back-btn:hover {
                background: #dddde8;
            }
            .cad-delete-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 8px;
                background: #fde8e8;
                color: #c53030;
                font-family: 'Inter', 'Segoe UI', sans-serif;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.15s;
                flex-shrink: 0;
                margin-left: auto;
            }
            .cad-delete-btn:hover {
                background: #fcc;
            }

            /* -- Form -- */
            .cad-form-scroll {
                overflow-y: auto;
                max-height: calc(100vh - 300px);
                padding-right: 4px;
            }
            .cad-form-scroll::-webkit-scrollbar {
                width: 6px;
            }
            .cad-form-scroll::-webkit-scrollbar-thumb {
                background: rgba(0,0,0,0.15);
                border-radius: 3px;
            }

            .cad-label {
                display: block;
                font-family: 'Inter', 'Segoe UI', sans-serif;
                font-size: 11px;
                font-weight: 600;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                margin-bottom: 4px;
                margin-top: 12px;
            }
            .cad-label:first-child {
                margin-top: 0;
            }

            .cad-type-switch {
                display: flex;
                gap: 0;
                border: 1px solid #d0d0de;
                border-radius: 8px;
                overflow: hidden;
                margin-bottom: 8px;
            }
            .cad-type-btn {
                flex: 1;
                padding: 8px 0;
                border: none;
                background: #f6f6fa;
                font-family: 'Inter', sans-serif;
                font-size: 13px;
                font-weight: 600;
                color: #555;
                cursor: pointer;
                transition: all 0.15s;
            }
            .cad-type-btn.active {
                background: #6366f1;
                color: #fff;
            }
            .cad-type-btn:hover:not(.active) {
                background: #eeeef6;
            }

            .cad-field-row {
                display: flex;
                gap: 10px;
                margin-bottom: 4px;
            }
            .cad-field {
                flex: 1;
            }

            .cad-input {
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #d0d0de;
                border-radius: 8px;
                font-family: 'Inter', 'Segoe UI', monospace;
                font-size: 13px;
                color: #1a1a2e;
                background: #fafafe;
                outline: none;
                transition: border-color 0.15s, box-shadow 0.15s;
                box-sizing: border-box;
            }
            .cad-input:focus {
                border-color: #6366f1;
                box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
            }

            .cad-select {
                appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23999' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 10px center;
                padding-right: 28px;
                cursor: pointer;
            }

            .cad-color-custom {
                margin-top: 6px;
            }

            .cad-actions {
                margin-top: 20px;
                display: flex;
                gap: 10px;
            }
            .cad-save-btn {
                flex: 1;
                padding: 10px 0;
                border: none;
                border-radius: 10px;
                background: linear-gradient(135deg, #6366f1, #818cf8);
                color: #fff;
                font-family: 'Inter', 'Segoe UI', sans-serif;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 2px 10px rgba(99,102,241,0.25);
            }
            .cad-save-btn:hover {
                box-shadow: 0 4px 16px rgba(99,102,241,0.4);
                transform: translateY(-1px);
            }
            .cad-save-btn:active {
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);
    }
}
