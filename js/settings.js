import settingsTemplate from "../html/settings.html";

import { createFocusTrap } from "focus-trap";
import { createPopper, Instance as Popper } from "@popperjs/core";
import { TinyEmitter as Emitter } from "tiny-emitter";

class SettingsWindow {
  constructor(rootEl, initialSettings) {
    this.settingsEl = document.createElement("div");
    this.settingsEl.className = "settings-window";
    this.settingsEl.innerHTML = settingsTemplate;
    this.settingsEl.style.display = "none";
    rootEl.appendChild(this.settingsEl);

    this.enableUpdate = initialSettings.enableUpdate;
    this.enableClearOnUpdate = initialSettings.enableUpdate;
    this.updateFrequency = initialSettings.updateFrequency;
    this.gridWidth = initialSettings.gridWidth;
    this.gridHeight = initialSettings.gridHeight;

    const updateCheckboxEl = this.settingsEl.querySelector("[data-update-checkbox]");
    const clearOnUpdateCheckboxEl = this.settingsEl.querySelector("[data-clear-on-update-checkbox]");
    const updateFrequencyInputEl = this.settingsEl.querySelector("[data-update-frequency-input]");
    const gridWidthInputEl = this.settingsEl.querySelector("[data-grid-width-input]");
    const gridHeightInputEl = this.settingsEl.querySelector("[data-grid-height-input]");

    updateCheckboxEl.checked = this.enableUpdate;
    updateCheckboxEl.addEventListener("change", e => {
      this.enableUpdate = updateCheckboxEl.checked;
      this.events.emit("change");
    });

    clearOnUpdateCheckboxEl.checked = this.enableClearOnUpdate;
    clearOnUpdateCheckboxEl.addEventListener("change", e => {
      this.enableClearOnUpdate = clearOnUpdateCheckboxEl.checked;
      this.events.emit("change");
    });

    updateFrequencyInputEl.value = this.updateFrequency;
    updateFrequencyInputEl.addEventListener("change", e => {
      this.updateFrequency = updateFrequencyInputEl.value;
      this.events.emit("change");
    });

    gridWidthInputEl.value = this.gridWidth;
    gridWidthInputEl.addEventListener("change", e => {
      this.gridWidth = gridWidthInputEl.value;
      this.events.emit("change");
    });

    gridHeightInputEl.value = this.gridHeight;
    gridHeightInputEl.addEventListener("change", e => {
      this.gridHeight = gridHeightInputEl.value;
      this.events.emit("change");
    });

    this.visible = false;
    this.events = new Emitter();
    this.focusTrap = createFocusTrap(this.settingsEl, { clickOutsideDeactivates: true });
    this.popper = null;

    this.onDocumentClick = this.onDocumentClick.bind(this);
    this.onDocumentKeydown = this.onDocumentKeydown.bind(this);
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
