import settingsTemplate from "../html/settings.html";

import Clipboard from "clipboard";
import { createFocusTrap } from "focus-trap";
import { createPopper, Instance as Popper } from "@popperjs/core";
import { TinyEmitter as Emitter } from "tiny-emitter";

class SettingsWindow {
  constructor(rootEl, options) {
    this.settingsEl = document.createElement("div");
    this.settingsEl.className = "settings-window";
    this.settingsEl.innerHTML = settingsTemplate;
    this.settingsEl.style.display = "none";
    rootEl.appendChild(this.settingsEl);

    this._enableUpdate = options.enableUpdate;
    this._enableClearOnUpdate = options.enableUpdate;
    this._updateFrequency = options.updateFrequency;
    this._gridWidth = options.gridWidth;
    this._gridHeight = options.gridHeight;

    this.updateCheckboxEl = this.settingsEl.querySelector("[data-update-checkbox]");
    this.clearOnUpdateCheckboxEl = this.settingsEl.querySelector("[data-clear-on-update-checkbox]");
    this.updateFrequencyInputEl = this.settingsEl.querySelector("[data-update-frequency-input]");
    this.gridWidthInputEl = this.settingsEl.querySelector("[data-grid-width-input]");
    this.gridHeightInputEl = this.settingsEl.querySelector("[data-grid-height-input]");

    this.updateCheckboxEl.checked = this._enableUpdate;
    this.updateCheckboxEl.addEventListener("change", e => {
      this._enableUpdate = this.updateCheckboxEl.checked;
    });

    this.clearOnUpdateCheckboxEl.checked = this._enableClearOnUpdate;
    this.clearOnUpdateCheckboxEl.addEventListener("change", e => {
      this._enableClearOnUpdate = this.clearOnUpdateCheckboxEl.checked;
    });

    this.updateFrequencyInputEl.value = this._updateFrequency;
    this.updateFrequencyInputEl.addEventListener("change", e => {
      this._updateFrequency = this.updateFrequencyInputEl.value;
    });

    this.gridWidthInputEl.value = this._gridWidth;
    this.gridWidthInputEl.addEventListener("change", e => {
      this._gridWidth = this.gridWidthInputEl.value;
    });

    this.gridHeightInputEl.value = this._gridHeight;
    this.gridHeightInputEl.addEventListener("change", e => {
      this._gridHeight = this.gridHeightInputEl.value;
    });

    const shareButtonEl = this.settingsEl.querySelector("[data-share-button]");
    this.clipboard = new Clipboard(shareButtonEl, {
      container: this.settingsEl,
      text: options.shareContent
    });

    this.visible = false;
    this.events = new Emitter();
    this.focusTrap = createFocusTrap(this.settingsEl, { clickOutsideDeactivates: true });
    this.popper = null;

    this.onDocumentClick = this.onDocumentClick.bind(this);
    this.onDocumentKeydown = this.onDocumentKeydown.bind(this);
  }

  get enableUpdate() {
    return this._enableUpdate;
  }

  set enableUpdate(v) {
    this._enableUpdate = v;
    this.updateCheckboxEl.checked = v;
  }

  get enableClearOnUpdate() {
    return this._enableClearOnUpdate;
  }

  set enableClearOnUpdate(v) {
    this._enableClearOnUpdate = v;
    this.clearOnUpdateCheckboxEl.checked = v;
  }

  get updateFrequency() {
    return this._updateFrequency;
  }

  set updateFrequency(v) {
    this._updateFrequency = v;
    this.updateFrequencyInputEl.value = v;
  }

  get gridWidth() {
    return this._gridWidth;
  }

  set gridWidth(v) {
    this._gridWidth = v;
    this.gridWidthInputEl.value = v;
  }

  get gridHeight() {
    return this._gridHeight;
  }

  set gridHeight(v) {
    this._gridHeight = v;
    this.gridHeightInputEl.value = v;
  }

  toggle(referenceEl) {
    this.visible ? this.hide() : this.show(referenceEl);
  }

  show(referenceEl) {
    this.settingsEl.style.display = "block";
    this.visible = true;
    this.focusTrap.activate();
    this.popper = createPopper(referenceEl, this.settingsEl, {
      placement: "bottom-end"
    });

    setTimeout(() => {
      document.addEventListener("click", this.onDocumentClick);
      document.addEventListener("keydown", this.onDocumentKeydown);
    });
  }

  hide() {
    this.settingsEl.style.display = "none";
    this.visible = false;
    this.focusTrap.deactivate();
    if (this.popper != null) {
      this.popper.destroy();
      this.popper = null;
    }
    this.events.emit("hidden");

    document.removeEventListener("click", this.onDocumentClick);
    document.removeEventListener("keydown", this.onDocumentKeydown);
  }

  on(event, callback) {
    this.events.on(event, callback);
  }

  off(event, callback) {
    this.events.off(event, callback);
  }

  onDocumentClick(e) {
    if (!this.settingsEl.contains(e.target)) {
      this.hide();
    }
  }

  onDocumentKeydown(e) {
    if (e.key === "Escape") {
      this.hide();
    }
  }
}

export { SettingsWindow };
