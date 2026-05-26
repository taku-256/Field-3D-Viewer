import { encodeSceneToHash } from "./scene-serializer.js";

const SHARE_SVG = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="15" cy="4" r="2.5" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="15" cy="16" r="2.5" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="5" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/>
    <line x1="7.2" y1="8.9" x2="12.8" y2="5.1" stroke="currentColor" stroke-width="1.5"/>
    <line x1="7.2" y1="11.1" x2="12.8" y2="14.9" stroke="currentColor" stroke-width="1.5"/>
</svg>`;

export class ShareDialog {
    constructor(sceneManager) {
        this.sm = sceneManager;
        this._overlay = null;
        this._createButton();
    }

    _createButton() {
        const btn = document.createElement("button");
        btn.id = "shareBtn";
        btn.className = "share-btn";
        btn.title = "共有";
        btn.innerHTML = SHARE_SVG;
        btn.addEventListener("click", () => this.open());
        document.body.appendChild(btn);
    }

    _buildUrl() {
        const objects = this.sm.exportScene().objects;
        const hash = encodeSceneToHash(objects);
        return location.origin + location.pathname + "#" + hash;
    }

    open() {
        if (this._overlay) return;

        const url = this._buildUrl();

        const overlay = document.createElement("div");
        overlay.className = "share-overlay";

        const dialog = document.createElement("div");
        dialog.className = "share-dialog";

        dialog.innerHTML = `
            <div class="share-header">
                <h3 class="share-title">共有</h3>
                <button class="share-close-btn" id="shareCloseBtn" title="閉じる">&times;</button>
            </div>
            <div class="share-qr" id="shareQrContainer"></div>
            <div class="share-url-row">
                <input class="share-url-input" id="shareUrlInput" type="text" readonly value="${url}">
                <button class="share-copy-btn" id="shareCopyBtn">コピー</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        this._overlay = overlay;

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) this.close();
        });
        dialog.querySelector("#shareCloseBtn").addEventListener("click", () => this.close());
        dialog.querySelector("#shareCopyBtn").addEventListener("click", () => this._copy(url));

        document.addEventListener("keydown", this._escHandler = (e) => {
            if (e.key === "Escape") this.close();
        });

        this._renderQr(url, dialog.querySelector("#shareQrContainer"));
    }

    close() {
        if (!this._overlay) return;
        this._overlay.remove();
        this._overlay = null;
        if (this._escHandler) {
            document.removeEventListener("keydown", this._escHandler);
            this._escHandler = null;
        }
    }

    async _copy(url) {
        const btn = this._overlay?.querySelector("#shareCopyBtn");
        try {
            await navigator.clipboard.writeText(url);
            if (btn) {
                btn.textContent = "✓ コピー済み";
                setTimeout(() => { btn.textContent = "コピー"; }, 2000);
            }
        } catch (err) {
            console.error("Clipboard write failed:", err);
        }
    }

    _renderQr(url, container) {
        if (typeof QRCode === "undefined") {
            container.textContent = "QRCode library not loaded";
            return;
        }
        container.innerHTML = "";
        new QRCode(container, {
            text: url,
            width: 200,
            height: 200,
            correctLevel: QRCode.CorrectLevel.M,
        });
    }
}
