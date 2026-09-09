(() => {
  // src/core/scheduler.js
  function createScheduler(host = window) {
    let disposed = false;
    const timeouts = /* @__PURE__ */ new Set();
    const frames = /* @__PURE__ */ new Set();
    const cleanups = /* @__PURE__ */ new Set();
    const controller = new AbortController();
    function cleanup(callback) {
      if (disposed) callback();
      else cleanups.add(callback);
      return () => cleanups.delete(callback);
    }
    function timeout(callback, delay = 0) {
      if (disposed) return 0;
      const handle = host.setTimeout(() => {
        timeouts.delete(handle);
        if (!disposed) callback();
      }, delay);
      timeouts.add(handle);
      return handle;
    }
    function clearTimeout(handle) {
      host.clearTimeout(handle);
      timeouts.delete(handle);
    }
    function frame(callback) {
      if (disposed) return 0;
      const handle = host.requestAnimationFrame((time) => {
        frames.delete(handle);
        if (!disposed) callback(time);
      });
      frames.add(handle);
      return handle;
    }
    function cancelFrame(handle) {
      host.cancelAnimationFrame(handle);
      frames.delete(handle);
    }
    function listen(target, name, callback, options = {}) {
      if (disposed) return () => {
      };
      target.addEventListener(name, callback, { ...options, signal: controller.signal });
      return () => target.removeEventListener(name, callback, options);
    }
    function observer(Constructor, callback) {
      const instance = new Constructor((...args) => {
        if (!disposed) callback(...args);
      });
      const disconnect = instance.disconnect.bind(instance);
      const release = cleanup(disconnect);
      instance.disconnect = () => {
        disconnect();
        release();
      };
      return instance;
    }
    function destroy() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      timeouts.forEach((handle) => host.clearTimeout(handle));
      frames.forEach((handle) => host.cancelAnimationFrame(handle));
      timeouts.clear();
      frames.clear();
      for (const callback of cleanups) {
        try {
          callback();
        } catch (error) {
          console.error("[QADDONS cleanup]", error);
        }
      }
      cleanups.clear();
    }
    return {
      timeout,
      clearTimeout,
      frame,
      cancelFrame,
      listen,
      observer,
      cleanup,
      destroy,
      signal: controller.signal,
      get disposed() {
        return disposed;
      }
    };
  }

  // src/core/events.js
  function createEvents() {
    const listeners = /* @__PURE__ */ new Map();
    function on(name, callback) {
      if (!listeners.has(name)) listeners.set(name, /* @__PURE__ */ new Set());
      listeners.get(name).add(callback);
      return () => {
        const group = listeners.get(name);
        group?.delete(callback);
        if (!group?.size) listeners.delete(name);
      };
    }
    function emit(name, payload) {
      for (const callback of [...listeners.get(name) || []]) {
        if (!listeners.get(name)?.has(callback)) continue;
        try {
          callback(payload);
        } catch (error) {
          console.error(`[QADDONS: ${name}]`, error);
        }
      }
    }
    function scope(scheduler2) {
      return {
        on(name, callback) {
          if (scheduler2.disposed) return () => {
          };
          const unsubscribe = on(name, callback);
          scheduler2.cleanup(unsubscribe);
          return unsubscribe;
        },
        emit
      };
    }
    return { on, emit, scope, destroy: () => listeners.clear() };
  }

  // src/core/styles.js
  function createStyles(document2) {
    const namespaces = /* @__PURE__ */ new Map();
    function scope(namespace) {
      if (namespaces.has(namespace)) return namespaces.get(namespace);
      const entries = /* @__PURE__ */ new Map();
      const api = {
        set(id, css) {
          let element = entries.get(id);
          if (!element) {
            element = document2.createElement("style");
            element.dataset.mtkStyle = `${namespace}:${id}`;
            entries.set(id, element);
            (document2.head || document2.documentElement).appendChild(element);
          }
          if (element.textContent !== css) element.textContent = css;
          return element;
        },
        remove(id) {
          entries.get(id)?.remove();
          entries.delete(id);
        },
        clear() {
          entries.forEach((element) => element.remove());
          entries.clear();
        }
      };
      namespaces.set(namespace, api);
      return api;
    }
    return {
      scope,
      destroy() {
        namespaces.forEach((namespace) => namespace.clear());
        namespaces.clear();
      }
    };
  }

  // src/core/settings.js
  var STORAGE_KEY = "margonem_toolkit_settings";
  var SCHEMA_VERSION = 1;
  var SCHEMA_MIGRATIONS = /* @__PURE__ */ new Map();
  function migrateSchema(data, target = SCHEMA_VERSION, migrations = SCHEMA_MIGRATIONS) {
    let current = structuredClone(data);
    if (!Number.isInteger(current.version) || current.version > target || current.version < 1) {
      throw new Error("Nieobsługiwana wersja ustawień QADDONS");
    }
    while (current.version < target) {
      const migrate = migrations.get(current.version);
      if (!migrate) throw new Error(`Brak migracji schema ${current.version} -> ${current.version + 1}`);
      const next = migrate(structuredClone(current));
      if (next.version !== current.version + 1) throw new Error("Niepoprawny krok migracji");
      current = next;
    }
    return current;
  }
  function createSettings(storage, importLegacy2 = () => null) {
    const raw = storage.getItem(STORAGE_KEY);
    const initial = raw === null ? importLegacy2(storage) || { version: 1, core: {}, addons: {} } : JSON.parse(raw);
    const data = migrateSchema(initial);
    if (!data.core || typeof data.core !== "object" || !data.addons || typeof data.addons !== "object") {
      throw new Error("Niepoprawna struktura ustawień QADDONS");
    }
    data.core = { panelX: 70, panelY: 55, lastView: "addons", ...data.core };
    function save() {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error("[QADDONS storage]", error);
      }
    }
    function addon(definition) {
      const stored = data.addons[definition.id];
      const entry = {
        enabled: typeof stored?.enabled === "boolean" ? stored.enabled : Boolean(definition.defaultEnabled),
        settings: { ...structuredClone(definition.defaults || {}), ...stored?.settings }
      };
      data.addons[definition.id] = entry;
      return entry;
    }
    save();
    return {
      data,
      save,
      addon,
      updateCore(patch) {
        Object.assign(data.core, patch);
        save();
      }
    };
  }

  // src/addons/legendary-notificator/migration.js
  function migrateLayerSettings(raw, fromLegacy = false) {
    const migrated = {
      ...raw || {}
    };
    const legacyMap = [
      ["neonLayer1Strength", "shacalGlow1"],
      ["neonLayer1Opacity", "shacalOpacity1"],
      ["neonLayer1Width", "shacalWidth1"],
      ["neonLayer2Strength", "shacalGlow2"],
      ["neonLayer2Opacity", "shacalOpacity2"],
      ["neonLayer2Width", "shacalWidth2"],
      ["neonLayer3Strength", "shacalGlow3"],
      ["neonLayer3Opacity", "shacalOpacity3"],
      ["neonLayer3Width", "shacalWidth3"]
    ];
    for (const [nextKey, oldKey] of legacyMap) {
      if (migrated[nextKey] === void 0 && migrated[oldKey] !== void 0) {
        migrated[nextKey] = migrated[oldKey];
      }
      delete migrated[oldKey];
    }
    [
      "neonEngineMode",
      "neonLayer1Power",
      "neonLayer2Power",
      "neonLayer3Power",
      "neonCoreBlur",
      "neonNearBlur",
      "neonNearSpread",
      "neonMediumBlur",
      "neonMediumSpread",
      "neonFarBlur",
      "neonFarSpread",
      "neonBloomPower",
      "neonBloomBlur",
      "neonBloomSpread"
    ].forEach((key) => delete migrated[key]);
    if (fromLegacy) {
      migrated.neonInside = false;
      migrated.neonOutside = true;
      migrated.uiGameFrame = false;
      if (migrated.canvasPadding === void 0 || Number(migrated.canvasPadding) === 0) {
        migrated.canvasPadding = -8;
      }
    }
    return migrated;
  }

  // src/core/legacy-migration.js
  var LEGACY_STORAGE_KEYS = [
    "legendary_notificator_v595_settings",
    "legendary_notificator_v594_settings",
    "legendary_notificator_v593_settings",
    "legendary_notificator_v580_settings",
    "legendary_notificator_v572_settings",
    "legendary_notificator_v571_settings",
    "legendary_notificator_v570_settings"
  ];
  function readObject(storage, key) {
    try {
      const value = JSON.parse(storage.getItem(key));
      return value && typeof value === "object" && !Array.isArray(value) ? value : null;
    } catch {
      return null;
    }
  }
  function importLegacy(storage) {
    const core = {};
    const panel2 = readObject(storage, "legendary_notificator_v580_panel_pos");
    const button = readObject(storage, "legendary_notificator_v580_button_pos");
    if (Number.isFinite(panel2?.x)) core.panelX = panel2.x;
    if (Number.isFinite(panel2?.y)) core.panelY = panel2.y;
    if (Number.isFinite(button?.right)) core.buttonRight = button.right;
    if (Number.isFinite(button?.top)) core.buttonTop = button.top;
    core.legendaryTab = storage.getItem("legendary_notificator_panel_tab") || "general";
    const addons = {};
    for (const [index, key] of LEGACY_STORAGE_KEYS.entries()) {
      const raw = readObject(storage, key);
      if (!raw) continue;
      const migrated = migrateLayerSettings(raw, index > 0);
      if (index > 0) migrated.multiLayerEnabled = true;
      const { enabled, notificationBottomEnabled, notificationBottomOffset, ...settings } = migrated;
      const bottom = Number(notificationBottomOffset ?? 75);
      addons["legendary-notificator"] = { enabled: enabled !== false, settings };
      addons["notification-position"] = {
        enabled: Boolean(notificationBottomEnabled),
        settings: { bottom: Number.isFinite(bottom) ? Math.max(0, Math.min(300, bottom)) : 75 }
      };
      break;
    }
    return { version: 1, core, addons };
  }

  // src/core/game.js
  function createGame(page2, events2, scheduler2, host = window) {
    let communication = null;
    let original = null;
    let wrapper = null;
    let stopped = false;
    let started = false;
    let retry = 0;
    let layoutFrame = 0;
    function publish(packet) {
      events2.emit("gamePacket", packet);
      const packets = Array.isArray(packet) ? packet.flat(Infinity) : [packet];
      for (const data of packets) {
        if (!data?.loot) continue;
        if (data.loot.init !== void 0) {
          events2.emit(data.loot.init ? "lootOpened" : "lootClosed", data);
        }
      }
    }
    function hook() {
      if (stopped || communication) return;
      const candidate = page2.Engine?.communication;
      if (!candidate || typeof candidate.parseJSON !== "function") {
        retry = scheduler2.timeout(hook, 500);
        return;
      }
      communication = candidate;
      original = candidate.parseJSON;
      const parser = original;
      wrapper = function(...args) {
        const result = parser.apply(this, args);
        if (!stopped) publish(args[0]);
        return result;
      };
      communication.parseJSON = wrapper;
      events2.emit("gameReady", communication);
    }
    function layoutChanged(event) {
      if (layoutFrame) return;
      layoutFrame = scheduler2.frame(() => {
        layoutFrame = 0;
        events2.emit("layoutChanged", { type: event.type });
      });
    }
    function start2() {
      if (started || stopped) return;
      started = true;
      hook();
      scheduler2.listen(host, "resize", layoutChanged, { passive: true });
      scheduler2.listen(host.document, "visibilitychange", () => {
        events2.emit("visibilityChanged", host.document.hidden);
      });
      scheduler2.listen(host.document, "scroll", (event) => {
        if (event.target?.closest?.(".loot-wnd")) events2.emit("lootScrolled", event);
      }, { passive: true, capture: true });
    }
    function destroy() {
      stopped = true;
      scheduler2.clearTimeout(retry);
      if (communication?.parseJSON === wrapper) communication.parseJSON = original;
      communication = null;
      scheduler2.destroy();
    }
    return { page: page2, start: start2, destroy, get hooked() {
      return Boolean(communication);
    } };
  }

  // src/core/addon-manager.js
  function createAddonManager(services) {
    const registry = /* @__PURE__ */ new Map();
    const views = /* @__PURE__ */ new Set();
    let destroyed2 = false;
    function find(id) {
      const record = registry.get(id);
      if (!record) throw new Error(`Nieznany addon: ${id}`);
      return record;
    }
    function context(record, scheduler2, styleNamespace) {
      return {
        id: record.definition.id,
        settings: record.entry.settings,
        storage: {
          save: () => services.settings.save(),
          get core() {
            return services.settings.data.core;
          },
          updateCore: services.settings.updateCore
        },
        events: services.events.scope(scheduler2),
        styles: services.styles.scope(styleNamespace),
        scheduler: scheduler2,
        game: services.game,
        ui: services.ui,
        get enabled() {
          return record.running && !scheduler2.disposed;
        },
        setEnabled: (enabled) => setEnabled(record.definition.id, enabled),
        changeSettings: (patch) => changeSettings(record.definition.id, patch)
      };
    }
    function register(definition) {
      if (destroyed2) throw new Error("Addon manager zniszczony");
      if (!/^[a-z][a-z0-9-]*$/.test(definition.id)) throw new Error("Niepoprawne id addonu");
      if (registry.has(definition.id)) throw new Error(`Powtórzone id: ${definition.id}`);
      const record = {
        definition,
        entry: services.settings.addon(definition),
        initialized: false,
        running: false,
        runtime: null,
        lifetime: null
      };
      registry.set(definition.id, record);
      return record;
    }
    function initialize(record) {
      if (record.initialized) return;
      record.lifetime = context(record, createScheduler(), `${record.definition.id}:lifetime`);
      try {
        record.definition.init?.(record.lifetime);
      } catch (error) {
        record.lifetime.scheduler.destroy();
        record.lifetime.styles.clear();
        record.lifetime = null;
        throw error;
      }
      record.initialized = true;
    }
    function stop(record) {
      if (!record.runtime) return;
      record.running = false;
      try {
        record.definition.disable?.(record.runtime);
      } finally {
        record.runtime.scheduler.destroy();
        record.runtime.styles.clear();
        record.runtime = null;
      }
    }
    function setEnabled(id, enabled) {
      if (destroyed2) return;
      const record = find(id);
      initialize(record);
      enabled = Boolean(enabled);
      if (enabled && !record.running) {
        record.runtime = context(record, createScheduler(), id);
        record.running = true;
        try {
          record.definition.enable?.(record.runtime);
        } catch (error) {
          stop(record);
          record.entry.enabled = false;
          services.settings.save();
          throw error;
        }
      } else if (!enabled) stop(record);
      record.entry.enabled = enabled;
      services.settings.save();
      services.events.emit("addonChanged", { id, enabled });
    }
    function changeSettings(id, patch) {
      const record = find(id);
      Object.assign(record.entry.settings, patch);
      services.settings.save();
      if (record.running) record.definition.onSettingsChange?.(record.runtime);
    }
    function renderSettings3(id, container) {
      if (destroyed2) throw new Error("Addon manager zniszczony");
      const record = find(id);
      initialize(record);
      const scheduler2 = createScheduler();
      const view = context(record, scheduler2, `${id}:settings`);
      view.container = container;
      let close;
      const dispose = () => {
        if (scheduler2.disposed) return;
        try {
          close?.();
        } finally {
          scheduler2.destroy();
          view.styles.clear();
          container.replaceChildren();
        }
        views.delete(dispose);
      };
      views.add(dispose);
      try {
        close = record.definition.renderSettings?.(view);
      } catch (error) {
        dispose();
        throw error;
      }
      return dispose;
    }
    function start2() {
      for (const record of registry.values()) {
        try {
          setEnabled(record.definition.id, record.entry.enabled);
        } catch (error) {
          console.error(`[QADDONS: ${record.definition.id}]`, error);
        }
      }
    }
    function destroy() {
      if (destroyed2) return;
      destroyed2 = true;
      for (const dispose of views) {
        try {
          dispose();
        } catch (error) {
          console.error("[QADDONS settings cleanup]", error);
        }
      }
      views.clear();
      for (const record of [...registry.values()].reverse()) {
        try {
          stop(record);
        } catch (error) {
          console.error("[QADDONS disable]", error);
        }
        try {
          record.definition.destroy?.(record.lifetime);
        } catch (error) {
          console.error("[QADDONS destroy]", error);
        }
        record.lifetime?.scheduler.destroy();
        record.lifetime?.styles.clear();
      }
      registry.clear();
    }
    return {
      register,
      start: start2,
      setEnabled,
      changeSettings,
      renderSettings: renderSettings3,
      destroy,
      list: () => [...registry.values()].map((record) => ({
        id: record.definition.id,
        name: record.definition.name,
        description: record.definition.description,
        enabled: record.running
      }))
    };
  }

  // src/core/ui/controls.js
  function rangeControl({ label, value, min, max, step = 1, onInput, onChange }, scheduler2) {
    const wrapper = document.createElement("label");
    wrapper.className = "mtk-range";
    const title = document.createElement("span");
    const output = document.createElement("output");
    const input = document.createElement("input");
    title.textContent = label;
    input.type = "range";
    Object.assign(input, { min, max, step, value });
    output.textContent = `${value} px`;
    scheduler2.listen(input, "input", () => {
      output.textContent = `${input.value} px`;
      onInput?.(Number(input.value));
    });
    scheduler2.listen(input, "change", () => onChange?.(Number(input.value)));
    wrapper.append(title, output, input);
    return wrapper;
  }
  function bindDrag(element, handle, scheduler2, save, { button = false, click } = {}) {
    let drag = null;
    scheduler2.listen(handle, "pointerdown", (event) => {
      if (event.button !== 0 || !button && event.target.closest("button,input,select")) return;
      const rect = element.getBoundingClientRect();
      drag = {
        pointer: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        moved: false
      };
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    scheduler2.listen(handle, "pointermove", (event) => {
      if (!drag || event.pointerId !== drag.pointer) return;
      if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 3) drag.moved = true;
      if (!drag.moved) return;
      const rect = element.getBoundingClientRect();
      drag.x = Math.max(0, Math.min(innerWidth - rect.width, event.clientX - drag.offsetX));
      drag.y = Math.max(0, Math.min(innerHeight - 40, event.clientY - drag.offsetY));
      element.style.left = `${drag.x}px`;
      element.style.top = `${drag.y}px`;
      element.style.right = "auto";
    });
    function end(event) {
      if (!drag || event.pointerId !== drag.pointer) return;
      const finished = drag;
      drag = null;
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      if (finished.moved) save(finished.x, finished.y);
      else if (event.type === "pointerup") click?.();
    }
    scheduler2.listen(handle, "pointerup", end);
    scheduler2.listen(handle, "pointercancel", end);
    scheduler2.listen(handle, "lostpointercapture", end);
  }
  function rangeHtml(key, label, min, max, step, suffix = "") {
    return `<label class="ln-range"> <div class="ln-range-top"> <span class="ln-label"> ${label} </span> <span class="ln-range-value" data-range-value="${key}" ></span> </div> <input type="range" data-key="${key}" min="${min}" max="${max}" step="${step}" data-suffix="${suffix}" > </label>`;
  }

  // src/core/ui/settings-styles.js
  function installSettingsStyles(styles2) {
    styles2.set("settings", `
        #mtk-panel { color-scheme:dark; --ln-ui-accent:#eee; --ln-ui-border:#333; --ln-ui-text:#ddd; }
        #mtk-panel *, #mtk-panel *::before, #mtk-panel *::after { box-sizing:border-box; }
        #mtk-panel button, #mtk-panel input, #mtk-panel select { font:inherit; }
        #mtk-panel .ln-btn, #mtk-panel .ln-panel-close {
            min-height:28px; padding:4px 10px; border:1px solid #333; border-radius:0;
            background:#080808; color:#ddd; font:12px Arial,sans-serif; cursor:pointer;
        }
        #mtk-panel button:hover:not(:disabled) { background:#202020; border-color:#777; color:#fff; }
        #mtk-panel button:focus-visible, #mtk-panel input:focus-visible, #mtk-panel select:focus-visible {
            outline:1px solid #fff; outline-offset:2px;
        }
        #mtk-panel button:disabled { opacity:.45; cursor:default; }
        #mtk-panel input[type="checkbox"] {
            appearance:none; display:inline-grid; place-content:center; flex:0 0 15px;
            width:15px; height:15px; margin:0 7px 0 0; vertical-align:middle;
            border:1px solid #454545; border-radius:0; background:#000; cursor:pointer;
        }
        #mtk-panel input[type="checkbox"]:checked::after { content:'✓'; color:#fff; font:bold 13px Arial,sans-serif; }
        #mtk-panel input[type="range"] { width:100%; accent-color:#ccc; }
        #mtk-panel select, #mtk-panel input[type="url"], #mtk-panel input[type="text"], #mtk-panel input[type="number"] {
            width:100%; min-width:0; height:30px; padding:4px 6px; border:1px solid #333;
            border-radius:0; background:#080808; color:#eee; font:12px Arial,sans-serif;
        }
        #mtk-panel input[type="color"] { width:100%; height:30px; padding:2px; border:1px solid #333; border-radius:0; background:#080808; }
        #mtk-panel .ln-panel-head { display:none; }
        #mtk-panel .ln-panel-body { display:flex; flex:1; min-height:0; padding:0; overflow:hidden; }
        #mtk-panel .ln-tabs {
            flex:0 0 150px; min-width:0; padding:6px; overflow-y:auto; overflow-x:hidden;
            border-right:1px solid #292929; background:#000;
        }
        #mtk-panel .ln-tab-button {
            display:block; width:100%; min-height:34px; margin:0 0 3px; padding:7px 8px;
            border:1px solid transparent; border-radius:0; background:#000; color:#999;
            font:12px Arial,sans-serif; text-align:left; cursor:pointer;
        }
        #mtk-panel .ln-tab-button.active { border-color:#444; background:#171717; color:#fff; }
        #mtk-panel .ln-tab-button small { display:block; margin-top:3px; color:#888; font-size:10px; pointer-events:none; }
        #mtk-panel .ln-tab-content { position:relative; flex:1; min-width:0; min-height:0; overflow:hidden; }
        #mtk-panel .ln-tab-pane {
            display:none; width:100%; height:100%; padding:10px; overflow-y:auto;
            overflow-x:hidden; overscroll-behavior:contain; background:#000;
        }
        #mtk-panel .ln-tab-pane.active { display:block; }
        #mtk-panel .ln-section { margin:0 0 12px; border:1px solid #292929; border-radius:0; background:#000; }
        #mtk-panel .ln-section-head {
            display:flex; align-items:center; justify-content:space-between; gap:8px;
            padding:6px 9px; border-bottom:1px solid #292929; background:#101010; color:#eee; font-weight:bold;
        }
        #mtk-panel .ln-section-head > :last-child:not(:first-child) { color:#888; font-size:10px; font-weight:normal; }
        #mtk-panel .ln-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:12px; padding:10px; }
        #mtk-panel .ln-full { grid-column:1 / -1; }
        #mtk-panel .ln-field, #mtk-panel .ln-range { display:flex; flex-direction:column; min-width:0; gap:6px; }
        #mtk-panel .ln-label { color:#ddd; font-weight:normal; }
        #mtk-panel .ln-help { color:#999; font-size:11px; line-height:1.5; }
        #mtk-panel .ln-switch { display:flex; align-items:center; gap:0; min-height:26px; color:#ccc; }
        #mtk-panel .ln-range-top { display:flex; justify-content:space-between; align-items:center; gap:8px; }
        #mtk-panel .ln-range-value { padding:2px 5px; border:1px solid #333; color:#eee; font-size:11px; white-space:nowrap; }
        #mtk-panel .ln-panel-foot {
            display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between;
            gap:8px; padding:7px 10px; border-top:1px solid #292929; background:#080808;
        }
        #mtk-panel .ln-panel-foot small { color:#999; font-size:11px; }
        #mtk-panel .ln-actions { display:flex; gap:5px; }
        #mtk-panel .ln-status { margin-left:8px; padding:2px 5px; border:1px solid #555; border-radius:0; color:#eee; font-size:11px; }
        #mtk-panel .ln-status.off { color:#999; border-color:#333; }
        #mtk-panel .mtk-addon-settings { padding:10px; line-height:1.6; }
        #mtk-panel .mtk-addon-settings h2 { margin:0 0 10px; padding:6px 9px; border:1px solid #292929; background:#101010; color:#eee; font-size:13px; }
        #mtk-panel .mtk-addon-settings p { padding:0 10px; color:#bbb; }
        #mtk-panel .mtk-addon-settings .mtk-enabled { padding:8px 10px; }
        #mtk-panel ::-webkit-scrollbar { width:7px; height:7px; }
        #mtk-panel ::-webkit-scrollbar-track { background:#050505; }
        #mtk-panel ::-webkit-scrollbar-thumb { background:#555; border:1px solid #080808; }
        #mtk-panel .ln-tabs, #mtk-panel .ln-tab-pane, #mtk-content { scrollbar-width:thin; scrollbar-color:#555 #050505; }
        @media (max-width:600px) {
            #mtk-panel .ln-tabs { flex-basis:112px; }
            #mtk-panel .ln-grid { grid-template-columns:minmax(0,1fr); }
            #mtk-panel .ln-panel-foot small { display:none; }
        }
    `);
  }

  // src/assets/quesh.png
  var quesh_default = "data:image/png;base64,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";

  // src/version.js
  var VERSION = "1.5.3";

  // src/core/updates.js
  var MANIFEST_URL = "https://xquesh.github.io/quesh-addons/dist/version.json";
  var CHECK_INTERVAL = 5 * 60 * 1e3;
  var REQUEST_TIMEOUT = 1e4;
  function compareVersions(left, right) {
    const parse = (value) => {
      if (typeof value !== "string" || !/^\d+\.\d+\.\d+$/.test(value)) {
        throw new Error("Niepoprawny numer wersji");
      }
      const parts = value.split(".").map(Number);
      if (!parts.every(Number.isSafeInteger)) throw new Error("Niepoprawny numer wersji");
      return parts;
    };
    const a = parse(left);
    const b = parse(right);
    for (let index = 0; index < a.length; index++) {
      if (a[index] !== b[index]) return Math.sign(a[index] - b[index]);
    }
    return 0;
  }
  function createUpdateChecker(scheduler2, onChange, {
    currentVersion = VERSION,
    fetchImpl = (...args) => fetch(...args)
  } = {}) {
    let pending = null;
    let nextCheck = null;
    function check() {
      if (scheduler2.disposed) return Promise.resolve();
      if (pending) return pending;
      scheduler2.clearTimeout(nextCheck);
      const controller = new AbortController();
      const release = scheduler2.cleanup(() => controller.abort());
      const timeout = scheduler2.timeout(() => controller.abort(), REQUEST_TIMEOUT);
      onChange({ status: "checking", latestVersion: null });
      pending = Promise.resolve().then(async () => {
        try {
          const response = await fetchImpl(`${MANIFEST_URL}?t=${Date.now()}`, {
            cache: "no-store",
            credentials: "omit",
            referrerPolicy: "no-referrer",
            signal: controller.signal
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const manifest = await response.json();
          const comparison = compareVersions(currentVersion, manifest?.version);
          if (!scheduler2.disposed && !controller.signal.aborted) {
            onChange({ status: comparison < 0 ? "outdated" : "current", latestVersion: manifest.version });
          }
        } catch {
          if (!scheduler2.disposed) onChange({ status: "error", latestVersion: null });
        } finally {
          scheduler2.clearTimeout(timeout);
          release();
          pending = null;
          if (!scheduler2.disposed) nextCheck = scheduler2.timeout(check, CHECK_INTERVAL);
        }
      });
      return pending;
    }
    return { check };
  }

  // src/core/ui/panel.js
  function createPanel(settings, styles2, scheduler2, events2) {
    let manager2;
    let closeView = null;
    let currentView = "addons";
    const style = styles2.scope("core:panel");
    installSettingsStyles(style);
    style.set("panel", `
        #mtk-button, #mtk-panel { color:#ddd; font:13px Arial,sans-serif; z-index:2147483001; }
        #mtk-button { position:fixed; box-sizing:border-box; width:42px; height:42px; padding:2px; display:grid; place-items:center; border:1px solid #444; border-radius:0; background:#050505; cursor:grab; touch-action:none; transition:box-shadow .15s,border-color .15s; }
        #mtk-button:hover, #mtk-button:focus-visible { border-color:#bbb; box-shadow:0 0 12px #ffffff60; outline:none; }
        #mtk-button img { display:block; width:36px; height:36px; object-fit:contain; image-rendering:pixelated; pointer-events:none; user-select:none; }
        #mtk-panel { position:fixed; width:760px; height:570px; max-width:calc(100vw - 16px); max-height:calc(100vh - 16px); display:flex; flex-direction:column; border:1px solid #333; border-radius:0; background:#000; box-shadow:0 12px 40px #0009; overflow:hidden; }
        #mtk-panel[hidden] { display:none; }
        #mtk-panel > header { display:flex; gap:8px; align-items:center; padding:6px 8px; border-bottom:1px solid #292929; background:#080808; cursor:move; touch-action:none; }
        #mtk-panel header strong { flex:1; }
        #mtk-panel .mtk-version { margin-left:8px; color:#999; font-size:11px; font-weight:normal; }
        #mtk-panel .mtk-update-bar { display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:6px 10px; border-bottom:1px solid #292929; background:#000; }
        #mtk-panel .mtk-update-status { flex:1; display:flex; align-items:center; gap:8px; font-size:11px; }
        #mtk-panel .mtk-update-light { flex:0 0 8px; height:8px; border-radius:50%; background:#999; }
        #mtk-panel [data-status="current"] .mtk-update-light { background:#45df87; box-shadow:0 0 8px #45df8780; }
        #mtk-panel [data-status="outdated"] .mtk-update-light { background:#ff5b67; box-shadow:0 0 8px #ff5b6780; }
        #mtk-panel [data-status="error"] .mtk-update-light { background:#e8b04d; }
        #mtk-panel [data-check-update]:disabled { opacity:.5; cursor:wait; }
        #mtk-panel button { cursor:pointer; }
        #mtk-content { flex:1; min-height:0; overflow:auto; overscroll-behavior:contain; }
        #mtk-panel .mtk-addon { margin:10px; padding:0 0 12px; border-bottom:1px solid #222; }
        #mtk-panel .mtk-addon > strong { display:block; padding:6px 9px; border:1px solid #292929; background:#101010; color:#eee; }
        #mtk-panel .mtk-addon p { margin:10px; color:#aaa; line-height:1.5; }
        #mtk-panel .mtk-addon > label { margin-left:10px; }
        #mtk-panel .mtk-addon button { margin-left:15px; }
        #mtk-panel .mtk-range { display:grid; grid-template-columns:1fr auto; gap:14px; padding:16px; }
        #mtk-panel .mtk-range input { grid-column:1/-1; width:100%; }
        #mtk-panel .mtk-enabled { display:block; padding:16px; }
        #mtk-legendary-settings { position:relative; left:auto; top:auto; width:100%; height:100%; max-width:none; max-height:none; display:flex; flex-direction:column; border:0; background:#000; box-shadow:none; }
        #mtk-legendary-settings .ln-panel-head { display:none; }
    `);
    const button = document.createElement("button");
    button.id = "mtk-button";
    button.title = "QADDONS";
    button.setAttribute("aria-label", "Otwórz QADDONS");
    const icon = document.createElement("img");
    icon.src = quesh_default;
    icon.alt = "";
    icon.draggable = false;
    button.append(icon);
    button.style.right = `${settings.data.core.buttonRight ?? 20}px`;
    button.style.top = `${settings.data.core.buttonTop ?? 120}px`;
    const panel2 = document.createElement("section");
    panel2.id = "mtk-panel";
    panel2.hidden = true;
    panel2.style.left = `${Math.max(0, Math.min(innerWidth - 60, settings.data.core.panelX))}px`;
    panel2.style.top = `${Math.max(0, Math.min(innerHeight - 40, settings.data.core.panelY))}px`;
    panel2.innerHTML = '<header><strong>QADDONS<span class="mtk-version"></span></strong><button class="ln-btn" data-view="addons">DODATKI</button><button class="ln-btn" data-close aria-label="Zamknij">×</button></header><div class="mtk-update-bar"><span class="mtk-update-status" role="status" aria-live="polite" data-status="checking"><span class="mtk-update-light" aria-hidden="true"></span><span data-update-text>Sprawdzanie wersji…</span></span><button class="ln-btn" data-check-update>Sprawdź aktualizacje</button></div><div id="mtk-content"></div>';
    panel2.querySelector(".mtk-version").textContent = `v${VERSION}`;
    const updateStatus = panel2.querySelector(".mtk-update-status");
    const updateText = panel2.querySelector("[data-update-text]");
    const checkButton = panel2.querySelector("[data-check-update]");
    const updates = createUpdateChecker(scheduler2, ({ status, latestVersion }) => {
      updateStatus.dataset.status = status;
      checkButton.disabled = status === "checking";
      updateText.textContent = {
        checking: "Sprawdzanie wersji…",
        current: "Masz aktualną wersję",
        outdated: `Dostępna v${latestVersion} — odśwież grę (Ctrl+F5)`,
        error: "Nie udało się sprawdzić wersji. Spróbuj ponownie."
      }[status];
    });
    const content = panel2.querySelector("#mtk-content");
    function closeSettings() {
      closeView?.();
      closeView = null;
      content.replaceChildren();
    }
    function showAddons() {
      closeSettings();
      currentView = "addons";
      settings.updateCore({ lastView: currentView });
      for (const addon of manager2.list()) {
        const row = document.createElement("article");
        row.className = "mtk-addon";
        const title = document.createElement("strong");
        title.textContent = addon.name;
        const description = document.createElement("p");
        description.textContent = addon.description;
        const label = document.createElement("label");
        const enabled = document.createElement("input");
        enabled.type = "checkbox";
        enabled.checked = addon.enabled;
        enabled.onchange = () => manager2.setEnabled(addon.id, enabled.checked);
        label.append(enabled, addon.enabled ? " WŁĄCZONY" : " WYŁĄCZONY");
        const configure = document.createElement("button");
        configure.className = "ln-btn";
        configure.textContent = "USTAWIENIA";
        configure.onclick = () => openSettings(addon.id);
        row.append(title, description, label, configure);
        content.append(row);
      }
    }
    function openSettings(id) {
      closeSettings();
      currentView = id;
      settings.updateCore({ lastView: id });
      panel2.hidden = false;
      closeView = manager2.renderSettings(id, content);
    }
    function close() {
      panel2.hidden = true;
      closeSettings();
      currentView = "addons";
    }
    function open() {
      panel2.hidden = false;
      showAddons();
    }
    scheduler2.listen(panel2.querySelector("[data-view]"), "click", showAddons);
    scheduler2.listen(panel2.querySelector("[data-close]"), "click", close);
    scheduler2.listen(checkButton, "click", () => updates.check());
    scheduler2.listen(panel2, "wheel", (event) => {
      const scroller = event.target.closest(".ln-tabs") || panel2.querySelector(".ln-tab-pane.active") || content;
      scroller.scrollTop += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scroller.clientHeight : 1);
      event.preventDefault();
      event.stopPropagation();
    }, { capture: true, passive: false });
    bindDrag(
      panel2,
      panel2.querySelector("header"),
      scheduler2,
      (panelX, panelY) => settings.updateCore({ panelX, panelY })
    );
    bindDrag(
      button,
      button,
      scheduler2,
      (panelX, panelY) => settings.updateCore({ buttonRight: innerWidth - panelX - button.getBoundingClientRect().width, buttonTop: panelY }),
      { button: true, click: () => panel2.hidden ? open() : close() }
    );
    scheduler2.cleanup(events2.on("addonChanged", () => {
      if (!panel2.hidden && currentView === "addons") showAddons();
    }));
    document.body.append(button, panel2);
    updates.check();
    return {
      connect(addonManager) {
        manager2 = addonManager;
      },
      open,
      close,
      openSettings,
      showAddons,
      destroy() {
        closeSettings();
        scheduler2.destroy();
        button.remove();
        panel2.remove();
        style.clear();
      }
    };
  }

  // src/addons/legendary-notificator/defaults.js
  var DEFAULTS = {
    mute: false,
    customAudio: "",
    fallbackDuration: 15,
    performanceMode: "balanced",
    pauseWhenHidden: true,
    animationBaseLine: true,
    animationBaseOpacity: 0.26,
    /*
     * WIELOWARSTWOWY NEON
     *
     * Każda z 3 warstw ma:
     * - kolor,
     * - siłę,
     * - krycie,
     * - szerokość.
     *
     * Siła / krycie / szerokość pracują w skali 0-5.
     * Warstwa 3 odpowiada za najdalszy i najmocniej rozlany bloom.
     */
    multiLayerEnabled: true,
    neonCoreColor: "#efffff",
    neonCoreOpacity: 1,
    neonLayer1Color: "#7ffff8",
    neonLayer1Strength: 3,
    neonLayer1Opacity: 4,
    neonLayer1Width: 2,
    neonLayer2Color: "#25e1da",
    neonLayer2Strength: 2,
    neonLayer2Opacity: 2,
    neonLayer2Width: 1,
    neonLayer3Color: "#079ba5",
    neonLayer3Strength: 1,
    neonLayer3Opacity: 1,
    neonLayer3Width: 1,
    /*
     * Zachowane jako osobne przełączniki LN.
     * Zewnętrzne cienie używają dokładnej logiki 3 warstw.
     * Wewnętrzne, jeśli włączone, są ich lustrzanym odpowiednikiem.
     */
    neonInside: false,
    neonOutside: true,
    /*
     * Legacy / generic glow
     */
    glowNear: 6,
    glowFar: 18,
    ambientPower: 0.06,
    ambientSpread: 18,
    ambientMode: "static",
    /* OUTER LOOT */
    outerEffect: "static",
    outerColor: "#46f7ed",
    outerAccent: "#ffffff",
    outerWidth: 2,
    outerSpeed: 2.5,
    outerIntensity: 1,
    outerGlow: true,
    outerAmbient: false,
    outerPadding: 0,
    outerDirection: "cw",
    outerLeft: 0,
    outerRight: 0,
    outerTop: 0,
    outerBottom: 0,
    /* INNER LOOT */
    lootEffect: "static",
    lootColor: "#46f7ed",
    lootAccent: "#ffffff",
    lootWidth: 2,
    lootSpeed: 2.2,
    lootIntensity: 1,
    lootGlow: true,
    lootAmbient: false,
    lootPadding: 0,
    lootDirection: "cw",
    /* ITEM CARD */
    cardEffect: "static",
    cardColor: "#46f7ed",
    cardAccent: "#ffffff",
    cardWidth: 1,
    cardSpeed: 1.8,
    cardIntensity: 0.95,
    cardGlow: true,
    cardAmbient: false,
    cardPadding: 1,
    cardDirection: "cw",
    /* ITEM */
    itemEffect: "static",
    itemColor: "#46f7ed",
    itemAccent: "#ffffff",
    itemWidth: 1,
    itemSpeed: 1.3,
    itemIntensity: 1,
    itemGlow: true,
    itemAmbient: false,
    itemPadding: 2,
    itemDirection: "cw",
    /* CONFIRM */
    confirmEffect: "none",
    confirmColor: "#46f7ed",
    confirmAccent: "#ffffff",
    confirmWidth: 1,
    confirmSpeed: 1.5,
    confirmIntensity: 0.8,
    confirmGlow: false,
    confirmAmbient: false,
    confirmPadding: 0,
    confirmDirection: "cw",
    /* GAME CANVAS */
    canvasEffect: "static",
    canvasColor: "#46f7ed",
    canvasAccent: "#ffffff",
    canvasWidth: 2,
    canvasSpeed: 4,
    canvasIntensity: 1,
    canvasGlow: true,
    canvasAmbient: false,
    canvasPadding: -8,
    canvasDirection: "cw",
    /*
     * Osobny inward glow pola gry.
     * Nie zależy od globalnego "Świeć do środka", bo dla canvasu
     * chcemy móc mieć światło do wnętrza bez zalewania lootu/HUD.
     */
    canvasInnerGlow: true,
    canvasInnerIntensity: 0.85,
    /* WORLD */
    worldEnabled: false,
    worldColor: "#23e4dc",
    worldPower: 0.04,
    /* HUD */
    uiEnabled: true,
    uiColorSource: "custom",
    uiColor: "#46f7ed",
    uiEffect: "static",
    uiCoreMode: "neon",
    uiCoreOpacity: 1,
    uiWidth: 1,
    uiSpeed: 2.8,
    uiDirection: "cw",
    uiGlowPower: 0.45,
    uiNearBlur: 7,
    uiFarBlur: 26,
    uiPadding: 0,
    uiWaveSpan: 1.15,
    /* SHELL */
    uiShellFrame: true,
    uiShellPadding: 0,
    uiShellLeft: 0,
    uiShellRight: 0,
    uiShellTop: 0,
    uiShellBottom: 0,
    /* HUD TARGETS */
    uiTopFrame: true,
    uiGameFrame: false,
    uiChatFrame: true,
    uiChatInnerLines: true,
    uiRightFrame: true,
    uiEquipmentFrame: true,
    uiInventoryFrame: true,
    uiBottomFrame: true,
    uiBattleFrame: true,
    /* AUTO */
    uiStructuralAuto: false,
    uiAutoBorder: true,
    uiAutoOutline: true,
    uiAutoShadow: true,
    uiAutoThreshold: 75,
    uiAutoNeutrality: 85,
    uiAutoMinLength: 120,
    uiAutoMaxTargets: 25
  };

  // src/addons/legendary-notificator/performance.js
  var PERFORMANCE_PROFILES = Object.freeze({
    eco: Object.freeze({
      maintenanceMs: 1100,
      uiRefreshMs: 3e3,
      targetRefreshMs: 900,
      blurScale: 0.68,
      motionFilterPasses: 1,
      animatedFramePasses: 1,
      animatedItemPasses: 1,
      animatedBloomPasses: 2,
      maxAutoTargets: 8,
      autoScanBudget: 350
    }),
    balanced: Object.freeze({
      maintenanceMs: 650,
      uiRefreshMs: 2e3,
      targetRefreshMs: 650,
      blurScale: 0.86,
      motionFilterPasses: 2,
      animatedFramePasses: 2,
      animatedItemPasses: 2,
      animatedBloomPasses: 2,
      maxAutoTargets: 16,
      autoScanBudget: 750
    }),
    quality: Object.freeze({
      maintenanceMs: 350,
      uiRefreshMs: 1200,
      targetRefreshMs: 400,
      blurScale: 1,
      motionFilterPasses: 3,
      animatedFramePasses: 3,
      animatedItemPasses: 2,
      animatedBloomPasses: 3,
      maxAutoTargets: 26,
      autoScanBudget: 1400
    })
  });

  // src/addons/legendary-notificator/helpers.js
  function createHelpers(state, ctx, runtime) {
    function getPerformanceProfile() {
      return PERFORMANCE_PROFILES[state.settings.performanceMode] || PERFORMANCE_PROFILES.balanced;
    }
    function clamp(value, min, max) {
      value = Number(value);
      if (!Number.isFinite(value)) {
        return min;
      }
      return Math.max(min, Math.min(max, value));
    }
    function isVisible(element) {
      if (!element || !element.isConnected) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 0) {
        return false;
      }
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0;
    }
    function getElementId(element) {
      let id = state.elementIds.get(element);
      if (!id) {
        id = state.nextElementId++;
        state.elementIds.set(element, id);
      }
      return id;
    }
    function hexToRgb(hex) {
      let value = String(hex || "").replace("#", "").trim();
      if (value.length === 3) {
        value = value.split("").map((c) => c + c).join("");
      }
      if (!/^[0-9a-f]{6}$/i.test(value)) {
        return {
          r: 66,
          g: 238,
          b: 231
        };
      }
      return {
        r: parseInt(value.slice(0, 2), 16),
        g: parseInt(value.slice(2, 4), 16),
        b: parseInt(value.slice(4, 6), 16)
      };
    }
    function rgba(hex, alpha) {
      const c = hexToRgb(hex);
      return `rgba(${c.r},${c.g},${c.b},${clamp(alpha, 0, 1)})`;
    }
    function effectiveBlur(value) {
      return Math.max(1, Math.round(Number(value) * getPerformanceProfile().blurScale));
    }
    return { getPerformanceProfile, clamp, isVisible, getElementId, hexToRgb, rgba, effectiveBlur };
  }

  // src/addons/legendary-notificator/neon-engine.js
  function createNeonEngine(state, ctx, runtime) {
    function getNeonPalette(config) {
      if (!state.settings.multiLayerEnabled) {
        return {
          core: config.coreMode === "white" ? "#ffffff" : config.color,
          layer1: config.color,
          layer2: config.color,
          layer3: config.color
        };
      }
      return {
        core: state.settings.neonCoreColor,
        layer1: state.settings.neonLayer1Color,
        layer2: state.settings.neonLayer2Color,
        layer3: state.settings.neonLayer3Color
      };
    }
    const NEON_OPACITY_TABLE = [0, 0.06, 0.1, 0.16, 0.24, 0.34, 0.47, 0.62, 0.77, 0.9, 1];
    const NEON_SPATIAL_TABLE = [0, 0.35, 0.55, 0.8, 1.1, 1.5, 2, 2.65, 3.45, 4.4, 5.5];
    function neonLevel(value) {
      return Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
    }
    function neonInternalLevel(value) {
      return neonLevel(value) * 2;
    }
    function neonOpacityLevel(value) {
      const level = neonInternalLevel(value);
      if (level === 0) {
        return 0;
      }
      return NEON_OPACITY_TABLE[level] || 0;
    }
    function neonSpatialLevel(value) {
      return NEON_SPATIAL_TABLE[neonInternalLevel(value)] || 0;
    }
    function getNeonLayerRuntime(index, config) {
      const palette = getNeonPalette(config);
      const source = [
        {
          color: palette.layer1,
          strength: state.settings.neonLayer1Strength,
          opacity: state.settings.neonLayer1Opacity,
          width: state.settings.neonLayer1Width
        },
        {
          color: palette.layer2,
          strength: state.settings.neonLayer2Strength,
          opacity: state.settings.neonLayer2Opacity,
          width: state.settings.neonLayer2Width
        },
        {
          color: palette.layer3,
          strength: state.settings.neonLayer3Strength,
          opacity: state.settings.neonLayer3Opacity,
          width: state.settings.neonLayer3Width
        }
      ][index];
      const strength = neonLevel(source.strength);
      const opacity = neonOpacityLevel(source.opacity);
      const width = neonLevel(source.width);
      if (strength <= 0 || opacity <= 0 || width <= 0) {
        return null;
      }
      return {
        index,
        color: source.color,
        strength,
        opacity,
        width,
        internal: neonInternalLevel(strength),
        widthSpread: neonSpatialLevel(width),
        intensity: runtime.clamp(Number(config.intensity) || 1, 0.05, 2)
      };
    }
    function getBloomLayerPasses(layer, multiplier = 1) {
      if (!layer) {
        return [];
      }
      const ws = layer.widthSpread;
      const ls = NEON_SPATIAL_TABLE[Math.max(0, Math.min(10, layer.internal))] || 0;
      const strengthBoost = layer.index === 2 ? 0.65 + ls / 5.5 * 0.75 : 0.6 + ls / 5.5 * 0.7;
      const alpha = Math.min(1, layer.opacity * strengthBoost * layer.intensity);
      if (layer.index === 0) {
        return [
          {
            blur: Math.round((2 + ls * 2) * multiplier),
            spread: 0,
            alpha: Math.min(1, alpha * 1.15)
          },
          {
            blur: Math.round((8 + ws * 5) * multiplier),
            spread: Math.round((2 + ws * 3) * multiplier),
            alpha
          },
          {
            blur: Math.round((15 + ws * 7) * multiplier),
            spread: Math.round((5 + ws * 5) * multiplier),
            alpha: Math.min(1, alpha * 0.72)
          }
        ];
      }
      if (layer.index === 1) {
        return [
          {
            blur: Math.round((13 + ws * 7) * multiplier),
            spread: Math.round((12 + ws * 10) * multiplier),
            alpha
          },
          {
            blur: Math.round((22 + ws * 10) * multiplier),
            spread: Math.round((18 + ws * 15) * multiplier),
            alpha: Math.min(1, alpha * 0.76)
          },
          {
            blur: Math.round((32 + ws * 12) * multiplier),
            spread: Math.round((24 + ws * 19) * multiplier),
            alpha: Math.min(1, alpha * 0.52)
          }
        ];
      }
      return [
        {
          blur: Math.round((16 + ws * 8) * multiplier),
          spread: Math.round((30 + ws * 21) * multiplier),
          alpha
        },
        {
          blur: Math.round((28 + ws * 11) * multiplier),
          spread: Math.round((42 + ws * 27) * multiplier),
          alpha: Math.min(1, alpha * 0.82)
        },
        {
          blur: Math.round((42 + ws * 15) * multiplier),
          spread: Math.round((55 + ws * 34) * multiplier),
          alpha: Math.min(1, alpha * 0.58)
        }
      ];
    }
    function getFrameLayerPasses(layer, multiplier = 1) {
      if (!layer) {
        return [];
      }
      const level = layer.internal;
      const width = layer.widthSpread;
      const rawIntensity = runtime.clamp(Number(layer.intensity) || 1, 0.05, 2);
      const visualIntensity = rawIntensity <= 1 ? 0.56 + 0.44 * Math.sqrt(rawIntensity) : 1 + Math.min(0.36, (rawIntensity - 1) * 0.36);
      const strength = Math.min(1, layer.opacity * (0.72 + level * 0.035) * visualIntensity);
      const layerScale = 1 + layer.index * 0.42;
      const tightBlur = (5 + level * 0.58 + width * 1.15) * layerScale * multiplier;
      const mediumBlur = (12 + level * 0.82 + width * 2.25) * layerScale * multiplier;
      const softBlur = (23 + level * 1.02 + width * 3.75) * layerScale * multiplier;
      const tightSpread = Math.min(4, (0.35 + width * 0.3) * layerScale * multiplier);
      const mediumSpread = Math.min(7, (0.7 + width * 0.46) * layerScale * multiplier);
      const softSpread = Math.min(11, (1.05 + width * 0.68) * layerScale * multiplier);
      return [
        {
          blur: Math.round(tightBlur),
          spread: Number(tightSpread.toFixed(1)),
          alpha: Math.min(1, strength * 0.98)
        },
        {
          blur: Math.round(mediumBlur),
          spread: Number(mediumSpread.toFixed(1)),
          alpha: Math.min(0.74, strength * 0.58)
        },
        {
          blur: Math.round(softBlur),
          spread: Number(softSpread.toFixed(1)),
          alpha: Math.min(0.34, strength * 0.24)
        }
      ];
    }
    function getItemLayerPasses(layer, multiplier = 1) {
      if (!layer) {
        return [];
      }
      const level = layer.internal;
      const width = layer.widthSpread;
      const strength = Math.min(1, layer.opacity * (0.68 + level * 0.025) * layer.intensity);
      const layerScale = 1 + layer.index * 0.18;
      const tightBlur = (3 + level * 0.28 + width * 0.45) * layerScale * multiplier;
      const mediumBlur = (6 + level * 0.38 + width * 0.85) * layerScale * multiplier;
      const softBlur = (10 + level * 0.48 + width * 1.25) * layerScale * multiplier;
      const tightSpread = Math.min(1.8, (0.2 + width * 0.12) * multiplier);
      const mediumSpread = Math.min(2.6, (0.4 + width * 0.18) * multiplier);
      const softSpread = Math.min(3.4, (0.7 + width * 0.24) * multiplier);
      return [
        {
          blur: Math.round(tightBlur),
          spread: Number(tightSpread.toFixed(1)),
          alpha: Math.min(0.82, strength * 0.72)
        },
        {
          blur: Math.round(mediumBlur),
          spread: Number(mediumSpread.toFixed(1)),
          alpha: Math.min(0.46, strength * 0.34)
        },
        {
          blur: Math.round(softBlur),
          spread: Number(softSpread.toFixed(1)),
          alpha: Math.min(0.2, strength * 0.14)
        }
      ];
    }
    function getNeonLayerPasses(layer, multiplier = 1, profile = "frame") {
      switch (profile) {
        case "bloom":
          return getBloomLayerPasses(layer, multiplier);
        case "item":
          return getItemLayerPasses(layer, multiplier);
        default:
          return getFrameLayerPasses(layer, multiplier);
      }
    }
    function buildLayeredNeonShadow(config, multiplier = 1, allowInset = true) {
      if (!config.glow) {
        return "none";
      }
      const profile = config.glowProfile || "frame";
      const palette = getNeonPalette(config);
      const shadows = [];
      const insetEnabled = allowInset && (config.insetEnabled !== void 0 ? Boolean(config.insetEnabled) : Boolean(state.settings.neonInside));
      const insetPower = runtime.clamp(
        config.insetPower !== void 0 ? config.insetPower : 1,
        0,
        2
      );
      const runtimeLayers = [0, 1, 2].map((index) => getNeonLayerRuntime(index, config));
      const firstActiveLayer = runtimeLayers.find(Boolean) || null;
      if (profile === "frame" && state.settings.neonOutside) {
        const coreAlpha = runtime.clamp(state.settings.neonCoreOpacity * 0.98, 0, 1);
        shadows.push(`0 0 ${Math.max(2, Math.round(3 * multiplier))}px 0 ${runtime.rgba(palette.core, coreAlpha)}`);
        if (insetEnabled) {
          shadows.push(`inset 0 0 ${Math.max(2, Math.round(3 * multiplier))}px 0 ${runtime.rgba(palette.core, runtime.clamp(coreAlpha * 0.78 * insetPower, 0, 1))}`);
        }
        if (firstActiveLayer) {
          const tubeAlpha = Math.min(
            0.82,
            firstActiveLayer.opacity * (0.66 + firstActiveLayer.internal * 0.025) * (0.72 + Math.min(
              0.28,
              firstActiveLayer.intensity * 0.18
            ))
          );
          shadows.push(`0 0 ${Math.max(4, Math.round(5 * multiplier))}px 0 ${runtime.rgba(firstActiveLayer.color, tubeAlpha)}`);
          if (insetEnabled) {
            shadows.push(
              `inset 0 0 ${Math.max(3, Math.round(4 * multiplier))}px 0 ${runtime.rgba(firstActiveLayer.color, runtime.clamp(tubeAlpha * 0.3 * insetPower, 0, 1))}`
            );
          }
        }
      } else if (profile === "item" && state.settings.neonOutside) {
        shadows.push(
          `0 0 ${Math.max(1, Math.round(2 * multiplier))}px 0 ${runtime.rgba(palette.core, runtime.clamp(state.settings.neonCoreOpacity * 0.92, 0, 1))}`
        );
        if (firstActiveLayer) {
          shadows.push(
            `0 0 ${Math.max(3, Math.round(4 * multiplier))}px 0 ${runtime.rgba(firstActiveLayer.color, Math.min(0.58, firstActiveLayer.opacity * 0.58))}`
          );
        }
      }
      runtimeLayers.forEach((layer) => {
        if (!layer) {
          return;
        }
        const allPasses = getNeonLayerPasses(layer, multiplier, profile);
        const performance2 = runtime.getPerformanceProfile();
        const animated = !["none", "static"].includes(config.effect);
        const passLimit = animated ? profile === "bloom" ? performance2.animatedBloomPasses : profile === "item" ? performance2.animatedItemPasses : performance2.animatedFramePasses : 3;
        const passes = allPasses.slice(0, Math.max(1, passLimit));
        passes.forEach(
          (pass, passIndex) => {
            if (state.settings.neonOutside) {
              shadows.push(`0 0 ${pass.blur}px ${pass.spread}px ${runtime.rgba(layer.color, pass.alpha)}`);
            }
            if (insetEnabled && profile !== "item") {
              const insetScale = profile === "bloom" ? 0.2 : [0.48, 0.38, 0.28][passIndex] || 0.28;
              const insetBlur = profile === "bloom" ? Math.max(4, pass.blur * 0.42) : Math.max(3, pass.blur * 0.68);
              const insetSpread = profile === "bloom" ? Math.min(8, pass.spread * 0.12) : Math.min(5.5, pass.spread * 0.45);
              shadows.push(
                `inset 0 0 ${Number(insetBlur.toFixed(1))}px ${Number(insetSpread.toFixed(1))}px ${runtime.rgba(layer.color, runtime.clamp(pass.alpha * insetScale * insetPower, 0, 1))}`
              );
            }
          }
        );
      });
      return shadows.length ? shadows.join(", ") : "none";
    }
    function buildMultilayerBoxShadow(config, factor = 1, allowInset = true) {
      if (!config.glow) {
        return "none";
      }
      if (!state.settings.multiLayerEnabled) {
        const near = config.near ?? runtime.effectiveBlur(state.settings.glowNear);
        const far = config.far ?? runtime.effectiveBlur(state.settings.glowFar);
        return [
          `0 0 ${near}px ${runtime.rgba(config.color, runtime.clamp(config.intensity * factor * 0.55, 0, 0.8))}`,
          `0 0 ${far}px ${runtime.rgba(config.color, runtime.clamp(config.intensity * factor * 0.18, 0, 0.35))}`
        ].join(",");
      }
      return buildLayeredNeonShadow(config, factor, allowInset);
    }
    function buildMotionFilter(config, colorOverride = null) {
      if (!config.glow || !state.settings.multiLayerEnabled || !state.settings.neonOutside) {
        return "none";
      }
      const palette = getNeonPalette(config);
      const performance2 = runtime.getPerformanceProfile();
      const maxPasses = Math.max(0, performance2.motionFilterPasses);
      if (maxPasses === 0) {
        return "none";
      }
      const filters = [`drop-shadow(0 0 3px ${runtime.rgba(colorOverride || palette.core, 0.94)})`];
      if (filters.length >= maxPasses) {
        return filters.join(" ");
      }
      const glowProfile = config.glowProfile || "frame";
      for (let layerIndex = 0; layerIndex < 3 && filters.length < maxPasses; layerIndex++) {
        const layer = getNeonLayerRuntime(layerIndex, config);
        if (!layer) {
          continue;
        }
        const passes = getNeonLayerPasses(layer, 1, glowProfile);
        if (!passes.length) {
          continue;
        }
        const selectedPass = passes[filters.length === 1 ? 0 : Math.min(1, passes.length - 1)];
        const blur = Math.max(2, Math.min(22, Math.round(selectedPass.blur + selectedPass.spread * 0.1)));
        filters.push(`drop-shadow(0 0 ${blur}px ${runtime.rgba(layer.color, Math.min(0.78, selectedPass.alpha * 0.72))})`);
      }
      return filters.join(" ");
    }
    return { getNeonPalette, neonLevel, neonInternalLevel, neonOpacityLevel, neonSpatialLevel, getNeonLayerRuntime, getBloomLayerPasses, getFrameLayerPasses, getItemLayerPasses, getNeonLayerPasses, buildLayeredNeonShadow, buildMultilayerBoxShadow, buildMotionFilter };
  }

  // src/addons/legendary-notificator/animations.js
  function createAnimations(state, ctx, runtime) {
    function shapeEdges(shape) {
      switch (shape) {
        case "topBottom":
          return ["top", "bottom"];
        case "top":
          return ["top"];
        case "bottom":
          return ["bottom"];
        case "leftRight":
          return ["left", "right"];
        case "left":
          return ["left"];
        case "right":
          return ["right"];
        case "topLeftRight":
          return ["top", "left", "right"];
        default:
          return ["top", "right", "bottom", "left"];
      }
    }
    function isMotionEffect(effect) {
      return ["orbit", "dual", "comet", "scannerH", "scannerV", "scannerCross"].includes(effect);
    }
    function addCheapRect(overlay, config, factor) {
      const line = document.createElement("div");
      line.className = "ln-base-rect";
      line.style.borderWidth = config.width + "px";
      const palette = runtime.getNeonPalette(config);
      let core = config.color;
      if (state.settings.multiLayerEnabled) {
        core = palette.core;
      } else if (config.coreMode === "white") {
        core = "#ffffff";
      }
      const coreAlpha = config.coreMode === "original" && !state.settings.multiLayerEnabled ? 0 : state.settings.multiLayerEnabled ? runtime.clamp(
        state.settings.neonCoreOpacity * factor,
        0,
        1
      ) : config.coreOpacity * factor;
      line.style.borderColor = runtime.rgba(core, coreAlpha);
      line.style.outline = "none";
      if (config.glow) {
        line.style.boxShadow = runtime.buildMultilayerBoxShadow(config, factor, true);
      }
      overlay.appendChild(line);
    }
    function addCheapEdge(overlay, edge, config, factor) {
      const line = document.createElement("div");
      line.className = `ln-edge ln-edge-${edge}`;
      const palette = runtime.getNeonPalette(config);
      let core = config.color;
      if (state.settings.multiLayerEnabled) {
        core = palette.core;
      } else if (config.coreMode === "white") {
        core = "#ffffff";
      }
      const alpha = state.settings.multiLayerEnabled ? runtime.clamp(state.settings.neonCoreOpacity * factor, 0, 1) : config.coreMode === "original" ? 1e-3 : config.coreOpacity * factor;
      if (edge === "top" || edge === "bottom") {
        line.style.height = config.width + "px";
      } else {
        line.style.width = config.width + "px";
      }
      if (state.settings.multiLayerEnabled) {
        line.style.background = runtime.rgba(palette.core, alpha);
      } else {
        line.style.background = runtime.rgba(core, alpha);
      }
      if (config.glow) {
        line.style.boxShadow = runtime.buildMultilayerBoxShadow(config, factor, false);
      }
      overlay.appendChild(line);
    }
    function addCheapBase(overlay, config, shape, factor) {
      if (factor <= 0) {
        return;
      }
      if (shape === "rect") {
        addCheapRect(overlay, config, factor);
        return;
      }
      shapeEdges(shape).forEach(
        (edge) => {
          addCheapEdge(overlay, edge, config, factor);
        }
      );
    }
    function addAmbient(overlay, config) {
      if (!config.ambient || state.settings.ambientPower <= 0) {
        return;
      }
      const performanceFactor = state.settings.performanceMode === "eco" ? 0.55 : 1;
      const power = runtime.clamp(state.settings.ambientPower, 0, 0.6) * config.intensity * performanceFactor;
      const ambient = document.createElement("div");
      ambient.className = "ln-ambient";
      const palette = runtime.getNeonPalette(config);
      const ambientColor = state.settings.multiLayerEnabled ? palette.layer2 : config.color;
      overlay.style.setProperty("--ln-ambient-a", runtime.rgba(ambientColor, power * 0.12));
      overlay.style.setProperty("--ln-ambient-b", runtime.rgba(ambientColor, power * 0.05));
      overlay.style.setProperty("--ln-ambient-opacity", runtime.clamp(0.35 + power, 0.1, 0.85));
      if (state.settings.ambientMode === "breathe") {
        ambient.classList.add("ln-breathe");
      }
      if (state.settings.ambientMode === "pulse") {
        ambient.classList.add("ln-pulse");
      }
      overlay.appendChild(ambient);
    }
    function svgElement(name) {
      return document.createElementNS("http://www.w3.org/2000/svg", name);
    }
    function motionEdges(shape, effect) {
      if (effect === "orbit" || effect === "dual" || effect === "comet") {
        if (shape === "rect") {
          return ["perimeter"];
        }
        return shapeEdges(shape);
      }
      if (effect === "scannerH") {
        const edges = shapeEdges(shape);
        const horizontal = edges.filter((edge) => edge === "top" || edge === "bottom");
        return horizontal.length ? horizontal : edges;
      }
      if (effect === "scannerV") {
        const edges = shapeEdges(shape);
        const vertical = edges.filter((edge) => edge === "left" || edge === "right");
        return vertical.length ? vertical : edges;
      }
      return shapeEdges(shape);
    }
    function addMotionStroke(svg, edge, requestedColor, dashLength, startOffset, config, direction, secondary = false) {
      const element = edge === "perimeter" ? svgElement("rect") : svgElement("line");
      const palette = runtime.getNeonPalette(config);
      let strokeColor = requestedColor;
      if (state.settings.multiLayerEnabled) {
        strokeColor = secondary ? palette.layer1 : palette.core;
      }
      element.dataset.edge = edge;
      element.setAttribute("pathLength", "100");
      element.setAttribute("stroke", strokeColor);
      element.setAttribute("stroke-width", String(config.width));
      element.setAttribute("stroke-dasharray", `${dashLength} ${100 - dashLength}`);
      element.setAttribute("stroke-dashoffset", String(startOffset));
      if (config.glow) {
        const filter = runtime.buildMotionFilter(config, secondary ? palette.layer1 : palette.core);
        if (filter && filter !== "none") {
          element.style.filter = filter;
        }
      }
      svg.appendChild(element);
      const dir = direction === "ccw" ? 1 : -1;
      try {
        const animation = element.animate(
          [
            {
              strokeDashoffset: String(startOffset)
            },
            {
              strokeDashoffset: String(startOffset + dir * 100)
            }
          ],
          {
            duration: Math.max(300, config.speed * 1e3),
            iterations: Infinity,
            easing: "linear"
          }
        );
        svg._animations.push(animation);
      } catch {
      }
    }
    function buildMotionSvg(overlay, config, shape) {
      const svg = svgElement("svg");
      svg.classList.add("ln-motion-svg");
      svg._animations = [];
      overlay.appendChild(svg);
      overlay._motionSvg = svg;
      let dash = 15;
      if (config.effect === "comet") {
        dash = 28;
      }
      if (config.effect.startsWith("scanner")) {
        dash = 20;
      }
      const edges = motionEdges(shape, config.effect);
      edges.forEach(
        (edge, index) => {
          addMotionStroke(
            svg,
            edge,
            config.color,
            dash,
            index * 17,
            config,
            index % 2 ? config.direction === "cw" ? "ccw" : "cw" : config.direction,
            false
          );
        }
      );
      if (config.effect === "dual") {
        edges.forEach(
          (edge, index) => {
            addMotionStroke(
              svg,
              edge,
              config.accent,
              13,
              50 + index * 13,
              config,
              config.direction === "cw" ? "ccw" : "cw",
              true
            );
          }
        );
      }
    }
    function updateSvgGeometry(overlay, width, height, radius, lineWidth) {
      const svg = overlay._motionSvg;
      if (!svg) {
        return;
      }
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      const inset = Math.max(0.5, lineWidth / 2);
      svg.querySelectorAll("[data-edge]").forEach(
        (element) => {
          const edge = element.dataset.edge;
          if (edge === "perimeter") {
            element.setAttribute("x", inset);
            element.setAttribute("y", inset);
            element.setAttribute("width", Math.max(1, width - inset * 2));
            element.setAttribute("height", Math.max(1, height - inset * 2));
            element.setAttribute("rx", radius);
            element.setAttribute("ry", radius);
            return;
          }
          if (edge === "top") {
            element.setAttribute("x1", inset);
            element.setAttribute("y1", inset);
            element.setAttribute("x2", width - inset);
            element.setAttribute("y2", inset);
          }
          if (edge === "bottom") {
            element.setAttribute("x1", inset);
            element.setAttribute("y1", height - inset);
            element.setAttribute("x2", width - inset);
            element.setAttribute("y2", height - inset);
          }
          if (edge === "left") {
            element.setAttribute("x1", inset);
            element.setAttribute("y1", inset);
            element.setAttribute("x2", inset);
            element.setAttribute("y2", height - inset);
          }
          if (edge === "right") {
            element.setAttribute("x1", width - inset);
            element.setAttribute("y1", inset);
            element.setAttribute("x2", width - inset);
            element.setAttribute("y2", height - inset);
          }
        }
      );
    }
    return { shapeEdges, isMotionEffect, addCheapRect, addCheapEdge, addCheapBase, addAmbient, svgElement, motionEdges, addMotionStroke, buildMotionSvg, updateSvgGeometry };
  }

  // src/addons/legendary-notificator/overlays.js
  function createOverlays(state, ctx, runtime) {
    function useLocalOverlayForKey(key) {
      return key.startsWith("canvas:");
    }
    function retainLocalOverlayOwner(element) {
      if (!element || !(element instanceof HTMLElement)) {
        return false;
      }
      let ownerState = state.localOverlayOwners.get(element);
      if (!ownerState) {
        ownerState = {
          count: 0,
          position: element.style.position,
          isolation: element.style.isolation
        };
        state.localOverlayOwners.set(element, ownerState);
      }
      ownerState.count++;
      const computed = getComputedStyle(element);
      if (computed.position === "static") {
        element.style.position = "relative";
      }
      element.style.isolation = "isolate";
      return true;
    }
    function releaseLocalOverlayOwner(element) {
      if (!element || !(element instanceof HTMLElement)) {
        return;
      }
      const ownerState = state.localOverlayOwners.get(element);
      if (!ownerState) {
        return;
      }
      ownerState.count--;
      if (ownerState.count > 0) {
        return;
      }
      element.style.position = ownerState.position;
      element.style.isolation = ownerState.isolation;
      state.localOverlayOwners.delete(element);
    }
    function mountOverlayLocally(overlay, element) {
      if (!overlay || !retainLocalOverlayOwner(element)) {
        return false;
      }
      overlay.classList.add("ln-local-fx");
      overlay.style.position = "absolute";
      overlay.style.zIndex = "2";
      element.appendChild(overlay);
      return true;
    }
    function buildOverlay(kind, config, shape = "rect") {
      const overlay = document.createElement("div");
      overlay.className = "ln-fx";
      overlay.dataset.kind = kind;
      overlay.dataset.shape = shape;
      overlay.style.setProperty("--ln-speed", config.speed + "s");
      overlay.style.setProperty("--ln-delay", "0s");
      if (config.effect === "none") {
        document.body.appendChild(overlay);
        return overlay;
      }
      runtime.addAmbient(overlay, config);
      const motion = runtime.isMotionEffect(config.effect);
      const baseFactor = motion ? state.settings.animationBaseLine ? runtime.clamp(state.settings.animationBaseOpacity, 0, 0.8) : 0 : 1;
      runtime.addCheapBase(overlay, config, shape, baseFactor);
      if (!motion) {
        switch (config.effect) {
          case "breathe":
            overlay.classList.add("ln-breathe");
            break;
          case "pulse":
            overlay.classList.add("ln-pulse");
            break;
          case "heartbeat":
            overlay.classList.add("ln-heartbeat");
            break;
          case "cascade":
            overlay.classList.add("ln-cascade");
            break;
          case "lootWave":
            overlay.classList.add("ln-loot-wave");
            break;
        }
      } else {
        runtime.buildMotionSvg(overlay, config, shape);
      }
      document.body.appendChild(overlay);
      return overlay;
    }
    function overlaySignature(config, shape) {
      return JSON.stringify({
        ...config,
        shape,
        performanceMode: state.settings.performanceMode,
        multiLayerEnabled: state.settings.multiLayerEnabled,
        neonCoreColor: state.settings.neonCoreColor,
        neonCoreOpacity: state.settings.neonCoreOpacity,
        neonLayer1Color: state.settings.neonLayer1Color,
        neonLayer1Strength: state.settings.neonLayer1Strength,
        neonLayer1Opacity: state.settings.neonLayer1Opacity,
        neonLayer1Width: state.settings.neonLayer1Width,
        neonLayer2Color: state.settings.neonLayer2Color,
        neonLayer2Strength: state.settings.neonLayer2Strength,
        neonLayer2Opacity: state.settings.neonLayer2Opacity,
        neonLayer2Width: state.settings.neonLayer2Width,
        neonLayer3Color: state.settings.neonLayer3Color,
        neonLayer3Strength: state.settings.neonLayer3Strength,
        neonLayer3Opacity: state.settings.neonLayer3Opacity,
        neonLayer3Width: state.settings.neonLayer3Width,
        neonInside: state.settings.neonInside,
        neonOutside: state.settings.neonOutside,
        animationBaseLine: state.settings.animationBaseLine,
        animationBaseOpacity: state.settings.animationBaseOpacity,
        ambientPower: state.settings.ambientPower,
        ambientMode: state.settings.ambientMode
      });
    }
    function positionOverlay(entry) {
      if (!entry?.overlay) {
        return;
      }
      if (entry.local && !entry.virtual) {
        const element = entry.element;
        if (!element || !element.isConnected) {
          if (entry.overlay.style.display !== "none") {
            entry.overlay.style.display = "none";
          }
          return;
        }
        const baseWidth = element.offsetWidth;
        const baseHeight = element.offsetHeight;
        if (baseWidth <= 0 || baseHeight <= 0) {
          if (entry.overlay.style.display !== "none") {
            entry.overlay.style.display = "none";
          }
          return;
        }
        const config2 = entry.config;
        const padding2 = Number(config2.padding) || 0;
        const left2 = padding2 + (Number(config2.left) || 0);
        const right = padding2 + (Number(config2.right) || 0);
        const top2 = padding2 + (Number(config2.top) || 0);
        const bottom = padding2 + (Number(config2.bottom) || 0);
        const borderLeft = element.clientLeft || 0;
        const borderTop = element.clientTop || 0;
        const width2 = Math.max(1, baseWidth + left2 + right);
        const height2 = Math.max(1, baseHeight + top2 + bottom);
        if (entry._radius === void 0) {
          entry._radius = parseFloat(getComputedStyle(element).borderRadius) || 0;
        }
        const radius2 = entry._radius;
        const geometry2 = [-left2 - borderLeft, -top2 - borderTop, width2, height2, radius2, config2.width].join("|");
        if (entry._geometry === geometry2 && entry.overlay.style.display === "block") {
          return;
        }
        entry._geometry = geometry2;
        entry.overlay.style.display = "block";
        entry.overlay.style.left = -left2 - borderLeft + "px";
        entry.overlay.style.top = -top2 - borderTop + "px";
        entry.overlay.style.width = width2 + "px";
        entry.overlay.style.height = height2 + "px";
        entry.overlay.style.borderRadius = radius2 + "px";
        runtime.updateSvgGeometry(entry.overlay, width2, height2, radius2, config2.width);
        return;
      }
      let rect;
      if (entry.virtual) {
        rect = entry.rect;
      } else {
        const element = entry.element;
        if (!element || !element.isConnected) {
          if (entry.overlay.style.display !== "none") {
            entry.overlay.style.display = "none";
          }
          return;
        }
        rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          if (entry.overlay.style.display !== "none") {
            entry.overlay.style.display = "none";
          }
          return;
        }
      }
      const config = entry.config;
      const padding = Number(config.padding) || 0;
      const leftPad = padding + (Number(config.left) || 0);
      const rightPad = padding + (Number(config.right) || 0);
      const topPad = padding + (Number(config.top) || 0);
      const bottomPad = padding + (Number(config.bottom) || 0);
      const left = rect.left - leftPad;
      const top = rect.top - topPad;
      const width = Math.max(1, rect.width + leftPad + rightPad);
      const height = Math.max(1, rect.height + topPad + bottomPad);
      let radius = 0;
      if (!entry.virtual && entry.element) {
        if (entry._radius === void 0) {
          entry._radius = parseFloat(getComputedStyle(entry.element).borderRadius) || 0;
        }
        radius = entry._radius;
      }
      const round = (value) => Math.round(Number(value) * 10) / 10;
      const geometry = [round(left), round(top), round(width), round(height), round(radius), config.width].join("|");
      if (entry._geometry === geometry && entry.overlay.style.display === "block") {
        return;
      }
      entry._geometry = geometry;
      entry.overlay.style.display = "block";
      entry.overlay.style.left = left + "px";
      entry.overlay.style.top = top + "px";
      entry.overlay.style.width = width + "px";
      entry.overlay.style.height = height + "px";
      entry.overlay.style.borderRadius = radius + "px";
      runtime.updateSvgGeometry(entry.overlay, width, height, radius, config.width);
    }
    function getNumericZIndex(element) {
      if (!(element instanceof Element)) {
        return null;
      }
      const computed = Number.parseInt(getComputedStyle(element).zIndex, 10);
      if (Number.isFinite(computed)) {
        return computed;
      }
      const inline = Number.parseInt(element.style.zIndex, 10);
      return Number.isFinite(inline) ? inline : null;
    }
    function syncOverlayStacking(key, entry) {
      if (!entry || entry.virtual || entry.local || !entry.element) {
        return;
      }
      const root = entry.element.matches?.(".loot-wnd") ? entry.element : entry.element.closest?.(".loot-wnd");
      if (!root) {
        return;
      }
      const lootZ = getNumericZIndex(root);
      if (!Number.isFinite(lootZ)) {
        return;
      }
      if (key.startsWith("outer:")) {
        entry.overlay.style.zIndex = String(lootZ - 1);
        return;
      }
      if (key.startsWith("loot:")) {
        entry.overlay.style.zIndex = String(lootZ + 1);
        return;
      }
      if (key.startsWith("card:")) {
        entry.overlay.style.zIndex = String(lootZ + 2);
        return;
      }
      if (key.startsWith("item:")) {
        entry.overlay.style.zIndex = String(lootZ + 3);
        return;
      }
      if (key.startsWith("confirm:")) {
        entry.overlay.style.zIndex = String(lootZ + 4);
      }
    }
    function cancelAnimations(entry) {
      const svg = entry?.overlay?._motionSvg;
      if (!svg || !svg._animations) {
        return;
      }
      svg._animations.forEach(
        (animation) => {
          try {
            animation.cancel();
          } catch {
          }
        }
      );
      svg._animations = [];
    }
    function removeOverlayEntry(entry) {
      if (!entry) {
        return;
      }
      cancelAnimations(entry);
      entry.overlay?.remove();
      if (entry.localOwner) {
        releaseLocalOverlayOwner(entry.localOwner);
      }
    }
    function ensureOverlay(key, element, config, shape, delay = 0, reposition = true) {
      const signature = overlaySignature(config, shape);
      const local = useLocalOverlayForKey(key);
      let entry = state.overlays.get(key);
      if (!entry || entry.virtual || entry.element !== element || entry.signature !== signature || Boolean(entry.local) !== local) {
        removeOverlayEntry(entry);
        const kind = key.startsWith("ui:") ? "ui" : key.split(":")[0];
        const overlay = buildOverlay(kind, config, shape);
        let localOwner = null;
        if (local && mountOverlayLocally(overlay, element)) {
          localOwner = element;
        }
        entry = {
          virtual: false,
          local: Boolean(localOwner),
          localOwner,
          element,
          config,
          shape,
          signature,
          overlay
        };
        state.overlays.set(key, entry);
        reposition = true;
      }
      entry.config = config;
      entry.overlay.style.setProperty("--ln-delay", delay + "s");
      if (reposition) {
        positionOverlay(entry);
      }
      if (reposition || !entry._stackInitialized) {
        syncOverlayStacking(key, entry);
        entry._stackInitialized = true;
      }
      return entry;
    }
    function ensureVirtualOverlay(key, rect, config, shape = "rect", delay = 0) {
      const signature = overlaySignature(config, shape);
      let entry = state.overlays.get(key);
      if (!entry || !entry.virtual || entry.signature !== signature) {
        removeOverlayEntry(entry);
        entry = {
          virtual: true,
          rect,
          config,
          shape,
          signature,
          overlay: buildOverlay("ui", config, shape)
        };
        state.overlays.set(key, entry);
      }
      entry.rect = rect;
      entry.config = config;
      entry.overlay.style.setProperty("--ln-delay", delay + "s");
      positionOverlay(entry);
      return entry;
    }
    function removeUnusedOverlays(wanted) {
      for (const [key, entry] of state.overlays) {
        if (!wanted.has(key)) {
          removeOverlayEntry(entry);
          state.overlays.delete(key);
        }
      }
    }
    function clearOverlays() {
      for (const entry of state.overlays.values()) {
        removeOverlayEntry(entry);
      }
      state.overlays.clear();
    }
    function rebuildEffects() {
      clearOverlays();
      state.uiDirty = true;
      state.layoutDirty = true;
      state.geometryDirty = true;
      state.cachedTargets = null;
      state.nextUiRefresh = 0;
      state.nextTargetRefresh = 0;
      if (state.active) {
        runtime.requestSync(true);
      }
    }
    return { useLocalOverlayForKey, retainLocalOverlayOwner, releaseLocalOverlayOwner, mountOverlayLocally, buildOverlay, overlaySignature, positionOverlay, getNumericZIndex, syncOverlayStacking, cancelAnimations, removeOverlayEntry, ensureOverlay, ensureVirtualOverlay, removeUnusedOverlays, clearOverlays, rebuildEffects };
  }

  // src/addons/legendary-notificator/constants.js
  var IDS = {
    panel: "mtk-legendary-settings",
    status: "ln580-status",
    world: "ln580-world"
  };
  var SELECTORS = {
    lootRoot: ".loot-wnd",
    loot: ".c-window.loot-wnd .loot-window",
    card: ".c-window.loot-wnd .loot-item-wrapper",
    item: '.c-window.loot-wnd .item[data-item-type="t-leg"]',
    confirm: ".c-window.loot-wnd .accept-button > .button",
    canvas: "#GAME_CANVAS"
  };
  var LEGENDARY_DOM_SELECTOR = '.item[data-item-type="t-leg"], .item[data-frame-mania-rarity="legendary"]';

  // src/addons/legendary-notificator/targets.js
  function createTargets(state, ctx, runtime) {
    function findPositionerBackground(position) {
      const positioner = document.querySelector(`.game-window-positioner .interface-layer .positioner.${position}`);
      if (!positioner) {
        return null;
      }
      for (const child of positioner.children) {
        if (child.classList && child.classList.contains("bg")) {
          return child;
        }
      }
      const parentRect = positioner.getBoundingClientRect();
      if (parentRect.width <= 0 || parentRect.height <= 0) {
        return null;
      }
      const candidates = positioner.querySelectorAll(".bg");
      let best = null;
      let bestScore = 0;
      for (const candidate of candidates) {
        if (candidate.closest("button,.button,.widget-button,.usable-slot,.skill-usable-slot,.slot,.item")) {
          continue;
        }
        const rect = candidate.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          continue;
        }
        const widthRatio = rect.width / parentRect.width;
        const heightRatio = rect.height / parentRect.height;
        const areaRatio = rect.width * rect.height / (parentRect.width * parentRect.height);
        if (widthRatio < 0.7 || heightRatio < 0.55) {
          continue;
        }
        const score = widthRatio + heightRatio + areaRatio;
        if (score > bestScore) {
          bestScore = score;
          best = candidate;
        }
      }
      return best;
    }
    function resolveStandardTargets(force = false) {
      const now = performance.now();
      const profile = runtime.getPerformanceProfile();
      if (!force && state.cachedTargets && now < state.nextTargetRefresh) {
        return state.cachedTargets;
      }
      state.nextTargetRefresh = now + profile.targetRefreshMs;
      const visibleLootRoots = Array.from(document.querySelectorAll(SELECTORS.lootRoot)).filter(runtime.isVisible);
      const root = visibleLootRoots.find((element) => element.querySelector(LEGENDARY_DOM_SELECTOR)) || null;
      if (!root) {
        state.cachedTargets = {
          root: null,
          loot: null,
          outer: [],
          card: [],
          item: [],
          confirm: [],
          canvas: []
        };
        return state.cachedTargets;
      }
      const loot = root.querySelector(".loot-window") || root.querySelector(".inner-content") || root.querySelector(".content") || root;
      const confirm = root.querySelector(".accept-button > .button");
      const cards = Array.from(root.querySelectorAll(".loot-item-wrapper")).filter(
        (element) => element.querySelector(LEGENDARY_DOM_SELECTOR)
      );
      const items = Array.from(root.querySelectorAll(LEGENDARY_DOM_SELECTOR));
      const canvas = document.querySelector(".game-window-positioner .game-layer") || document.querySelector(SELECTORS.canvas)?.parentElement || null;
      state.cachedTargets = {
        root,
        loot,
        outer: root ? [root] : [],
        card: cards,
        item: items,
        confirm: confirm ? [confirm] : [],
        canvas: canvas ? [canvas] : []
      };
      return state.cachedTargets;
    }
    return { findPositionerBackground, resolveStandardTargets };
  }

  // src/addons/legendary-notificator/hud.js
  function createHud(state, ctx, runtime) {
    const UI_TARGETS = [
      {
        setting: "uiTopFrame",
        selector: ".game-window-positioner .interface-layer .positioner.top",
        /*
         * W light-interface natywny .bg jest display:none.
         * Ramkę rysujemy więc po geometrii positionera, a nie po
         * niewidocznym tle.
         */
        shape: "topBottom"
      },
      {
        setting: "uiGameFrame",
        selector: ".game-window-positioner .game-layer",
        shape: "rect"
      },
      {
        setting: "uiChatFrame",
        selector: ".game-window-positioner .interface-layer .left-column.main-column",
        shape: "rect"
      },
      {
        setting: "uiChatInnerLines",
        selector: ".game-window-positioner .new-chat-window .chat-message-wrapper",
        shape: "topBottom"
      },
      {
        setting: "uiChatInnerLines",
        selector: ".game-window-positioner .chat-input-wrapper .magic-input-wrapper",
        shape: "topBottom"
      },
      {
        setting: "uiRightFrame",
        selector: ".game-window-positioner .interface-layer .right-column.main-column",
        shape: "rect"
      },
      {
        setting: "uiEquipmentFrame",
        selector: ".game-window-positioner .right-column.main-column .character_wrapper .equipment-wrapper",
        shape: "rect",
        padding: -3
      },
      {
        setting: "uiInventoryFrame",
        selector: ".game-window-positioner .inventory_wrapper .bags-navigation-bg",
        shape: "rect"
      },
      {
        setting: "uiInventoryFrame",
        selector: ".game-window-positioner .inventory_wrapper .inventory-grid",
        shape: "rect"
      },
      {
        setting: "uiBattleFrame",
        selector: ".game-window-positioner .bottom.positioner .battle-controller .graphics .battle-border",
        shape: "rect"
      }
    ];
    function getUiShellRect() {
      const candidates = [
        document.querySelector(".game-window-positioner .interface-layer .left-column.main-column"),
        document.querySelector(".game-window-positioner .game-layer"),
        document.querySelector(".game-window-positioner .interface-layer .right-column.main-column")
      ].filter((element) => element && element.isConnected);
      if (candidates.length < 2) {
        return null;
      }
      const rects = candidates.map((element) => element.getBoundingClientRect());
      const left = Math.min(...rects.map((rect) => rect.left));
      const top = Math.min(...rects.map((rect) => rect.top));
      const right = Math.max(...rects.map((rect) => rect.right));
      const bottom = Math.max(...rects.map((rect) => rect.bottom));
      return {
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top
      };
    }
    function parseCssColor(value) {
      const text = String(value || "");
      const match = text.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
      if (!match) {
        return null;
      }
      return {
        r: Number(match[1]),
        g: Number(match[2]),
        b: Number(match[3]),
        a: match[4] === void 0 ? 1 : Number(match[4])
      };
    }
    function brightNeutral(color) {
      if (!color || color.a === 0) {
        return false;
      }
      const brightness = (color.r + color.g + color.b) / 3;
      const neutrality = Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b);
      return brightness >= state.settings.uiAutoThreshold && neutrality <= state.settings.uiAutoNeutrality;
    }
    function forbiddenStructuralElement(element) {
      if (!(element instanceof Element)) {
        return true;
      }
      if (!element.closest(".game-window-positioner")) {
        return true;
      }
      if (element.closest(".c-window,.window-on-peak")) {
        return true;
      }
      if (element.closest(`#${IDS.panel},#${IDS.button},.ln-fx`)) {
        return true;
      }
      if (element.closest(
        [
          "button",
          ".button",
          ".widget-button",
          ".widget-hamburger",
          ".usable-slot",
          ".skill-usable-slot",
          ".slot",
          ".eq-slot",
          ".item",
          ".bag-slot-wrapper",
          ".chat-channel-card",
          ".main-buttons-container",
          '[role="button"]'
        ].join(",")
      )) {
        return true;
      }
      return false;
    }
    function structuralShape(style) {
      const sides = [];
      if (state.settings.uiAutoBorder) {
        [
          ["top", style.borderTopWidth, style.borderTopColor],
          ["right", style.borderRightWidth, style.borderRightColor],
          ["bottom", style.borderBottomWidth, style.borderBottomColor],
          ["left", style.borderLeftWidth, style.borderLeftColor]
        ].forEach(
          ([side, width, color]) => {
            if ((parseFloat(width) || 0) >= 0.5 && brightNeutral(parseCssColor(color))) {
              sides.push(side);
            }
          }
        );
      }
      if (state.settings.uiAutoOutline && (parseFloat(style.outlineWidth) || 0) >= 0.5 && brightNeutral(parseCssColor(style.outlineColor))) {
        return "rect";
      }
      if (sides.length >= 3) {
        return "rect";
      }
      if (sides.includes("top") && sides.includes("bottom")) {
        return "topBottom";
      }
      if (sides.includes("left") && sides.includes("right")) {
        return "leftRight";
      }
      if (sides.includes("top")) {
        return "top";
      }
      if (sides.includes("bottom")) {
        return "bottom";
      }
      if (sides.includes("left")) {
        return "left";
      }
      if (sides.includes("right")) {
        return "right";
      }
      return null;
    }
    function collectUiTargets() {
      const result = [];
      const seen = /* @__PURE__ */ new Set();
      function add(element, shape, padding = 0, auto = false) {
        if (!element || !element.isConnected || !element.getClientRects().length || forbiddenStructuralElement(element)) {
          return;
        }
        const id = runtime.getElementId(element);
        if (seen.has(id)) {
          return;
        }
        seen.add(id);
        result.push({
          id,
          element,
          shape,
          padding,
          auto
        });
      }
      UI_TARGETS.forEach(
        (definition) => {
          if (!state.settings[definition.setting]) {
            return;
          }
          let elements = [];
          if (typeof definition.resolve === "function") {
            try {
              elements = definition.resolve() || [];
            } catch {
              elements = [];
            }
          } else if (definition.selector) {
            elements = document.querySelectorAll(definition.selector);
          }
          for (const element of elements) {
            add(element, definition.shape, definition.padding || 0, false);
          }
        }
      );
      if (state.settings.uiStructuralAuto) {
        const root = document.querySelector(".game-window-positioner .interface-layer");
        if (root) {
          const profile = runtime.getPerformanceProfile();
          const max = Math.min(
            Number(state.settings.uiAutoMaxTargets) || 20,
            profile.maxAutoTargets
          );
          const budget = profile.autoScanBudget;
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
          let found = 0;
          let scanned = 0;
          let element = null;
          while (scanned < budget && found < max && (element = walker.nextNode())) {
            scanned++;
            if (forbiddenStructuralElement(element)) {
              continue;
            }
            if (Math.max(element.clientWidth, element.clientHeight) < state.settings.uiAutoMinLength) {
              continue;
            }
            const style = getComputedStyle(element);
            const shape = structuralShape(style);
            if (!shape) {
              continue;
            }
            const before = result.length;
            add(element, shape, 0, true);
            if (result.length > before) {
              found++;
            }
          }
        }
      }
      return result;
    }
    function getHpForegroundRect(extra = 0) {
      const hp = document.querySelector(
        ".game-window-positioner .interface-layer .bottom-panel-of-bottom-positioner .hp-indicator-wrapper"
      );
      if (!hp || !hp.isConnected) {
        return null;
      }
      const rect = hp.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return null;
      }
      const pad = Math.max(0, Number(extra) || 0);
      return {
        left: rect.left - pad,
        top: rect.top - pad,
        right: rect.right + pad,
        bottom: rect.bottom + pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2
      };
    }
    function addVirtualEdge(wanted, key, rect, config, shape) {
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        return;
      }
      wanted.add(key);
      runtime.ensureVirtualOverlay(key, rect, config, shape);
    }
    function syncSegmentedShell(wanted, rect, config) {
      if (!rect) {
        return;
      }
      const hp = getHpForegroundRect(Math.max(18, Number(state.settings.uiFarBlur) * 0.55));
      addVirtualEdge(wanted, "ui:shell:tlr", rect, config, state.settings.uiTopFrame ? "leftRight" : "topLeftRight");
      if (state.settings.uiBottomFrame) {
        return;
      }
      const bottomBand = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom
      };
      if (!hp || hp.right <= rect.left || hp.left >= rect.right || hp.top >= rect.bottom || hp.bottom <= rect.top) {
        addVirtualEdge(wanted, "ui:shell:bottom", bottomBand, config, "bottom");
        return;
      }
      const gapLeft = runtime.clamp(hp.left, rect.left, rect.right);
      const gapRight = runtime.clamp(hp.right, rect.left, rect.right);
      if (gapLeft - rect.left > 2) {
        addVirtualEdge(
          wanted,
          "ui:shell:bottom-left",
          {
            left: rect.left,
            top: rect.top,
            width: gapLeft - rect.left,
            height: rect.height,
            right: gapLeft,
            bottom: rect.bottom
          },
          config,
          "bottom"
        );
      }
      if (rect.right - gapRight > 2) {
        addVirtualEdge(
          wanted,
          "ui:shell:bottom-right",
          {
            left: gapRight,
            top: rect.top,
            width: rect.right - gapRight,
            height: rect.height,
            right: rect.right,
            bottom: rect.bottom
          },
          config,
          "bottom"
        );
      }
    }
    function syncSegmentedBottomFrame(wanted, config) {
      if (!state.settings.uiBottomFrame) {
        return;
      }
      const positioner = document.querySelector(".game-window-positioner .interface-layer .positioner.bottom");
      if (!positioner || !positioner.isConnected) {
        return;
      }
      const rect = positioner.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }
      const hp = getHpForegroundRect(Math.max(18, Number(state.settings.uiFarBlur) * 0.55));
      addVirtualEdge(
        wanted,
        "ui:bottom:edge-bottom",
        {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom
        },
        config,
        "bottom"
      );
      if (!hp || hp.right <= rect.left || hp.left >= rect.right || hp.top >= rect.bottom || hp.bottom <= rect.top) {
        addVirtualEdge(
          wanted,
          "ui:bottom:edge-top",
          {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            right: rect.right,
            bottom: rect.bottom
          },
          config,
          "top"
        );
        return;
      }
      const gapLeft = runtime.clamp(hp.left, rect.left, rect.right);
      const gapRight = runtime.clamp(hp.right, rect.left, rect.right);
      if (gapLeft - rect.left > 2) {
        addVirtualEdge(
          wanted,
          "ui:bottom:edge-top-left",
          {
            left: rect.left,
            top: rect.top,
            width: gapLeft - rect.left,
            height: rect.height,
            right: gapLeft,
            bottom: rect.bottom
          },
          config,
          "top"
        );
      }
      if (rect.right - gapRight > 2) {
        addVirtualEdge(
          wanted,
          "ui:bottom:edge-top-right",
          {
            left: gapRight,
            top: rect.top,
            width: rect.right - gapRight,
            height: rect.height,
            right: rect.right,
            bottom: rect.bottom
          },
          config,
          "top"
        );
      }
    }
    function uiDelay(target, lootRect) {
      const span = runtime.clamp(state.settings.uiWaveSpan, 0.1, 3);
      if (state.settings.uiEffect === "cascade") {
        return target.id % 11 / 10 * span;
      }
      if (state.settings.uiEffect === "lootWave" && lootRect) {
        const rect = target.element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const lx = lootRect.left + lootRect.width / 2;
        const ly = lootRect.top + lootRect.height / 2;
        return Math.hypot(x - lx, y - ly) / Math.hypot(innerWidth, innerHeight) * span;
      }
      return 0;
    }
    function syncUi(wanted, lootRoot, force = false) {
      if (!state.settings.uiEnabled || state.settings.uiEffect === "none") {
        return;
      }
      const now = performance.now();
      const profile = runtime.getPerformanceProfile();
      if (!force && !state.uiDirty && !state.layoutDirty && now < state.nextUiRefresh) {
        state.uiTargets.forEach(
          (target) => {
            wanted.add("ui:" + target.id);
          }
        );
        if (state.settings.uiShellFrame) {
          ["ui:shell:tlr", "ui:shell:bottom", "ui:shell:bottom-left", "ui:shell:bottom-right"].forEach(
            (key) => {
              if (state.overlays.has(key)) {
                wanted.add(key);
              }
            }
          );
        }
        if (state.settings.uiBottomFrame) {
          ["ui:bottom:edge-bottom", "ui:bottom:edge-top", "ui:bottom:edge-top-left", "ui:bottom:edge-top-right"].forEach(
            (key) => {
              if (state.overlays.has(key)) {
                wanted.add(key);
              }
            }
          );
        }
        return;
      }
      state.nextUiRefresh = now + profile.uiRefreshMs;
      state.uiDirty = false;
      state.uiTargets = collectUiTargets();
      const config = runtime.uiConfig();
      if (state.settings.uiShellFrame) {
        const baseRect = getUiShellRect();
        if (baseRect) {
          const shellPadding = Number(state.settings.uiShellPadding) || 0;
          const shellLeft = shellPadding + (Number(state.settings.uiShellLeft) || 0);
          const shellRight = shellPadding + (Number(state.settings.uiShellRight) || 0);
          const shellTop = shellPadding + (Number(state.settings.uiShellTop) || 0);
          const shellBottom = shellPadding + (Number(state.settings.uiShellBottom) || 0);
          const rect = {
            left: baseRect.left - shellLeft,
            top: baseRect.top - shellTop,
            right: baseRect.right + shellRight,
            bottom: baseRect.bottom + shellBottom,
            width: baseRect.width + shellLeft + shellRight,
            height: baseRect.height + shellTop + shellBottom
          };
          syncSegmentedShell(
            wanted,
            rect,
            {
              ...config,
              padding: 0,
              left: 0,
              right: 0,
              top: 0,
              bottom: 0
            }
          );
        }
      }
      syncSegmentedBottomFrame(
        wanted,
        {
          ...config,
          padding: Number(state.settings.uiPadding) || 0
        }
      );
      const lootRect = lootRoot ? lootRoot.getBoundingClientRect() : null;
      state.uiTargets.forEach(
        (target) => {
          const key = "ui:" + target.id;
          wanted.add(key);
          runtime.ensureOverlay(
            key,
            target.element,
            {
              ...config,
              padding: config.padding + (Number(target.padding) || 0)
            },
            target.shape,
            uiDelay(target, lootRect),
            true
          );
        }
      );
    }
    return { getUiShellRect, parseCssColor, brightNeutral, forbiddenStructuralElement, structuralShape, collectUiTargets, getHpForegroundRect, addVirtualEdge, syncSegmentedShell, syncSegmentedBottomFrame, uiDelay, syncUi };
  }

  // src/addons/legendary-notificator/renderer.js
  function createRenderer(state, ctx, runtime) {
    function syncWorld() {
      let world = document.getElementById(IDS.world);
      if (!state.settings.worldEnabled) {
        world?.remove();
        state.worldSignature = "";
        return;
      }
      if (!world) {
        world = document.createElement("div");
        world.id = IDS.world;
        document.body.appendChild(world);
      }
      const factor = state.settings.performanceMode === "eco" ? 0.55 : 1;
      const alpha = runtime.clamp(state.settings.worldPower * factor, 0, 0.4);
      const signature = `${state.settings.worldColor}|${alpha}`;
      if (signature === state.worldSignature) {
        return;
      }
      state.worldSignature = signature;
      world.style.boxShadow = `inset 0 0 80px ${runtime.rgba(state.settings.worldColor, alpha)}`;
    }
    function syncEffects(force = false) {
      if (!state.active) {
        return;
      }
      if (state.settings.pauseWhenHidden && document.hidden) {
        return;
      }
      const targets = runtime.resolveStandardTargets(force);
      if (!targets.root || !targets.loot) {
        if (state.windowSeen || performance.now() > state.waitForLootUntil) {
          clearEffect();
        }
        return;
      }
      state.windowSeen = true;
      runtime.syncActiveLootObserver(targets.root);
      const wanted = /* @__PURE__ */ new Set();
      const map = {
        outer: targets.outer,
        loot: targets.loot ? [targets.loot] : [],
        card: targets.card,
        item: targets.item,
        confirm: targets.confirm,
        canvas: targets.canvas
      };
      const reposition = force || state.layoutDirty || state.geometryDirty;
      ["outer", "loot", "card", "item", "confirm", "canvas"].forEach(
        (prefix) => {
          const config = runtime.targetConfig(prefix);
          if (config.effect === "none") {
            return;
          }
          const list = map[prefix];
          list.forEach(
            (element) => {
              const key = `${prefix}:${runtime.getElementId(
                element
              )}`;
              wanted.add(key);
              runtime.ensureOverlay(key, element, config, "rect", 0, reposition);
            }
          );
        }
      );
      runtime.syncUi(wanted, targets.root, force);
      syncWorld();
      runtime.removeUnusedOverlays(wanted);
      runtime.syncObservedElements(targets);
      state.layoutDirty = false;
      state.geometryDirty = false;
    }
    function clearSettleTimers() {
      state.settleTimers.forEach((timer) => ctx.scheduler.clearTimeout(timer));
      state.settleTimers.clear();
    }
    function requestSync(force = false) {
      if (!state.active) {
        return;
      }
      state.pendingForceSync = state.pendingForceSync || force;
      if (state.syncRaf) {
        return;
      }
      state.syncRaf = ctx.scheduler.frame(
        () => {
          state.syncRaf = 0;
          const doForce = state.pendingForceSync;
          state.pendingForceSync = false;
          syncEffects(doForce);
        }
      );
    }
    function stopLoop() {
      if (state.syncRaf) {
        ctx.scheduler.cancelFrame(state.syncRaf);
      }
      state.syncRaf = 0;
      state.pendingForceSync = false;
      if (state.maintenanceTimer) {
        ctx.scheduler.clearTimeout(state.maintenanceTimer);
      }
      state.maintenanceTimer = 0;
      clearSettleTimers();
    }
    function scheduleMaintenance() {
      if (!state.active) {
        return;
      }
      const profile = runtime.getPerformanceProfile();
      state.maintenanceTimer = ctx.scheduler.timeout(
        () => {
          state.maintenanceTimer = 0;
          if (!state.active) {
            return;
          }
          if (!document.hidden || !state.settings.pauseWhenHidden) {
            syncEffects(false);
          }
          scheduleMaintenance();
        },
        profile.maintenanceMs
      );
    }
    function startLoop() {
      stopLoop();
      requestSync(true);
      scheduleMaintenance();
    }
    function activateEffect(duration) {
      if (!ctx.enabled) {
        return;
      }
      clearEffect();
      state.active = true;
      state.windowSeen = false;
      state.waitForLootUntil = performance.now() + 1600;
      state.uiDirty = true;
      state.layoutDirty = true;
      state.geometryDirty = true;
      state.cachedTargets = null;
      state.nextUiRefresh = 0;
      state.nextTargetRefresh = 0;
      startLoop();
      [40, 120, 280, 600].forEach(
        (delay) => {
          const timer = ctx.scheduler.timeout(
            () => {
              state.settleTimers.delete(timer);
              if (state.active) {
                state.cachedTargets = null;
                state.geometryDirty = true;
                requestSync(true);
              }
            },
            delay
          );
          state.settleTimers.add(timer);
        }
      );
      state.clearTimer = ctx.scheduler.timeout(clearEffect, runtime.clamp(duration, 1, 120) * 1e3);
    }
    function clearEffect() {
      state.active = false;
      state.windowSeen = false;
      state.waitForLootUntil = 0;
      if (state.clearTimer) {
        ctx.scheduler.clearTimeout(state.clearTimer);
      }
      state.clearTimer = 0;
      stopLoop();
      runtime.clearOverlays();
      runtime.clearObservedElements();
      runtime.syncActiveLootObserver(null);
      document.getElementById(IDS.world)?.remove();
      state.worldSignature = "";
      state.cachedTargets = null;
      state.uiTargets = [];
      state.uiDirty = true;
      state.layoutDirty = true;
      state.geometryDirty = true;
    }
    return { syncWorld, syncEffects, clearSettleTimers, requestSync, stopLoop, scheduleMaintenance, startLoop, activateEffect, clearEffect };
  }

  // src/addons/legendary-notificator/observers.js
  function createObservers(state, ctx, runtime) {
    function nodeTouchesLoot(node) {
      if (!(node instanceof Element)) {
        return false;
      }
      return Boolean(
        node.matches?.(SELECTORS.lootRoot) || node.matches?.(LEGENDARY_DOM_SELECTOR) || node.querySelector?.(SELECTORS.lootRoot) || node.querySelector?.(LEGENDARY_DOM_SELECTOR) || node.closest?.(SELECTORS.lootRoot)
      );
    }
    function markLayoutDirty(forceTargets = false, affectUiLayout = false) {
      if (!state.active) {
        return;
      }
      state.geometryDirty = true;
      if (affectUiLayout) {
        state.layoutDirty = true;
        state.uiDirty = true;
        state.nextUiRefresh = 0;
      }
      if (forceTargets) {
        state.cachedTargets = null;
        state.nextTargetRefresh = 0;
      }
      runtime.requestSync(forceTargets);
    }
    function syncActiveLootObserver(root) {
      if (state.observedLootRoot === root) {
        return;
      }
      state.activeLootObserver?.disconnect();
      state.activeLootObserver = null;
      state.observedLootRoot = root || null;
      if (!root) {
        return;
      }
      state.activeLootObserver = ctx.scheduler.observer(
        MutationObserver,
        () => {
          markLayoutDirty(false);
        }
      );
      state.activeLootObserver.observe(
        root,
        {
          attributes: true,
          attributeFilter: ["style", "class"],
          subtree: false
        }
      );
    }
    function clearObservedElements() {
      if (state.resizeObserver) {
        state.observedElements.forEach(
          (element) => {
            try {
              state.resizeObserver.unobserve(element);
            } catch {
            }
          }
        );
      }
      state.observedElements.clear();
    }
    function syncObservedElements(targets) {
      if (!state.resizeObserver) {
        return;
      }
      const next = /* @__PURE__ */ new Set();
      const add = (element) => {
        if (element instanceof Element && element.isConnected) {
          next.add(element);
        }
      };
      add(targets.root);
      add(targets.loot);
      [targets.outer, targets.card, targets.item, targets.confirm, targets.canvas].forEach((list) => list?.forEach(add));
      state.uiTargets.forEach((target) => add(target.element));
      [
        ".game-window-positioner .interface-layer .left-column.main-column",
        ".game-window-positioner .game-layer",
        ".game-window-positioner .interface-layer .right-column.main-column",
        ".game-window-positioner .interface-layer .positioner.bottom",
        ".game-window-positioner .interface-layer .bottom-panel-of-bottom-positioner .hp-indicator-wrapper"
      ].forEach((selector) => add(document.querySelector(selector)));
      state.observedElements.forEach(
        (element) => {
          if (!next.has(element)) {
            try {
              state.resizeObserver.unobserve(element);
            } catch {
            }
          }
        }
      );
      next.forEach(
        (element) => {
          if (!state.observedElements.has(element)) {
            try {
              state.resizeObserver.observe(element);
            } catch {
            }
          }
        }
      );
      state.observedElements.clear();
      next.forEach((element) => state.observedElements.add(element));
    }
    function startObservers() {
      if (typeof ResizeObserver === "function") {
        state.resizeObserver = ctx.scheduler.observer(
          ResizeObserver,
          (entries) => {
            const affectsUiLayout = entries.some((entry) => !entry.target.closest?.(SELECTORS.lootRoot));
            markLayoutDirty(false, affectsUiLayout);
          }
        );
      }
      if (typeof MutationObserver === "function" && document.body) {
        state.domObserver = ctx.scheduler.observer(
          MutationObserver,
          (mutations) => {
            if (!state.active) {
              return;
            }
            let relevant = false;
            for (const mutation of mutations) {
              if (mutation.type === "attributes") {
                const target = mutation.target;
                if (target instanceof Element && target.closest?.(SELECTORS.lootRoot)) {
                  relevant = true;
                  break;
                }
              }
              for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) {
                if (nodeTouchesLoot(node)) {
                  relevant = true;
                  break;
                }
              }
              if (relevant) {
                break;
              }
            }
            if (relevant) {
              markLayoutDirty(true);
            }
          }
        );
        state.domObserver.observe(
          document.body,
          {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["data-item-type", "data-frame-mania-rarity"]
          }
        );
      }
    }
    function stopObservers() {
      state.resizeObserver?.disconnect();
      state.domObserver?.disconnect();
      state.activeLootObserver?.disconnect();
      state.resizeObserver = null;
      state.domObserver = null;
      state.activeLootObserver = null;
      state.observedLootRoot = null;
      state.observedElements.clear();
    }
    function setVisualPlaybackPaused(paused) {
      document.documentElement.classList.toggle("ln580-fx-paused", Boolean(paused));
      for (const entry of state.overlays.values()) {
        const animations = entry.overlay?._motionSvg?._animations || [];
        animations.forEach(
          (animation) => {
            try {
              if (paused) {
                animation.pause();
              } else {
                animation.play();
              }
            } catch {
            }
          }
        );
      }
    }
    function bindLayoutEvents() {
      ctx.events.on("layoutChanged", () => markLayoutDirty(true, true));
      ctx.events.on("lootScrolled", () => markLayoutDirty(false));
      ctx.events.on("visibilityChanged", () => {
        setVisualPlaybackPaused(state.settings.pauseWhenHidden && document.hidden);
        if (!document.hidden) markLayoutDirty(true, true);
      });
    }
    return { nodeTouchesLoot, markLayoutDirty, syncActiveLootObserver, clearObservedElements, syncObservedElements, startObservers, stopObservers, setVisualPlaybackPaused, bindLayoutEvents };
  }

  // src/addons/legendary-notificator/test-loot.js
  function createTestLoot(state, ctx, runtime) {
    function getGameItems() {
      try {
        const tested = ctx.game.page.Engine?.items?.test?.();
        if (tested?.items) {
          return tested.items;
        }
      } catch {
      }
      return ctx.game.page.Engine?.items?.items || ctx.game.page.g?.item || ctx.game.page.g?.items || {};
    }
    function findTestItem() {
      const items = Object.values(
        getGameItems() || {}
      );
      return items.find((item) => /torba\s+podr[oó]żna/i.test(String(item?.name || ""))) || items.find((item) => /\btorba\b/i.test(String(item?.name || ""))) || items[0] || null;
    }
    function legendaryStat(item) {
      let stat = String(item?.stat || "").split(";").filter(Boolean).filter((part) => !/^rarity=/i.test(part)).join(";");
      if (stat) {
        stat += ";";
      }
      return stat + "rarity=legendary";
    }
    function testLoot() {
      if (!ctx.enabled) return;
      const item = findTestItem();
      if (!item) {
        alert("Legendary Notificator: brak przedmiotu testowego.");
        return;
      }
      const comm = ctx.game.page.Engine?.communication;
      if (!comm || typeof comm.parseJSON !== "function") {
        alert("Legendary Notificator: komunikacja gry nie jest jeszcze dostępna.");
        return;
      }
      const heroId = ctx.game.page.Engine?.hero?.d?.id ?? ctx.game.page.Engine?.hero?.id ?? ctx.game.page.g?.hero?.id ?? 0;
      const eventValue = Number(ctx.game.page.Engine?.ev ?? ctx.game.page.g?.ev);
      const eventTime = Number.isFinite(eventValue) && eventValue > 0 ? eventValue : Math.floor(Date.now() / 1e3);
      const fakeLoot = {
        loot: {
          init: 1,
          endTs: Math.floor(eventTime + 15),
          source: "legendary_notificator_v580_test",
          states: {
            1: 1
          }
        },
        item: {
          1: {
            id: 1,
            hid: item.hid ?? item.id ?? 1,
            tpl: item.tpl ?? 0,
            name: item.name || "Torba podróżna",
            own: heroId,
            loc: "l",
            icon: item.icon ?? "",
            x: item.x ?? 0,
            y: item.y ?? 0,
            cl: item.cl ?? 0,
            pr: item.pr ?? 0,
            st: item.st ?? 1,
            prc: "zl",
            stat: legendaryStat(item)
          }
        }
      };
      try {
        comm.parseJSON(fakeLoot);
      } catch (error) {
        console.error("[Legendary Notificator TEST]", error);
        alert("Legendary Notificator: klient gry odrzucił test.");
      }
    }
    return { getGameItems, findTestItem, legendaryStat, testLoot };
  }

  // src/addons/legendary-notificator/detection.js
  function createDetection(state, ctx, runtime) {
    function isLegendary(item) {
      if (!item || typeof item !== "object") {
        return false;
      }
      const rarity = item?._cachedStats?.rarity ?? item?.cachedStats?.rarity ?? item?.rarity;
      if (typeof rarity === "string" && /legend/i.test(rarity)) {
        return true;
      }
      const stat = String(item.stat || "");
      return /(?:^|;)rarity=(?:legendary|legend|l)(?:;|$)/i.test(stat) || /(?:^|;)legbon_/i.test(stat);
    }
    function getLegendaryLootItems(data) {
      const items = data?.item || data?.items;
      if (!items || typeof items !== "object") {
        return [];
      }
      return Object.values(items).filter(
        (item) => {
          const loc = String(item?.loc ?? "").toLowerCase();
          return ["l", "loot", "k", "c", "colossus"].includes(loc) && isLegendary(item);
        }
      );
    }
    function processGameData(data) {
      if (!ctx.enabled || !data) {
        return;
      }
      if (Array.isArray(data)) {
        data.forEach(processGameData);
        return;
      }
      if (typeof data !== "object" || !data.loot) {
        return;
      }
      if (data.loot.init !== void 0 && !data.loot.init) {
        return;
      }
      if (!getLegendaryLootItems(data).length) {
        return;
      }
      let duration = state.settings.fallbackDuration;
      const eventTime = Number(ctx.game.page.Engine?.ev ?? ctx.game.page.g?.ev);
      const endTime = Number(data.loot.endTs);
      if (Number.isFinite(eventTime) && Number.isFinite(endTime) && endTime > eventTime) {
        duration = endTime - eventTime;
      }
      ctx.events.emit("legendaryLoot", { data, items: getLegendaryLootItems(data), duration });
      ctx.scheduler.timeout(
        () => {
          runtime.activateEffect(duration);
          runtime.playSound();
        },
        20
      );
    }
    return { isLegendary, getLegendaryLootItems, processGameData };
  }

  // src/addons/legendary-notificator/audio.js
  function createAudio(state, ctx, runtime) {
    function playSound() {
      if (state.settings.mute) {
        return;
      }
      const url = String(state.settings.customAudio || "").trim();
      if (url) {
        try {
          state.currentAudio?.pause();
          state.currentAudio = new Audio(url);
          state.currentAudio.play().catch(playBuiltInSound);
          return;
        } catch {
        }
      }
      playBuiltInSound();
    }
    function playBuiltInSound() {
      if (!ctx.enabled || ctx.scheduler.disposed) return;
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          return;
        }
        const context = new AudioContextClass();
        const releaseContext = ctx.scheduler.cleanup(() => {
          void context.close().catch(() => {
          });
        });
        const gain = context.createGain();
        gain.connect(context.destination);
        gain.gain.setValueAtTime(1e-4, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.1, context.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(1e-4, context.currentTime + 0.82);
        [523.25, 659.25, 783.99].forEach(
          (frequency, index) => {
            const oscillator = context.createOscillator();
            oscillator.type = "sine";
            oscillator.frequency.value = frequency;
            oscillator.connect(gain);
            oscillator.start(context.currentTime + index * 0.06);
            oscillator.stop(context.currentTime + 0.6 + index * 0.06);
          }
        );
        ctx.scheduler.timeout(
          () => {
            try {
              releaseContext();
              void context.close().catch(() => {
              });
            } catch {
            }
          },
          1200
        );
      } catch {
      }
    }
    return { playSound, playBuiltInSound };
  }

  // src/addons/legendary-notificator/target-config.js
  function createTargetConfig(state, ctx, runtime) {
    function targetConfig(prefix) {
      return {
        effect: state.settings[prefix + "Effect"] || "none",
        color: state.settings[prefix + "Color"] || "#42eee7",
        accent: state.settings[prefix + "Accent"] || "#ffffff",
        width: runtime.clamp(state.settings[prefix + "Width"], 1, 6),
        speed: runtime.clamp(state.settings[prefix + "Speed"], 0.4, 9),
        intensity: runtime.clamp(state.settings[prefix + "Intensity"], 0.1, 2),
        glow: Boolean(state.settings[prefix + "Glow"]),
        /*
         * Jedna logika 3 warstw, ale trzy geometrie cienia:
         * - outer: pełny daleki bloom,
         * - loot/canvas: kontrolowana ramka,
         * - card/item/confirm: ciasny obrys przedmiotu.
         *
         * Dzięki temu maksymalna W3 nadal może eksplodować na
         * oknie łupu, ale nie sumuje się w turkusową taflę na HUD.
         */
        glowProfile: prefix === "outer" ? "bloom" : ["card", "item", "confirm"].includes(prefix) ? "item" : "frame",
        ambient: Boolean(state.settings[prefix + "Ambient"]),
        padding: Number(state.settings[prefix + "Padding"]) || 0,
        direction: state.settings[prefix + "Direction"] || "cw",
        coreMode: "neon",
        coreOpacity: 1,
        /*
         * Canvas ma własny inward glow. Pozostałe elementy nadal
         * korzystają z globalnego przełącznika neonInside.
         */
        insetEnabled: prefix === "canvas" ? Boolean(state.settings.canvasInnerGlow) : Boolean(state.settings.neonInside),
        insetPower: prefix === "canvas" ? runtime.clamp(state.settings.canvasInnerIntensity, 0, 2) : 1,
        left: prefix === "outer" ? Number(state.settings.outerLeft) || 0 : 0,
        right: prefix === "outer" ? Number(state.settings.outerRight) || 0 : 0,
        top: prefix === "outer" ? Number(state.settings.outerTop) || 0 : 0,
        bottom: prefix === "outer" ? Number(state.settings.outerBottom) || 0 : 0
      };
    }
    function getUiColor() {
      switch (state.settings.uiColorSource) {
        case "loot":
          return state.settings.lootColor;
        case "item":
          return state.settings.itemColor;
        case "custom":
          return state.settings.uiColor;
        default:
          return state.settings.outerColor;
      }
    }
    function uiConfig() {
      return {
        effect: state.settings.uiEffect,
        color: getUiColor(),
        accent: state.settings.outerAccent || "#ffffff",
        width: runtime.clamp(state.settings.uiWidth, 1, 4),
        speed: runtime.clamp(state.settings.uiSpeed, 0.5, 9),
        intensity: runtime.clamp(state.settings.uiGlowPower, 0.1, 2),
        glow: true,
        glowProfile: "frame",
        ambient: false,
        padding: Number(state.settings.uiPadding) || 0,
        direction: state.settings.uiDirection || "cw",
        coreMode: state.settings.uiCoreMode,
        coreOpacity: runtime.clamp(state.settings.uiCoreOpacity, 0.1, 1),
        near: runtime.effectiveBlur(state.settings.uiNearBlur),
        far: runtime.effectiveBlur(state.settings.uiFarBlur),
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      };
    }
    return { targetConfig, getUiColor, uiConfig };
  }

  // src/addons/legendary-notificator/runtime.js
  function createRuntime(state, ctx) {
    Object.assign(state, {
      settings: ctx.settings,
      active: false,
      windowSeen: false,
      waitForLootUntil: 0,
      syncRaf: 0,
      pendingForceSync: false,
      maintenanceTimer: 0,
      clearTimer: 0,
      resizeObserver: null,
      domObserver: null,
      activeLootObserver: null,
      observedLootRoot: null,
      worldSignature: "",
      currentAudio: null,
      uiTargets: [],
      uiDirty: true,
      layoutDirty: true,
      geometryDirty: true,
      nextUiRefresh: 0,
      nextTargetRefresh: 0,
      cachedTargets: null,
      nextElementId: 1,
      elementIds: /* @__PURE__ */ new WeakMap(),
      overlays: /* @__PURE__ */ new Map(),
      localOverlayOwners: /* @__PURE__ */ new WeakMap(),
      settleTimers: /* @__PURE__ */ new Set(),
      observedElements: /* @__PURE__ */ new Set()
    });
    const runtime = {};
    Object.assign(runtime, createHelpers(state, ctx, runtime));
    Object.assign(runtime, createNeonEngine(state, ctx, runtime));
    Object.assign(runtime, createAnimations(state, ctx, runtime));
    Object.assign(runtime, createOverlays(state, ctx, runtime));
    Object.assign(runtime, createTargets(state, ctx, runtime));
    Object.assign(runtime, createHud(state, ctx, runtime));
    Object.assign(runtime, createRenderer(state, ctx, runtime));
    Object.assign(runtime, createObservers(state, ctx, runtime));
    Object.assign(runtime, createTestLoot(state, ctx, runtime));
    Object.assign(runtime, createDetection(state, ctx, runtime));
    Object.assign(runtime, createAudio(state, ctx, runtime));
    Object.assign(runtime, createTargetConfig(state, ctx, runtime));
    return runtime;
  }

  // src/addons/legendary-notificator/presets.js
  var FRAME_PRESET_BASE = {
    uiEnabled: true,
    uiCoreMode: "neon",
    uiCoreOpacity: 1,
    uiWidth: 1,
    uiSpeed: 2.8,
    uiDirection: "cw",
    uiGlowPower: 1,
    uiNearBlur: 7,
    uiFarBlur: 26,
    uiPadding: 0,
    uiWaveSpan: 1.15,
    uiShellFrame: true,
    uiShellPadding: 0,
    uiShellLeft: 0,
    uiShellRight: 0,
    uiShellTop: 0,
    uiShellBottom: 0,
    uiTopFrame: true,
    uiGameFrame: false,
    uiChatFrame: true,
    uiChatInnerLines: true,
    uiRightFrame: true,
    uiEquipmentFrame: true,
    uiInventoryFrame: true,
    uiBottomFrame: true,
    uiBattleFrame: true,
    uiStructuralAuto: false
  };
  function colorPack(main, accent = "#ffffff") {
    return {
      outerColor: main,
      outerAccent: accent,
      lootColor: main,
      lootAccent: accent,
      cardColor: main,
      cardAccent: accent,
      itemColor: main,
      itemAccent: accent,
      confirmColor: main,
      confirmAccent: accent,
      canvasColor: main,
      canvasAccent: accent
    };
  }
  var CYAN_LAYER_BASE = {
    multiLayerEnabled: true,
    neonCoreColor: "#efffff",
    neonCoreOpacity: 1,
    /*
     * Presety celowo NIE ustawiają dalekiej warstwy wysoko.
     * Przy tej matematyce szerokość W3 = 4/5 potrafi wygenerować
     * setki pikseli bloom na każdej ramce jednocześnie.
     * Maksymalny rozbłysk nadal można ustawić ręcznie w panelu.
     */
    neonLayer1Color: "#78fff7",
    neonLayer1Strength: 3,
    neonLayer1Opacity: 4,
    neonLayer1Width: 2,
    neonLayer2Color: "#22ddd7",
    neonLayer2Strength: 2,
    neonLayer2Opacity: 2,
    neonLayer2Width: 1,
    neonLayer3Color: "#078f9d",
    neonLayer3Strength: 1,
    neonLayer3Opacity: 1,
    neonLayer3Width: 1,
    neonInside: false,
    neonOutside: true,
    ambientPower: 0.05,
    ambientSpread: 18,
    ambientMode: "static"
  };
  var PRESETS = {
    referenceCyanTube: {
      ...FRAME_PRESET_BASE,
      ...CYAN_LAYER_BASE,
      ...colorPack("#42eee7", "#ffffff"),
      performanceMode: "balanced",
      animationBaseLine: true,
      animationBaseOpacity: 0.22,
      outerEffect: "static",
      outerWidth: 2,
      outerIntensity: 1,
      outerGlow: true,
      outerAmbient: false,
      lootEffect: "static",
      lootWidth: 2,
      lootIntensity: 0.92,
      lootGlow: true,
      lootAmbient: false,
      cardEffect: "static",
      cardWidth: 1,
      cardIntensity: 0.72,
      cardGlow: true,
      cardAmbient: false,
      itemEffect: "static",
      itemWidth: 1,
      itemIntensity: 0.88,
      itemGlow: true,
      itemAmbient: false,
      confirmEffect: "none",
      canvasEffect: "static",
      canvasWidth: 2,
      canvasIntensity: 0.42,
      canvasGlow: true,
      canvasAmbient: false,
      uiColorSource: "custom",
      uiColor: "#42eee7",
      uiEffect: "static",
      uiCoreMode: "neon",
      uiCoreOpacity: 1,
      uiWidth: 1,
      uiGlowPower: 0.42,
      worldEnabled: false
    },
    referenceCyanStrong: {
      ...FRAME_PRESET_BASE,
      ...CYAN_LAYER_BASE,
      ...colorPack("#42fff4", "#ffffff"),
      performanceMode: "balanced",
      /* mocniej, ale bez turkusowej mgły na całym ekranie */
      neonLayer1Strength: 4,
      neonLayer1Opacity: 5,
      neonLayer1Width: 2,
      neonLayer2Strength: 3,
      neonLayer2Opacity: 3,
      neonLayer2Width: 2,
      neonLayer3Strength: 3,
      neonLayer3Opacity: 2,
      neonLayer3Width: 2,
      ambientPower: 0.07,
      outerEffect: "static",
      lootEffect: "static",
      cardEffect: "static",
      itemEffect: "static",
      confirmEffect: "none",
      canvasEffect: "static",
      outerIntensity: 1.12,
      lootIntensity: 1.02,
      cardIntensity: 0.82,
      itemIntensity: 0.95,
      canvasIntensity: 0.52,
      uiColorSource: "custom",
      uiColor: "#42fff4",
      uiEffect: "static",
      uiGlowPower: 0.52,
      worldEnabled: false
    },
    referenceCyanBreathe: {
      ...FRAME_PRESET_BASE,
      ...CYAN_LAYER_BASE,
      ...colorPack("#42eee7", "#ffffff"),
      animationBaseLine: true,
      animationBaseOpacity: 0.2,
      outerEffect: "breathe",
      lootEffect: "breathe",
      cardEffect: "breathe",
      itemEffect: "heartbeat",
      confirmEffect: "none",
      canvasEffect: "breathe",
      outerIntensity: 0.96,
      lootIntensity: 0.88,
      cardIntensity: 0.68,
      itemIntensity: 0.82,
      canvasIntensity: 0.38,
      uiColorSource: "custom",
      uiColor: "#42eee7",
      uiEffect: "breathe",
      uiGlowPower: 0.38,
      outerSpeed: 2.4,
      lootSpeed: 2.4,
      cardSpeed: 2.4,
      itemSpeed: 2.4,
      canvasSpeed: 2.4,
      uiSpeed: 2.4,
      worldEnabled: false
    },
    referenceCyanOrbit: {
      ...FRAME_PRESET_BASE,
      ...CYAN_LAYER_BASE,
      ...colorPack("#42eee7", "#ffffff"),
      /* ruch ma być czytelny, więc mniej statycznego bloom */
      neonLayer1Width: 1,
      neonLayer2Strength: 1,
      neonLayer2Opacity: 1,
      neonLayer2Width: 1,
      neonLayer3Strength: 1,
      neonLayer3Opacity: 1,
      neonLayer3Width: 1,
      animationBaseLine: true,
      animationBaseOpacity: 0.2,
      outerEffect: "orbit",
      lootEffect: "orbit",
      cardEffect: "orbit",
      itemEffect: "comet",
      confirmEffect: "none",
      canvasEffect: "orbit",
      outerIntensity: 0.92,
      lootIntensity: 0.82,
      cardIntensity: 0.66,
      itemIntensity: 0.8,
      canvasIntensity: 0.34,
      uiColorSource: "custom",
      uiColor: "#42eee7",
      uiEffect: "orbit",
      uiGlowPower: 0.34,
      outerSpeed: 3,
      lootSpeed: 2.7,
      cardSpeed: 2.3,
      itemSpeed: 1.8,
      canvasSpeed: 5,
      uiSpeed: 4,
      worldEnabled: false
    },
    referenceCyanScanner: {
      ...FRAME_PRESET_BASE,
      ...CYAN_LAYER_BASE,
      ...colorPack("#42eee7", "#ffffff"),
      /* scanner = ostra kreska, bez dalekiej trzeciej warstwy */
      neonLayer1Strength: 3,
      neonLayer1Opacity: 4,
      neonLayer1Width: 1,
      neonLayer2Strength: 1,
      neonLayer2Opacity: 1,
      neonLayer2Width: 1,
      neonLayer3Strength: 0,
      neonLayer3Opacity: 0,
      neonLayer3Width: 0,
      animationBaseLine: true,
      animationBaseOpacity: 0.16,
      outerEffect: "scannerCross",
      lootEffect: "scannerCross",
      cardEffect: "scannerV",
      itemEffect: "scannerCross",
      confirmEffect: "none",
      canvasEffect: "scannerCross",
      outerIntensity: 0.86,
      lootIntensity: 0.78,
      cardIntensity: 0.62,
      itemIntensity: 0.76,
      canvasIntensity: 0.3,
      uiColorSource: "custom",
      uiColor: "#42eee7",
      uiEffect: "scannerCross",
      uiGlowPower: 0.3,
      worldEnabled: false
    },
    referencePink: {
      ...FRAME_PRESET_BASE,
      multiLayerEnabled: true,
      neonCoreColor: "#fff4ff",
      neonCoreOpacity: 1,
      neonLayer1Color: "#ff75ee",
      neonLayer1Strength: 3,
      neonLayer1Opacity: 4,
      neonLayer1Width: 2,
      neonLayer2Color: "#ff21ce",
      neonLayer2Strength: 2,
      neonLayer2Opacity: 2,
      neonLayer2Width: 1,
      neonLayer3Color: "#9d137f",
      neonLayer3Strength: 1,
      neonLayer3Opacity: 1,
      neonLayer3Width: 1,
      neonInside: false,
      neonOutside: true,
      ambientPower: 0.05,
      ambientSpread: 18,
      ambientMode: "static",
      ...colorPack("#ff20d2", "#ffffff"),
      outerEffect: "static",
      lootEffect: "static",
      cardEffect: "static",
      itemEffect: "static",
      confirmEffect: "none",
      canvasEffect: "static",
      outerIntensity: 1,
      lootIntensity: 0.9,
      cardIntensity: 0.72,
      itemIntensity: 0.86,
      canvasIntensity: 0.4,
      uiColorSource: "custom",
      uiColor: "#ff20d2",
      uiEffect: "static",
      uiGlowPower: 0.4,
      worldEnabled: false
    },
    cyberViolet: {
      ...FRAME_PRESET_BASE,
      multiLayerEnabled: true,
      neonCoreColor: "#ffffff",
      neonCoreOpacity: 1,
      neonLayer1Color: "#d68cff",
      neonLayer1Strength: 3,
      neonLayer1Opacity: 4,
      neonLayer1Width: 2,
      neonLayer2Color: "#9a4dff",
      neonLayer2Strength: 2,
      neonLayer2Opacity: 2,
      neonLayer2Width: 1,
      neonLayer3Color: "#542283",
      neonLayer3Strength: 1,
      neonLayer3Opacity: 1,
      neonLayer3Width: 1,
      neonInside: false,
      neonOutside: true,
      ambientPower: 0.05,
      ambientSpread: 18,
      ambientMode: "static",
      ...colorPack("#a34fff", "#ff6de6"),
      outerEffect: "dual",
      lootEffect: "orbit",
      cardEffect: "breathe",
      itemEffect: "comet",
      confirmEffect: "none",
      canvasEffect: "dual",
      outerIntensity: 0.92,
      lootIntensity: 0.84,
      cardIntensity: 0.68,
      itemIntensity: 0.82,
      canvasIntensity: 0.34,
      uiColorSource: "custom",
      uiColor: "#a34fff",
      uiEffect: "cascade",
      uiGlowPower: 0.34,
      worldEnabled: false
    },
    goldenLegend: {
      ...FRAME_PRESET_BASE,
      multiLayerEnabled: true,
      neonCoreColor: "#fffde8",
      neonCoreOpacity: 1,
      neonLayer1Color: "#fff29a",
      neonLayer1Strength: 3,
      neonLayer1Opacity: 4,
      neonLayer1Width: 2,
      neonLayer2Color: "#ffd742",
      neonLayer2Strength: 2,
      neonLayer2Opacity: 2,
      neonLayer2Width: 1,
      neonLayer3Color: "#a66e09",
      neonLayer3Strength: 1,
      neonLayer3Opacity: 1,
      neonLayer3Width: 1,
      neonInside: false,
      neonOutside: true,
      ambientPower: 0.05,
      ambientSpread: 18,
      ambientMode: "static",
      ...colorPack("#ffd742", "#ffffff"),
      outerEffect: "static",
      lootEffect: "static",
      cardEffect: "static",
      itemEffect: "static",
      confirmEffect: "none",
      canvasEffect: "static",
      outerIntensity: 1,
      lootIntensity: 0.9,
      cardIntensity: 0.72,
      itemIntensity: 0.86,
      canvasIntensity: 0.4,
      uiColorSource: "custom",
      uiColor: "#ffd742",
      uiEffect: "static",
      uiGlowPower: 0.4,
      worldEnabled: false
    },
    performance: {
      ...FRAME_PRESET_BASE,
      ...CYAN_LAYER_BASE,
      ...colorPack("#42eee7", "#ffffff"),
      performanceMode: "eco",
      neonLayer1Strength: 2,
      neonLayer1Opacity: 3,
      neonLayer1Width: 1,
      neonLayer2Strength: 1,
      neonLayer2Opacity: 1,
      neonLayer2Width: 1,
      neonLayer3Strength: 0,
      neonLayer3Opacity: 0,
      neonLayer3Width: 0,
      ambientPower: 0,
      outerEffect: "static",
      lootEffect: "static",
      cardEffect: "static",
      itemEffect: "static",
      confirmEffect: "none",
      canvasEffect: "static",
      outerIntensity: 0.82,
      lootIntensity: 0.74,
      cardIntensity: 0.58,
      itemIntensity: 0.72,
      canvasIntensity: 0.26,
      outerAmbient: false,
      lootAmbient: false,
      cardAmbient: false,
      itemAmbient: false,
      canvasAmbient: false,
      worldEnabled: false,
      uiColorSource: "custom",
      uiColor: "#42eee7",
      uiEffect: "static",
      uiGlowPower: 0.26
    },
    minimal: {
      ...FRAME_PRESET_BASE,
      multiLayerEnabled: false,
      ...colorPack("#42d9d1", "#ffffff"),
      performanceMode: "eco",
      outerEffect: "static",
      outerGlow: false,
      outerIntensity: 0.7,
      lootEffect: "none",
      cardEffect: "none",
      itemEffect: "static",
      itemGlow: false,
      itemIntensity: 0.72,
      confirmEffect: "none",
      canvasEffect: "none",
      uiEffect: "static",
      uiCoreMode: "original",
      uiGlowPower: 0.18,
      worldEnabled: false
    }
  };

  // src/core/ui/tabs.js
  function setPanelTab(panel2, tabId, persist) {
    const buttons = [...panel2.querySelectorAll(".ln-tab-button[data-tab]")];
    if (!buttons.some((button) => button.dataset.tab === tabId)) tabId = "general";
    buttons.forEach((button) => button.classList.toggle("active", button.dataset.tab === tabId));
    panel2.querySelectorAll(".ln-tab-pane[data-pane]").forEach((pane) => {
      pane.classList.toggle("active", pane.dataset.pane === tabId);
    });
    persist?.(tabId);
  }
  function panelTabButton(id, label, description) {
    return `<button type="button" class="ln-tab-button" data-tab="${id}">${label}<small>${description}</small></button>`;
  }
  function panelTabPane(id, content) {
    return `<div class="ln-tab-pane" data-pane="${id}">${content}</div>`;
  }

  // src/addons/legendary-notificator/settings-ui.js
  var VERSION2 = "6.2.1";
  function createSettingsUi(state, ctx, runtime) {
    function effectOptions() {
      return `<option value="none"> Wyłączone </option> <option value="static"> Statyczny neon </option> <option value="breathe"> Oddychanie </option> <option value="pulse"> Pulsowanie </option> <option value="heartbeat"> Podwójny impuls </option> <option value="orbit"> Krążący neon </option> <option value="dual"> Dwa krążące neony </option> <option value="comet"> Neonowa kometa </option> <option value="scannerH"> Skaner poziomy </option> <option value="scannerV"> Skaner pionowy </option> <option value="scannerCross"> Skaner krzyżowy </option>`;
    }
    function directionOptions() {
      return `<option value="cw"> Normalny </option> <option value="ccw"> Odwrócony </option>`;
    }
    function targetSection(prefix, title, help) {
      return `<section class="ln-section"> <div class="ln-section-head"> <span> ${title} </span> <span> FX </span> </div> <div class="ln-grid"> <label class="ln-field ln-full"> <span class="ln-label"> Animacja </span> <select data-key="${prefix}Effect" > ${effectOptions()} </select> <span class="ln-help"> ${help} </span> </label> <label class="ln-switch"> <input type="checkbox" data-key="${prefix}Glow" > <span> Backlight </span> </label> <label class="ln-switch"> <input type="checkbox" data-key="${prefix}Ambient" > <span> Glow powierzchni </span> </label> <label class="ln-field"> <span class="ln-label"> Kolor bazowy </span> <input type="color" data-key="${prefix}Color" > </label> <label class="ln-field"> <span class="ln-label"> Akcent animacji </span> <input type="color" data-key="${prefix}Accent" > </label> ${rangeHtml(prefix + "Width", "Grubość", 1, 6, 1, " px")} ${rangeHtml(prefix + "Speed", "Czas animacji", 0.4, 9, 0.05, " s")} ${rangeHtml(prefix + "Intensity", "Moc", 0.1, 2, 0.05, "×")} ${rangeHtml(prefix + "Padding", "Odsunięcie", -8, 16, 1, " px")} <label class="ln-field ln-full"> <span class="ln-label"> Kierunek </span> <select data-key="${prefix}Direction" > ${directionOptions()} </select> </label> </div> </section>`;
    }
    function canvasSection() {
      return `${targetSection("canvas", "GAME CANVAS", "#GAME_CANVAS")}
        <section class="ln-section">
            <div class="ln-section-head">
                <span>ŚWIATŁO DO ŚRODKA</span>
                <span>INNER</span>
            </div>
            <div class="ln-grid">
                <label class="ln-switch ln-full">
                    <input type="checkbox" data-key="canvasInnerGlow">
                    <span>Świeć również do wnętrza pola gry</span>
                </label>
                ${rangeHtml("canvasInnerIntensity", "Moc światła do środka", 0, 2, 0.05, "×")}
                <div class="ln-help ln-full">
                    Ta poświata jest rysowana nad mapą, ale nadal wewnątrz warstwy pola gry,
                    więc HUD i tooltipy pozostają nad nią.
                </div>
            </div>
        </section>`;
    }
    function multiLayerSection() {
      return `<section class="ln-section"> <div class="ln-section-head"> <span> WIELOWARSTWOWY NEON </span> <span> 3 WARSTWY </span> </div> <div class="ln-grid"> <label class="ln-switch ln-full"> <input type="checkbox" data-key="multiLayerEnabled" > <span> Wielowarstwowa neonowa rurka </span> </label> <div class="ln-help ln-full"> Rdzeń + trzy warstwy światła. Każda warstwa ma osobno kolor, siłę, krycie i szerokość. Warstwa 1 trzyma światło blisko rurki, warstwa 2 buduje średnią poświatę, a warstwa 3 odpowiada za najdalszy i najmocniej rozlany rozbłysk. </div> <label class="ln-field"> <span class="ln-label"> Rdzeń </span> <input type="color" data-key="neonCoreColor" > </label> ${rangeHtml("neonCoreOpacity", "Moc rdzenia", 0, 1, 0.01)} <div class="ln-help ln-full"> <b>WARSTWA 1 — BLISKA</b> </div> <label class="ln-field"> <span class="ln-label"> Kolor warstwy 1 </span> <input type="color" data-key="neonLayer1Color" > </label> ${rangeHtml("neonLayer1Strength", "Siła warstwy 1", 0, 5, 1)} ${rangeHtml("neonLayer1Opacity", "Krycie warstwy 1", 0, 5, 1)} ${rangeHtml("neonLayer1Width", "Szerokość warstwy 1", 0, 5, 1)} <div class="ln-help ln-full"> <b>WARSTWA 2 — ŚREDNIA</b> </div> <label class="ln-field"> <span class="ln-label"> Kolor warstwy 2 </span> <input type="color" data-key="neonLayer2Color" > </label> ${rangeHtml("neonLayer2Strength", "Siła warstwy 2", 0, 5, 1)} ${rangeHtml("neonLayer2Opacity", "Krycie warstwy 2", 0, 5, 1)} ${rangeHtml("neonLayer2Width", "Szerokość warstwy 2", 0, 5, 1)} <div class="ln-help ln-full"> <b>WARSTWA 3 — DALEKA</b><br> Na głównym oknie łupu ta warstwa odpowiada za duży rozbłysk i może mieć bardzo duży zasięg. Na HUD, mapie i pojedynczym przedmiocie ten sam poziom jest automatycznie renderowany ciaśniej, żeby kilka ramek nie zalewało całego ekranu. </div> <label class="ln-field"> <span class="ln-label"> Kolor warstwy 3 </span> <input type="color" data-key="neonLayer3Color" > </label> ${rangeHtml("neonLayer3Strength", "Siła warstwy 3", 0, 5, 1)} ${rangeHtml("neonLayer3Opacity", "Krycie warstwy 3", 0, 5, 1)} ${rangeHtml("neonLayer3Width", "Szerokość warstwy 3", 0, 5, 1)} <label class="ln-switch"> <input type="checkbox" data-key="neonInside" > <span> Świeć do środka </span> </label> <label class="ln-switch"> <input type="checkbox" data-key="neonOutside" > <span> Świeć na zewnątrz </span> </label> </div> </section>`;
    }
    function uiSection() {
      return `<section class="ln-section"> <div class="ln-section-head"> <span> RAMKI INTERFEJSU </span> <span> HUD </span> </div> <div class="ln-grid"> <label class="ln-switch ln-full"> <input type="checkbox" data-key="uiEnabled" > <span> Podświetlaj HUD </span> </label> <label class="ln-field"> <span class="ln-label"> Kolor bazowy z </span> <select data-key="uiColorSource" > <option value="outer"> Outer </option> <option value="loot"> Loot </option> <option value="item"> Item </option> <option value="custom"> Własny </option> </select> </label> <label class="ln-field"> <span class="ln-label"> Własny kolor </span> <input type="color" data-key="uiColor" > </label> <label class="ln-field ln-full"> <span class="ln-label"> Animacja </span> <select data-key="uiEffect" > ${effectOptions()} <option value="cascade"> Kaskada </option> <option value="lootWave"> Fala od łupu </option> </select> </label> <label class="ln-field"> <span class="ln-label"> Kierunek </span> <select data-key="uiDirection" > ${directionOptions()} </select> </label> <label class="ln-field"> <span class="ln-label"> Rdzeń klasyczny </span> <select data-key="uiCoreMode" > <option value="white"> Biały </option> <option value="original"> Oryginalny </option> <option value="neon"> Neonowy </option> </select> </label> ${rangeHtml("uiCoreOpacity", "Widoczność rdzenia", 0.1, 1, 0.01)} ${rangeHtml("uiGlowPower", "Moc HUD", 0.1, 2, 0.05, "×")} ${rangeHtml("uiWidth", "Grubość", 1, 4, 1, " px")} ${rangeHtml("uiSpeed", "Czas animacji", 0.5, 9, 0.05, " s")} ${rangeHtml("uiWaveSpan", "Rozrzut fali", 0.1, 3, 0.05, " s")} </div> </section> <section class="ln-section"> <div class="ln-section-head"> <span> NAJDALSZA RAMKA </span> <span> SHELL </span> </div> <div class="ln-grid"> <label class="ln-switch ln-full"> <input type="checkbox" data-key="uiShellFrame" > <span> Zewnętrzny obrys UI </span> </label> ${rangeHtml("uiShellPadding", "Globalne odsunięcie", -10, 14, 1, " px")} <div></div> ${rangeHtml("uiShellLeft", "Lewa", -12, 12, 1, " px")} ${rangeHtml("uiShellRight", "Prawa", -12, 12, 1, " px")} ${rangeHtml("uiShellTop", "Góra", -12, 12, 1, " px")} ${rangeHtml("uiShellBottom", "Dół", -12, 12, 1, " px")} </div> </section> <section class="ln-section"> <div class="ln-section-head"> <span> ELEMENTY HUD </span> <span> TARGETS </span> </div> <div class="ln-grid"> <label class="ln-switch"> <input type="checkbox" data-key="uiTopFrame"> <span>Górna belka</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiBottomFrame"> <span>Dolna belka</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiGameFrame"> <span>Pole gry</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiChatFrame"> <span>Chat</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiChatInnerLines"> <span>Linie chatu</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiRightFrame"> <span>Prawa kolumna</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiEquipmentFrame"> <span>Ekwipunek</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiInventoryFrame"> <span>Inventory</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiBattleFrame"> <span>Ramka walki</span> </label> </div> </section> <section class="ln-section"> <div class="ln-section-head"> <span> STRUCTURAL AUTO </span> <span> EXPERIMENTAL </span> </div> <div class="ln-grid"> <label class="ln-switch ln-full"> <input type="checkbox" data-key="uiStructuralAuto" > <span> Automatycznie wykrywaj duże ramki </span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiAutoBorder"> <span>Border</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiAutoOutline"> <span>Outline</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiAutoShadow"> <span>Shadow</span> </label> <div></div> ${rangeHtml("uiAutoThreshold", "Próg jasności", 35, 180, 1)} ${rangeHtml("uiAutoNeutrality", "Tolerancja szarości", 10, 130, 1)} ${rangeHtml("uiAutoMinLength", "Min. długość", 60, 400, 5, " px")} ${rangeHtml("uiAutoMaxTargets", "Limit", 5, 50, 1)} </div> </section>`;
    }
    function createPanel2() {
      const panel2 = document.createElement("div");
      panel2.id = IDS.panel;
      const generalTab = `
            <section class="ln-section">
                <div class="ln-section-head"><span>SYSTEM</span><span>CORE</span></div>
                <div class="ln-grid">
                    <label class="ln-switch">
                        <input type="checkbox" data-addon-enabled>
                        <span>Dodatek aktywny</span>
                    </label>
                    <div></div>

                    <label class="ln-field ln-full">
                        <span class="ln-label">Preset</span>
                        <div style="display:flex;gap:5px">
                            <select id="ln580-preset" style="flex:1">
                                <option value="referenceCyanTube">CYAN CLEAN</option>
                                <option value="referenceCyanStrong">CYAN STRONG</option>
                                <option value="referenceCyanBreathe">CYAN BREATHE</option>
                                <option value="referenceCyanOrbit">CYAN ORBIT</option>
                                <option value="referenceCyanScanner">CYAN SCANNER</option>
                                <option value="referencePink">PINK NEON</option>
                                <option value="cyberViolet">VIOLET NEON</option>
                                <option value="goldenLegend">GOLD NEON</option>
                                <option value="performance">PERFORMANCE</option>
                                <option value="minimal">MINIMAL</option>
                            </select>
                            <button class="ln-btn" data-action="preset">UŻYJ</button>
                        </div>
                    </label>
                </div>
            </section>

            <section class="ln-section">
                <div class="ln-section-head"><span>WYDAJNOŚĆ</span><span>PERFORMANCE</span></div>
                <div class="ln-grid">
                    <label class="ln-field ln-full">
                        <span class="ln-label">Tryb wydajności</span>
                        <select data-key="performanceMode">
                            <option value="eco">Oszczędny</option>
                            <option value="balanced">Zbalansowany</option>
                            <option value="quality">Jakość</option>
                        </select>
                    </label>

                    <label class="ln-switch ln-full">
                        <input type="checkbox" data-key="pauseWhenHidden">
                        <span>Wstrzymuj efekty w tle</span>
                    </label>

                    <label class="ln-switch ln-full">
                        <input type="checkbox" data-key="animationBaseLine">
                        <span>Stała rurka pod ruchomą animacją</span>
                    </label>

                    ${rangeHtml("animationBaseOpacity", "Moc stałej rurki", 0, 0.8, 0.01)}
                </div>
            </section>`;
      const neonTab = `
            ${multiLayerSection()}
            <section class="ln-section">
                <div class="ln-section-head"><span>AMBIENT</span><span>SURFACE</span></div>
                <div class="ln-grid">
                    ${rangeHtml("ambientPower", "Moc ambientu", 0, 0.6, 0.01)}
                    ${rangeHtml("ambientSpread", "Zasięg ambientu", 6, 60, 1, " px")}
                    <label class="ln-field ln-full">
                        <span class="ln-label">Zachowanie ambientu</span>
                        <select data-key="ambientMode">
                            <option value="static">Stały</option>
                            <option value="breathe">Oddychający</option>
                            <option value="pulse">Pulsujący</option>
                        </select>
                    </label>
                </div>
            </section>`;
      const outerTab = `
            ${targetSection("outer", "GŁÓWNA RAMKA ŁUPÓW", "Największa ramka okna Łupy.")}
            <section class="ln-section">
                <div class="ln-section-head"><span>DOPASOWANIE OUTER</span><span>PIXEL</span></div>
                <div class="ln-grid">
                    ${rangeHtml("outerLeft", "Lewa", -12, 12, 1, " px")}
                    ${rangeHtml("outerRight", "Prawa", -12, 12, 1, " px")}
                    ${rangeHtml("outerTop", "Góra", -12, 12, 1, " px")}
                    ${rangeHtml("outerBottom", "Dół", -12, 12, 1, " px")}
                </div>
            </section>`;
      const worldTab = `
            <section class="ln-section">
                <div class="ln-section-head"><span>OTOCZENIE</span><span>WORLD</span></div>
                <div class="ln-grid">
                    <label class="ln-switch">
                        <input type="checkbox" data-key="worldEnabled">
                        <span>Aura ekranu</span>
                    </label>
                    <label class="ln-field">
                        <span class="ln-label">Kolor</span>
                        <input type="color" data-key="worldColor">
                    </label>
                    ${rangeHtml("worldPower", "Moc", 0, 0.4, 0.01)}
                </div>
            </section>`;
      const audioTab = `
            <section class="ln-section">
                <div class="ln-section-head"><span>DŹWIĘK</span><span>AUDIO</span></div>
                <div class="ln-grid">
                    <label class="ln-switch">
                        <input type="checkbox" data-key="mute">
                        <span>Wycisz</span>
                    </label>
                    <div></div>

                    <label class="ln-field ln-full">
                        <span class="ln-label">URL dźwięku</span>
                        <input type="url" data-key="customAudio" placeholder="https://...">
                    </label>

                    ${rangeHtml("fallbackDuration", "Czas awaryjny", 1, 120, 1, " s")}
                </div>
            </section>`;
      panel2.innerHTML = `
            <div class="ln-panel-head">
                <div>
                    <div class="ln-panel-title">
                        LEGENDARY NOTIFICATOR
                        <span id="${IDS.status}" class="ln-status">AKTYWNY</span>
                    </div>
                    <div class="ln-panel-sub">v${VERSION2} / MULTILAYER NEON ENGINE</div>
                </div>
                <button class="ln-panel-close" data-action="close">×</button>
            </div>

            <div class="ln-panel-body">
                <nav class="ln-tabs">
                    ${panelTabButton("general", "OGÓLNE", "preset / wydajność")}
                    ${panelTabButton("neon", "NEON", "warstwy / ambient")}
                    ${panelTabButton("outer", "OKNO ŁUPÓW", "zewnętrzna ramka")}
                    ${panelTabButton("loot", "WNĘTRZE", "loot-window")}
                    ${panelTabButton("card", "KARTA", "karta legendy")}
                    ${panelTabButton("item", "LEGENDA", "ikona przedmiotu")}
                    ${panelTabButton("confirm", "POTWIERDŹ", "przycisk")}
                    ${panelTabButton("canvas", "CANVAS", "pole gry")}
                    ${panelTabButton("hud", "HUD", "ramki interfejsu")}
                    ${panelTabButton("world", "AURA EKRANU", "otoczenie")}
                    ${panelTabButton("audio", "DŹWIĘK", "audio / timeout")}
                </nav>

                <div class="ln-tab-content">
                    ${panelTabPane("general", generalTab)}
                    ${panelTabPane("neon", neonTab)}
                    ${panelTabPane("outer", outerTab)}
                    ${panelTabPane("loot", targetSection("loot", "WEWNĘTRZNE OKNO ŁUPÓW", ".loot-window"))}
                    ${panelTabPane("card", targetSection("card", "KARTA PRZEDMIOTU", "Ikona + Chcę + ✓ / ✕."))}
                    ${panelTabPane("item", targetSection("item", "IKONA LEGENDY", "Bezpośrednia ramka itemu."))}
                    ${panelTabPane("confirm", targetSection("confirm", "PRZYCISK POTWIERDŹ", "Domyślnie wyłączony."))}
                    ${panelTabPane("canvas", canvasSection())}
                    ${panelTabPane("hud", uiSection())}
                    ${panelTabPane("world", worldTab)}
                    ${panelTabPane("audio", audioTab)}
                </div>
            </div>

            <div class="ln-panel-foot">
                <small>Legendary Notificator v${VERSION2}</small>
                <div class="ln-actions">
                    <button class="ln-btn danger" data-action="reset">DOMYŚLNE</button>
                    <button class="ln-btn test" data-action="test">TESTUJ</button>
                    <button class="ln-btn" data-action="apply">ZASTOSUJ</button>
                    <button class="ln-btn" data-action="close">ZAMKNIJ</button>
                </div>
            </div>`;
      ctx.container.appendChild(panel2);
      bindPanel(panel2);
      setPanelTab(panel2, ctx.storage.core.legendaryTab || "general");
      fillForm();
      updateStatus();
    }
    function updateSettingFromInput(input) {
      if (!input?.dataset?.key) {
        return false;
      }
      const key = input.dataset.key;
      if (input.type === "checkbox") {
        state.settings[key] = input.checked;
      } else if (input.type === "range") {
        state.settings[key] = Number(input.value);
      } else {
        state.settings[key] = input.value;
      }
      return true;
    }
    function updateSingleRangeValue(input) {
      if (!input || input.type !== "range" || !input.dataset.key) {
        return;
      }
      const panel2 = document.getElementById(IDS.panel);
      const output = panel2?.querySelector(`[data-range-value="${input.dataset.key}"]`);
      if (!output) {
        return;
      }
      const step = Number(input.step);
      const decimals = step < 1 ? String(input.step).split(".")[1]?.length || 2 : 0;
      output.textContent = Number(input.value).toFixed(decimals) + (input.dataset.suffix || "");
    }
    function fillForm() {
      const panel2 = document.getElementById(IDS.panel);
      if (!panel2) {
        return;
      }
      panel2.querySelectorAll("[data-key]").forEach(
        (input) => {
          const key = input.dataset.key;
          if (input.type === "checkbox") {
            input.checked = Boolean(state.settings[key]);
          } else {
            input.value = state.settings[key] ?? "";
          }
        }
      );
      updateRangeValues();
    }
    function readForm() {
      const panel2 = document.getElementById(IDS.panel);
      if (!panel2) {
        return;
      }
      panel2.querySelectorAll("[data-key]").forEach(
        (input) => {
          const key = input.dataset.key;
          if (input.type === "checkbox") {
            state.settings[key] = input.checked;
          } else if (input.type === "range") {
            state.settings[key] = Number(input.value);
          } else {
            state.settings[key] = input.value;
          }
        }
      );
    }
    function updateRangeValues() {
      const panel2 = document.getElementById(IDS.panel);
      if (!panel2) {
        return;
      }
      panel2.querySelectorAll('input[type="range"]').forEach(
        (input) => {
          const output = panel2.querySelector(`[data-range-value="${input.dataset.key}"]`);
          if (!output) {
            return;
          }
          const step = Number(input.step);
          let decimals = 0;
          if (step < 1) {
            decimals = String(input.step).split(".")[1]?.length || 2;
          }
          output.textContent = Number(input.value).toFixed(decimals) + (input.dataset.suffix || "");
        }
      );
    }
    function applyPreset(name) {
      if (!PRESETS[name]) {
        return false;
      }
      const keep = {
        mute: state.settings.mute,
        customAudio: state.settings.customAudio,
        fallbackDuration: state.settings.fallbackDuration
      };
      Object.assign(state.settings, {
        ...DEFAULTS,
        ...PRESETS[name],
        ...keep
      });
      saveSettings();
      fillForm();
      return true;
    }
    function updateStatus() {
      const panel2 = document.getElementById(IDS.panel);
      const enabled = panel2?.querySelector("[data-addon-enabled]");
      if (enabled) enabled.checked = ctx.enabled;
      const test = panel2?.querySelector('[data-action="test"]');
      if (test) test.disabled = !ctx.enabled;
    }
    function saveSettings() {
      ctx.changeSettings(state.settings);
    }
    function bindPanel(panel2) {
      ctx.scheduler.listen(panel2, "click", (event) => {
        const tab = event.target.closest?.("[data-tab]");
        if (tab) {
          setPanelTab(panel2, tab.dataset.tab, (legendaryTab) => ctx.storage.updateCore({ legendaryTab }));
          return;
        }
        const action = event.target.closest?.("[data-action]")?.dataset.action;
        if (action === "close") ctx.ui.close();
        if (action === "apply") {
          readForm();
          saveSettings();
        }
        if (action === "test" && ctx.enabled) {
          readForm();
          saveSettings();
          runtime.testLoot();
        }
        if (action === "preset") applyPreset(panel2.querySelector("#ln580-preset").value);
        if (action === "reset") {
          const keep = { mute: state.settings.mute, customAudio: state.settings.customAudio };
          Object.assign(state.settings, DEFAULTS, keep);
          saveSettings();
          fillForm();
        }
      });
      ctx.scheduler.listen(panel2, "change", (event) => {
        if (event.target.matches("[data-addon-enabled]")) {
          ctx.setEnabled(event.target.checked);
          return;
        }
        if (updateSettingFromInput(event.target)) {
          updateSingleRangeValue(event.target);
          saveSettings();
        }
      });
      let previewTimer = 0;
      ctx.scheduler.listen(panel2, "input", (event) => {
        if (event.target.type !== "range" || !updateSettingFromInput(event.target)) return;
        updateSingleRangeValue(event.target);
        ctx.scheduler.clearTimeout(previewTimer);
        previewTimer = ctx.scheduler.timeout(() => {
          if (state.active) runtime.rebuildEffects();
        }, 220);
      });
      ctx.events.on("addonChanged", (event) => {
        if (event.id === ctx.id) updateStatus();
      });
    }
    return { createPanel: createPanel2, fillForm, applyPreset };
  }

  // src/addons/legendary-notificator/effect-styles.js
  function installEffectStyles(styles2) {
    styles2.set("effects", `.ln-fx { position: fixed; box-sizing: border-box; pointer-events: none; overflow: visible; contain: layout style; z-index: 2147481900; } .ln-fx[data-kind="canvas"] { z-index: 2147481680; } .ln-fx[data-kind="ui"] { z-index: 2147481780; } .ln-fx[data-kind="outer"] { z-index: 2147481950; } .ln-fx[data-kind="loot"] { z-index: 2147481960; } .ln-fx[data-kind="card"] { z-index: 2147481970; } .ln-fx[data-kind="item"] { z-index: 2147481980; } .ln-fx[data-kind="confirm"] { z-index: 2147481990; } /* * CANVAS LOCAL LAYER MODE * * Tylko efekt mapy/canvasu jest zamykany wewnątrz .game-layer. * Ramki UI korzystają z normalnego, pełnego renderera 5.8.x. */ .ln-fx.ln-local-fx { position: absolute !important; z-index: 2 !important; } /* * Tooltipy są osobną natywną warstwą gry. * Nie zmieniamy ich wyglądu - tylko gwarantujemy, że są nad efektami * globalnymi (np. glow samego okna łupów). */ .layer.tip-layer, .layer.sticky-tips-layer { z-index: 2147482900 !important; } /* MAIN RECTANGLE */ .ln-base-rect { position: absolute; inset: 0; box-sizing: border-box; border-style: solid; border-radius: inherit; pointer-events: none; } /* PARTIAL EDGES */ .ln-edge { position: absolute; pointer-events: none; } .ln-edge-top, .ln-edge-bottom { left: 0; right: 0; } .ln-edge-left, .ln-edge-right { top: 0; bottom: 0; } .ln-edge-top { top: 0; } .ln-edge-bottom { bottom: 0; } .ln-edge-left { left: 0; } .ln-edge-right { right: 0; } /* AMBIENT */ .ln-ambient { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse at center, var(--ln-ambient-a), var(--ln-ambient-b) 55%, transparent 82% ); opacity: var(--ln-ambient-opacity); } /* OPACITY ANIMATIONS */ .ln580-fx-paused .ln-fx, .ln580-fx-paused .ln-fx * { animation-play-state: paused !important; } .ln-breathe { animation: ln580Breathe var(--ln-speed) ease-in-out infinite; } .ln-pulse { animation: ln580Pulse var(--ln-speed) ease-in-out infinite; } .ln-heartbeat { animation: ln580Heartbeat var(--ln-speed) ease-out infinite; } .ln-cascade, .ln-loot-wave { animation: ln580Wave var(--ln-speed) ease-in-out infinite; animation-delay: var(--ln-delay); } @keyframes ln580Breathe { 0%, 100% { opacity: .58; } 50% { opacity: 1; } } @keyframes ln580Pulse { 0%, 100% { opacity: .35; } 50% { opacity: 1; } } @keyframes ln580Heartbeat { 0%, 100% { opacity: .48; } 12% { opacity: 1; } 26% { opacity: .56; } 40% { opacity: 1; } 58% { opacity: .48; } } @keyframes ln580Wave { 0%, 18%, 100% { opacity: .35; } 42% { opacity: 1; } 66% { opacity: .54; } } /* SVG MOTION */ .ln-motion-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; } .ln-motion-svg rect, .ln-motion-svg line { fill: none; vector-effect: non-scaling-stroke; stroke-linecap: round; stroke-linejoin: round; } #${IDS.world} { position: fixed; inset: 0; z-index: 2147481000; pointer-events: none; }
`);
  }

  // src/addons/legendary-notificator/index.js
  function createLegendaryNotificator() {
    const state = { settings: null, active: false };
    const runtime = {};
    let publicApi = null;
    function refresh(ctx) {
      if (!ctx.enabled) return;
      state.uiDirty = true;
      state.layoutDirty = true;
      state.geometryDirty = true;
      state.cachedTargets = null;
      runtime.setVisualPlaybackPaused(ctx.settings.pauseWhenHidden && document.hidden);
      if (state.active) runtime.rebuildEffects();
    }
    function enable(ctx) {
      Object.assign(runtime, createRuntime(state, ctx));
      installEffectStyles(ctx.styles);
      runtime.bindLayoutEvents();
      runtime.startObservers();
      runtime.setVisualPlaybackPaused(ctx.settings.pauseWhenHidden && document.hidden);
      ctx.events.on("gamePacket", runtime.processGameData);
      const configuration = createSettingsUi(state, ctx, runtime);
      publicApi = {
        version: "6.2.1",
        test: runtime.testLoot,
        clear: runtime.clearEffect,
        sync: () => runtime.requestSync(true),
        open: () => ctx.ui.openSettings(ctx.id),
        close: () => ctx.ui.close(),
        preset: configuration.applyPreset,
        shell: runtime.getUiShellRect,
        topBg: () => runtime.findPositionerBackground("top"),
        bottomBg: () => runtime.findPositionerBackground("bottom"),
        settings: () => ({ ...state.settings, enabled: ctx.enabled }),
        status: () => ({
          version: "6.2.1",
          active: state.active,
          hooked: ctx.game.hooked,
          performanceMode: state.settings.performanceMode,
          multiLayer: state.settings.multiLayerEnabled,
          overlays: state.overlays.size,
          uiTargets: state.uiTargets.length
        })
      };
      ctx.game.page.LegendaryNotificator = publicApi;
    }
    function disable(ctx) {
      ctx.scheduler.destroy();
      runtime.clearEffect();
      runtime.stopObservers();
      runtime.setVisualPlaybackPaused(false);
      if (state.currentAudio) {
        state.currentAudio.pause();
        state.currentAudio.removeAttribute("src");
        state.currentAudio.load();
        state.currentAudio = null;
      }
      ctx.styles.clear();
      if (ctx.game.page.LegendaryNotificator === publicApi) delete ctx.game.page.LegendaryNotificator;
      publicApi = null;
    }
    return {
      id: "legendary-notificator",
      name: "Legendary Notificator",
      description: "Neonowe powiadomienie po zdobyciu legendarnego łupu.",
      defaultEnabled: true,
      defaults: DEFAULTS,
      init(ctx) {
        state.settings = ctx.settings;
      },
      enable,
      disable,
      destroy() {
        state.settings = null;
        for (const key of Object.keys(runtime)) delete runtime[key];
      },
      onSettingsChange: refresh,
      renderSettings(ctx) {
        createSettingsUi(state, ctx, runtime).createPanel();
      }
    };
  }

  // src/addons/notification-position/defaults.js
  var defaults = {
    bottom: 75,
    customTypography: false,
    fontFamily: "game",
    fontSize: 18,
    fontWeight: "game",
    italic: false,
    letterSpacing: 0,
    lineHeight: 1.3,
    customColor: false,
    color: "#ffffff",
    shadow: "game"
  };

  // src/addons/notification-position/typography.js
  var FONTS = {
    game: { label: "Czcionka gry", css: "" },
    arial: { label: "Arial", css: "Arial, sans-serif" },
    verdana: { label: "Verdana", css: "Verdana, sans-serif" },
    tahoma: { label: "Tahoma", css: "Tahoma, sans-serif" },
    trebuchet: { label: "Trebuchet MS", css: '"Trebuchet MS", sans-serif' },
    georgia: { label: "Georgia", css: "Georgia, serif" },
    courier: { label: "Courier New", css: '"Courier New", monospace' }
  };
  var SHADOWS = { game: "", none: "none", soft: "0 1px 4px #000", outline: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" };
  function normalize(settings) {
    const number = (key, min, max) => {
      const value = Number(settings[key] ?? defaults[key]);
      return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : defaults[key];
    };
    return {
      bottom: number("bottom", 0, 300),
      customTypography: settings.customTypography === true,
      fontFamily: Object.hasOwn(FONTS, settings.fontFamily) ? settings.fontFamily : "game",
      fontSize: number("fontSize", 10, 40),
      fontWeight: ["game", "400", "600", "700", "900"].includes(settings.fontWeight) ? settings.fontWeight : "game",
      italic: settings.italic === true,
      letterSpacing: number("letterSpacing", -1, 5),
      lineHeight: number("lineHeight", 1, 2),
      customColor: settings.customColor === true,
      color: /^#[0-9a-f]{6}$/i.test(settings.color) ? settings.color : defaults.color,
      shadow: Object.hasOwn(SHADOWS, settings.shadow) ? settings.shadow : "game"
    };
  }
  function typographyCss(settings) {
    const value = normalize(settings);
    if (!value.customTypography) return "";
    return [
      FONTS[value.fontFamily].css && `font-family: ${FONTS[value.fontFamily].css}`,
      `font-size: ${value.fontSize}px`,
      value.fontWeight !== "game" && `font-weight: ${value.fontWeight}`,
      `font-style: ${value.italic ? "italic" : "normal"}`,
      `letter-spacing: ${value.letterSpacing}px`,
      `line-height: ${value.lineHeight}`,
      value.customColor && `color: ${value.color}`,
      SHADOWS[value.shadow] && `text-shadow: ${SHADOWS[value.shadow]}`
    ].filter(Boolean).map((property) => `${property} !important;`).join("\n");
  }

  // src/addons/notification-position/settings-ui.js
  function renderSettings(ctx) {
    const section = document.createElement("section");
    section.className = "mtk-addon-settings";
    const heading = document.createElement("h2");
    heading.textContent = "Pozycja powiadomień";
    const label = document.createElement("label");
    label.className = "mtk-enabled";
    const enabled = document.createElement("input");
    enabled.type = "checkbox";
    enabled.checked = ctx.enabled;
    ctx.scheduler.listen(enabled, "change", () => ctx.setEnabled(enabled.checked));
    ctx.events.on("addonChanged", (event) => {
      if (event.id === ctx.id) enabled.checked = event.enabled;
    });
    label.append(enabled, " Pozycja powiadomień włączona");
    section.append(heading, label, rangeControl({
      label: "Odległość od dołu",
      value: ctx.settings.bottom,
      min: 0,
      max: 300,
      onChange: (bottom) => ctx.changeSettings({ bottom })
    }, ctx.scheduler));
    const appearance = document.createElement("div");
    appearance.innerHTML = `<h2>Wygląd tekstu</h2>
        <label class="mtk-enabled"><input type="checkbox" data-notification-setting="customTypography"> Własny wygląd powiadomień</label>
        <div class="ln-grid" data-typography-controls>
            <label class="ln-field"><span>Czcionka</span><select data-notification-setting="fontFamily">${Object.entries(FONTS).map(([key, font]) => `<option value="${key}">${font.label}</option>`).join("")}</select></label>
            <label class="ln-field"><span>Grubość tekstu</span><select data-notification-setting="fontWeight"><option value="game">Domyślna gry</option><option value="400">Normalna</option><option value="600">Półgruba</option><option value="700">Pogrubiona</option><option value="900">Bardzo gruba</option></select></label>
            <label class="ln-switch"><input type="checkbox" data-notification-setting="italic"> Kursywa</label>
            <label class="ln-field"><span>Cień tekstu</span><select data-notification-setting="shadow"><option value="game">Domyślny gry</option><option value="none">Brak</option><option value="soft">Miękki cień</option><option value="outline">Czarny obrys</option></select></label>
            <label class="ln-switch"><input type="checkbox" data-notification-setting="customColor"> Własny kolor tekstu</label>
            <label class="ln-field"><span>Kolor</span><input type="color" data-notification-setting="color"></label>
        </div>
        <div data-typography-ranges></div>
        <h2>Podgląd</h2><p data-notification-preview>Zdobyto legendarny przedmiot!<br>Przykładowe powiadomienie QADDONS.</p>
        <p class="ln-help">Bez własnego koloru zachowane są kolory komunikatów gry. Czcionki korzystają z zasobów systemu.</p>
        <button type="button" class="ln-btn" data-reset-typography>Przywróć wygląd gry</button>`;
    const rangeSpecs = [
      ["fontSize", "Rozmiar czcionki", 10, 40, 1, "px"],
      ["letterSpacing", "Odstęp między literami", -1, 5, 0.1, "px"],
      ["lineHeight", "Odstęp między wierszami", 1, 2, 0.1, "×"]
    ];
    for (const [key, title, min, max, step, unit] of rangeSpecs) {
      const control = document.createElement("label");
      control.className = "mtk-range";
      control.innerHTML = `<span>${title}</span><output data-output="${key}"></output><input type="range" min="${min}" max="${max}" step="${step}" data-notification-setting="${key}">`;
      control.querySelector("output").dataset.unit = unit;
      appearance.querySelector("[data-typography-ranges]").append(control);
    }
    const controls = [...appearance.querySelectorAll("[data-notification-setting]")];
    const preview = appearance.querySelector("[data-notification-preview]");
    function syncPreview(value) {
      preview.style.cssText = typographyCss(value);
      for (const output of appearance.querySelectorAll("[data-output]")) {
        output.textContent = `${value[output.dataset.output]} ${output.dataset.unit}`;
      }
    }
    function sync() {
      const value = normalize(ctx.settings);
      for (const input of controls) {
        const key = input.dataset.notificationSetting;
        if (input.type === "checkbox") input.checked = value[key];
        else input.value = value[key];
        input.disabled = key !== "customTypography" && (!value.customTypography || key === "color" && !value.customColor);
      }
      syncPreview(value);
    }
    for (const input of controls) {
      const key = input.dataset.notificationSetting;
      const read = () => input.type === "checkbox" ? input.checked : input.type === "range" ? Number(input.value) : input.value;
      ctx.scheduler.listen(input, "input", () => syncPreview({ ...normalize(ctx.settings), [key]: read() }));
      ctx.scheduler.listen(input, "change", () => {
        ctx.changeSettings({ [key]: read() });
        sync();
      });
    }
    ctx.scheduler.listen(appearance.querySelector("[data-reset-typography]"), "click", () => {
      ctx.changeSettings({ ...defaults, bottom: ctx.settings.bottom });
      sync();
    });
    sync();
    section.append(appearance);
    ctx.container.append(section);
  }

  // src/addons/notification-position/text-style.js
  var MESSAGE_ROOTS = ".mAlert-layer .big-messages,.mAlert-layer .big-messages-light-mode,.alerts-layer > .big-messages";
  function keepTextStyle(ctx) {
    const owned = /* @__PURE__ */ new Map();
    let properties = [];
    let queued = 0;
    const read = (style, key) => [style.getPropertyValue(key), style.getPropertyPriority(key)];
    const equal = (a, b) => a[0] === b[0] && a[1] === b[1];
    const write = (style, key, value) => value[0] ? style.setProperty(key, ...value) : style.removeProperty(key);
    function restore(element, values) {
      for (const [key, value] of values) if (equal(read(element.style, key), value.applied)) write(element.style, key, value.previous);
    }
    function sync() {
      queued = 0;
      const targets = /* @__PURE__ */ new Set();
      if (properties.length) for (const root of document.querySelectorAll(MESSAGE_ROOTS)) {
        targets.add(root);
        root.querySelectorAll(":scope *").forEach((element) => targets.add(element));
      }
      for (const [element, values] of owned) if (!targets.has(element)) {
        restore(element, values);
        owned.delete(element);
      }
      for (const element of targets) {
        if (!element.style) continue;
        let values = owned.get(element);
        if (!values) {
          values = /* @__PURE__ */ new Map();
          owned.set(element, values);
        }
        for (const [key, applied] of properties) {
          const current = read(element.style, key);
          const value = values.get(key);
          if (!value || !equal(current, value.applied)) values.set(key, { previous: current, applied });
          if (!equal(current, applied)) write(element.style, key, applied);
        }
      }
    }
    function queue() {
      if (!queued) queued = ctx.scheduler.frame(sync);
    }
    function update() {
      owned.forEach((values, element) => restore(element, values));
      owned.clear();
      if (!typographyCss(ctx.settings)) {
        properties = [];
        return;
      }
      const style = document.createElement("span").style;
      style.cssText = typographyCss(ctx.settings);
      properties = [...style].map((key) => [key, read(style, key)]);
      sync();
    }
    ctx.scheduler.observer(MutationObserver, (records) => {
      if (records.some((record) => record.type === "childList" || record.target.closest?.(MESSAGE_ROOTS))) queue();
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
    ctx.events.on("notificationTextChanged", update);
    ctx.scheduler.cleanup(() => {
      owned.forEach((values, element) => restore(element, values));
      owned.clear();
    });
    update();
  }

  // src/addons/notification-position/index.js
  function apply(ctx) {
    const { bottom } = normalize(ctx.settings);
    const selectors = [".mAlert-layer .big-messages", ".mAlert-layer .big-messages-light-mode", ".alerts-layer > .big-messages"];
    const typography = typographyCss(ctx.settings);
    ctx.styles.set("position", `
        ${selectors.join(",\n")} {
            top: auto !important;
            bottom: ${bottom}px !important;
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%) !important;
            text-align: center !important;
        }
        ${typography ? `${selectors.flatMap((selector) => [selector, `${selector} *`]).join(",\n")} { ${typography} }` : ""}
    `);
  }
  function createNotificationPosition() {
    return {
      id: "notification-position",
      name: "Pozycja powiadomień",
      description: "Zmienia pozycję, czcionkę, rozmiar i wygląd komunikatów tekstowych gry.",
      defaultEnabled: true,
      defaults,
      enable: (ctx) => {
        apply(ctx);
        keepTextStyle(ctx);
      },
      disable: (ctx) => ctx.styles.remove("position"),
      destroy: (ctx) => ctx?.styles.clear(),
      onSettingsChange: (ctx) => {
        apply(ctx);
        ctx.events.emit("notificationTextChanged");
      },
      renderSettings
    };
  }

  // src/addons/detector-global/channels.js
  var CHANNELS = {
    LOCAL: { label: "Lokalny", button: "LOKALNY" },
    GLOBAL: { label: "Globalny", button: "GLOBAL" },
    CLAN: { label: "Klan", button: "KLAN" },
    GROUP: { label: "Grupa", button: "GRUPA" }
  };
  var defaults2 = { channels: ["LOCAL"] };
  function selectedChannels(settings) {
    const values = settings.channels === void 0 ? defaults2.channels : settings.channels;
    if (!Array.isArray(values)) return [];
    return [...new Set(values.filter((value) => typeof value === "string" && Object.hasOwn(CHANNELS, value)))];
  }
  function channelLabel(channels) {
    return channels.map((channel) => CHANNELS[channel].label).join(", ");
  }
  function buttonLabel(channels) {
    if (!channels.length) return "WYBIERZ CZAT";
    return channels.length === 1 ? CHANNELS[channels[0]].button : `WYŚLIJ (${channels.length})`;
  }

  // src/addons/detector-global/runtime.js
  var ROOT_SELECTOR = ".heros-detector";
  var GLOBAL_CLASS = "wykrywacz-global-exact";
  function startDetectorGlobal(ctx, report = () => {
  }) {
    const page2 = ctx.game.page;
    const { scheduler: scheduler2 } = ctx;
    const buttons = /* @__PURE__ */ new Set();
    let busy = false;
    let syncFrame = 0;
    function ensureActive() {
      if (scheduler2.disposed) throw new Error("Dodatek został wyłączony.");
    }
    function wait(ms) {
      ensureActive();
      return new Promise((resolve, reject) => {
        const release = scheduler2.cleanup(() => reject(new Error("Dodatek został wyłączony.")));
        scheduler2.timeout(() => {
          release();
          resolve();
        }, ms);
      });
    }
    function patchMethod(target, key, replacement) {
      if (!target || typeof target[key] !== "function") return null;
      const original = target[key];
      const descriptor = Object.getOwnPropertyDescriptor(target, key);
      let active = true;
      const wrapper = function(...args) {
        return (active ? replacement : original).apply(this, args);
      };
      try {
        Object.defineProperty(target, key, { configurable: true, writable: true, value: wrapper });
      } catch {
        try {
          target[key] = wrapper;
        } catch {
          return null;
        }
      }
      if (target[key] !== wrapper) return null;
      let restored = false;
      function restore() {
        if (restored) return;
        restored = true;
        active = false;
        if (target[key] !== wrapper) return;
        try {
          if (descriptor) Object.defineProperty(target, key, descriptor);
          else delete target[key];
        } catch {
          try {
            target[key] = original;
          } catch {
          }
        }
      }
      const release = scheduler2.cleanup(restore);
      return () => {
        release();
        restore();
      };
    }
    function label(element) {
      return String(element.querySelector(".label")?.textContent ?? element.textContent ?? "").replace(/\s+/g, " ").trim();
    }
    function nativeButtons(detector) {
      return [...detector.querySelectorAll(".btns-container .button, .btns-container button")].filter((button) => !button.classList.contains(GLOBAL_CLASS));
    }
    function selectedText() {
      const active = document.activeElement;
      if (typeof active?.value === "string" && Number.isInteger(active.selectionStart) && Number.isInteger(active.selectionEnd)) {
        const selected2 = active.value.slice(active.selectionStart, active.selectionEnd);
        if (selected2.length) return selected2;
      }
      const selected = page2.getSelection?.()?.toString?.();
      return typeof selected === "string" && selected.length ? selected : null;
    }
    async function captureCopy(detector) {
      const copy = detector.querySelector(".map-label .copy-btn, .copy-btn") || nativeButtons(detector).find((button) => /\bkopiuj\b/i.test(label(button)));
      if (!copy) return null;
      let captured = null;
      const restores = [];
      const onCopy = (event) => {
        if (captured !== null) return;
        try {
          const data = event.clipboardData?.getData?.("text/plain");
          if (typeof data === "string" && data.length) {
            captured = data;
            return;
          }
        } catch {
        }
        captured = selectedText();
      };
      try {
        restores.push(scheduler2.listen(document, "copy", onCopy));
        restores.push(patchMethod(page2.navigator?.clipboard, "writeText", (text) => {
          captured = text;
          return Promise.resolve();
        }));
        const originalExec = document.execCommand;
        restores.push(patchMethod(document, "execCommand", function(command, ...args) {
          if (String(command).toLowerCase() === "copy") {
            captured = selectedText();
            return true;
          }
          return originalExec.call(this, command, ...args);
        }));
        copy.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: page2 }));
        await wait(0);
      } finally {
        restores.reverse().forEach((restore) => restore?.());
      }
      return typeof captured === "string" && captured.length ? captured : null;
    }
    function getChat() {
      return page2.Engine?.chatController?.getChatInputWrapper?.() || null;
    }
    function rememberChannel(chat) {
      return { name: chat.getChannelName?.(), receiver: chat.getPrivateReceiver?.(), style: chat.getStyleMessage?.() };
    }
    function restoreChannel(chat, previous, expectedChannel = null) {
      try {
        const current = chat.getChannelName?.();
        const changed = current !== previous.name || chat.getPrivateReceiver?.() !== previous.receiver || chat.getStyleMessage?.() !== previous.style;
        if (previous.name && current && changed && (!expectedChannel || current === expectedChannel || current === previous.name)) {
          chat.setChannel?.({ name: previous.name }, previous.receiver, previous.style);
        }
      } catch {
      }
    }
    async function captureCall(detector) {
      const call = nativeButtons(detector).find((button) => /\b(klan|zawołaj|zawolaj)\b/i.test(label(button)));
      const chat = getChat();
      if (!call || typeof chat?.getDataAndSendRequest !== "function") return null;
      const previous = rememberChannel(chat);
      let captured = null;
      const restore = patchMethod(chat, "getDataAndSendRequest", (message) => {
        if (captured === null) captured = message;
        return true;
      });
      if (!restore) return null;
      const hasGhost = typeof chat.sendMessageGhostMessageProcedure === "function";
      const restoreGhost = hasGhost ? patchMethod(chat, "sendMessageGhostMessageProcedure", (message) => {
        if (captured === null) captured = message;
      }) : null;
      if (hasGhost && !restoreGhost) {
        restore();
        return null;
      }
      const restoreChat = () => restoreChannel(chat, previous);
      const release = scheduler2.cleanup(restoreChat);
      try {
        call.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: page2 }));
        for (let attempt = 0; attempt < 6 && captured === null; attempt++) await wait(20);
      } finally {
        restoreGhost?.();
        restore();
        restoreChat();
        release();
      }
      return typeof captured === "string" && captured.length ? captured : null;
    }
    function checkAvailability(channels) {
      const availability = page2.Engine?.chatController?.getChatChannelsAvailable?.();
      const notifications = getChat()?.getChatNotificationManager?.();
      for (const channel of channels) {
        if (typeof availability?.checkAvailable === "function" && !availability.checkAvailable(channel)) {
          throw new Error(`Kanał ${channelLabel([channel])} jest niedostępny. Zmień wybór w ustawieniach.`);
        }
        if (notifications?.checkBlockadeLeftSeconds?.(channel)) {
          throw new Error(`Kanał ${channelLabel([channel])}: odczekaj przed kolejną wiadomością.`);
        }
      }
    }
    async function sendToChannel(message, channel) {
      ensureActive();
      const chat = getChat();
      if (typeof chat?.setChannel !== "function" || typeof chat?.getDataAndSendRequest !== "function") {
        throw new Error("Czat Margonem nie jest jeszcze gotowy.");
      }
      const previous = rememberChannel(chat);
      const restore = () => restoreChannel(chat, previous, channel);
      const release = scheduler2.cleanup(restore);
      try {
        checkAvailability([channel]);
        if (typeof chat.sendMessageGhostMessageProcedure === "function") {
          await chat.sendMessageGhostMessageProcedure(message, channel);
          return;
        }
        if (previous.name !== channel) {
          chat.setChannel({ name: channel });
          for (let attempt = 0; attempt < 10; attempt++) {
            if (chat.getChannelName?.() === channel) break;
            await wait(25);
          }
        }
        ensureActive();
        if (typeof chat.getChannelName === "function" && chat.getChannelName() !== channel) {
          throw new Error(`Nie udało się przełączyć czatu na ${channelLabel([channel])}.`);
        }
        return await chat.getDataAndSendRequest(message);
      } finally {
        restore();
        release();
      }
    }
    async function onGlobalClick(event, detector, button) {
      event.preventDefault();
      event.stopPropagation();
      if (busy || scheduler2.disposed) return;
      const channels = selectedChannels(ctx.settings);
      if (!channels.length) return;
      const submitted = [];
      let stage = "Odczyt komunikatu";
      busy = true;
      button.dataset.busy = "1";
      button.textContent = "...";
      report({ kind: "busy", text: `Odczyt komunikatu. Cel: ${channelLabel(channels)}.` });
      try {
        let message = await captureCopy(detector);
        ensureActive();
        if (message === null) message = await captureCall(detector);
        ensureActive();
        if (message === null) throw new Error("Nie udało się odczytać dokładnego komunikatu Wykrywacza. Nic nie wysłano.");
        stage = "Sprawdzenie kanałów";
        checkAvailability(channels);
        for (const channel of channels) {
          stage = `Wysyłanie: ${channelLabel([channel])}`;
          await sendToChannel(message, channel);
          submitted.push(channel);
        }
        if (!scheduler2.disposed) {
          button.textContent = "OK";
          button.title = `Przekazano komunikat do czatu: ${channelLabel(submitted)}.`;
          report({ kind: "success", text: button.title });
        }
      } catch (error) {
        if (!scheduler2.disposed) {
          button.textContent = "BŁĄD";
          button.title = `${stage}: ${error.message}${submitted.length ? ` Przekazano już do: ${channelLabel(submitted)}.` : ""}`;
          report({ kind: "error", text: button.title });
          console.warn("[QADDONS Wykrywacz → czat]", button.title, error);
        }
      } finally {
        busy = false;
        button.dataset.busy = "0";
        if (!scheduler2.disposed) scheduler2.timeout(() => {
          if (button.isConnected) updateButton(button);
        }, 1400);
      }
    }
    function updateButton(button) {
      if (button.dataset.busy === "1") return;
      const channels = selectedChannels(ctx.settings);
      const text = buttonLabel(channels);
      if (button.textContent !== text) button.textContent = text;
      button.disabled = channels.length === 0;
      button.title = channels.length ? `Wyślij dokładny komunikat na: ${channelLabel(channels)}.` : "Wybierz kanały w ustawieniach dodatku.";
    }
    function sync() {
      syncFrame = 0;
      if (scheduler2.disposed) return;
      for (const button of buttons) {
        if (!button.isConnected) buttons.delete(button);
      }
      for (const detector of document.querySelectorAll(ROOT_SELECTOR)) {
        const container = detector.querySelector(".btns-container");
        if (!container || container.querySelector(`.${GLOBAL_CLASS}`)) continue;
        const button = document.createElement("button");
        button.type = "button";
        button.className = GLOBAL_CLASS;
        updateButton(button);
        buttons.add(button);
        container.append(button);
      }
    }
    function requestSync() {
      if (!scheduler2.disposed && !syncFrame) syncFrame = scheduler2.frame(sync);
    }
    page2.__WYKRYWACZ_GLOBAL_EXACT__?.destroy?.();
    const api = { version: "1.1.0", sync: requestSync, destroy: () => scheduler2.destroy() };
    page2.__WYKRYWACZ_GLOBAL_EXACT__ = api;
    ctx.styles.set("button", `
        .${GLOBAL_CLASS} { min-height:24px; padding:3px 12px; border:1px solid #555; border-radius:0; background:#080808; color:#eee; font:12px Arial,sans-serif; cursor:pointer; }
        .${GLOBAL_CLASS}:hover { background:#202020; border-color:#aaa; }
        .${GLOBAL_CLASS}[data-busy="1"] { opacity:.6; cursor:wait; }
    `);
    scheduler2.listen(document, "click", (event) => {
      const button = event.target.closest?.(`.${GLOBAL_CLASS}`);
      if (button && buttons.has(button)) onGlobalClick(event, button.closest(ROOT_SELECTOR), button);
    }, { capture: true });
    scheduler2.observer(MutationObserver, requestSync).observe(document.documentElement, { childList: true, subtree: true });
    ctx.events.on("detectorChannelsChanged", () => buttons.forEach(updateButton));
    scheduler2.cleanup(() => {
      buttons.forEach((button) => button.remove());
      buttons.clear();
      ctx.styles.clear();
      if (page2.__WYKRYWACZ_GLOBAL_EXACT__ === api) delete page2.__WYKRYWACZ_GLOBAL_EXACT__;
    });
    requestSync();
  }

  // src/addons/detector-global/index.js
  function createDetectorGlobal() {
    const lastResult = { text: "Nie wykonano jeszcze próby wysyłania.", kind: "idle" };
    return {
      id: "detector-global",
      name: "Wykrywacz → czat",
      description: "Wysyła dokładny komunikat wykrywacza na wybrane czaty. Domyślnie tylko lokalny.",
      defaultEnabled: true,
      defaults: defaults2,
      enable: (ctx) => startDetectorGlobal(ctx, (result) => {
        Object.assign(lastResult, result);
        ctx.events.emit("detectorChatStatus", lastResult);
      }),
      onSettingsChange: (ctx) => ctx.events.emit("detectorChannelsChanged"),
      renderSettings(ctx) {
        const section = document.createElement("section");
        section.className = "mtk-addon-settings";
        section.innerHTML = `<h2>Wykrywacz → czat</h2><label class="mtk-enabled"><input type="checkbox" data-detector-enabled> Dodatek aktywny</label>
                <h2>Kanały docelowe</h2><p>Do testów zostaw zaznaczony tylko <strong>Lokalny</strong>. Każde kliknięcie przycisku w wykrywaczu wysyła wiadomość na wszystkie zaznaczone kanały.</p>
                <div class="ln-grid">${Object.entries(CHANNELS).map(([key, value]) => `<label class="ln-switch"><input type="checkbox" data-detector-channel="${key}"> ${value.label}</label>`).join("")}</div>
                <p data-selected-channels></p>
                <h2>Ostatnia próba</h2><p data-detector-result role="status" aria-live="polite"></p>
                <p>Treść jest kopiowana z natywnej ikony przy nazwie mapy w wykrywaczu. Dodatek nie zmienia wiadomości i przywraca poprzedni kanał czatu.</p>
                <p>Nic nie jest wysyłane automatycznie ani po zmianie ustawień. Bez odczytanego komunikatu wysyłka zostaje przerwana.</p>
                <p>Wyłącz osobny skrypt „Wykrywacz → GLOBAL”, jeśli był wcześniej zainstalowany.</p>`;
        const enabled = section.querySelector("input");
        enabled.checked = ctx.enabled;
        ctx.scheduler.listen(enabled, "change", () => ctx.setEnabled(enabled.checked));
        ctx.events.on("addonChanged", (event) => {
          if (event.id === ctx.id) enabled.checked = event.enabled;
        });
        function updateChannels() {
          const selected = selectedChannels(ctx.settings);
          for (const input of section.querySelectorAll("[data-detector-channel]")) input.checked = selected.includes(input.dataset.detectorChannel);
          section.querySelector("[data-selected-channels]").textContent = selected.length ? `Cel: ${channelLabel(selected)}.` : "Wybierz przynajmniej jeden kanał. Wysyłanie jest wyłączone.";
        }
        for (const input of section.querySelectorAll("[data-detector-channel]")) {
          ctx.scheduler.listen(input, "change", () => {
            const channels = [...section.querySelectorAll("[data-detector-channel]:checked")].map((item) => item.dataset.detectorChannel);
            ctx.changeSettings({ channels });
            updateChannels();
          });
        }
        const result = section.querySelector("[data-detector-result]");
        const showResult = () => {
          result.textContent = lastResult.text;
        };
        ctx.events.on("detectorChatStatus", showResult);
        updateChannels();
        showResult();
        ctx.container.append(section);
      }
    };
  }

  // src/addons/item-tools/bonus-style.js
  var BONUS_FONTS = { Arial: "Arial, sans-serif", Verdana: "Verdana, sans-serif", Tahoma: "Tahoma, sans-serif", Georgia: "Georgia, serif", monospace: "monospace" };
  var bonusDefaults = { bonusFont: "Arial", bonusSize: 9, bonusColor: "#ffffff", bonusBold: true, bonusItalic: false };
  function bonusStyle(settings) {
    const size = Number(settings.bonusSize ?? 9);
    return {
      family: BONUS_FONTS[settings.bonusFont] && Object.hasOwn(BONUS_FONTS, settings.bonusFont) ? BONUS_FONTS[settings.bonusFont] : BONUS_FONTS.Arial,
      size: Number.isFinite(size) ? Math.min(18, Math.max(7, Math.round(size))) : 9,
      color: /^#[0-9a-f]{6}$/i.test(settings.bonusColor || "") ? settings.bonusColor : "#ffffff",
      weight: settings.bonusBold ?? true ? "bold" : "normal",
      italic: settings.bonusItalic === true ? "italic" : "normal"
    };
  }
  function bonusFont(style) {
    return `${style.italic} ${style.weight} ${style.size}px ${style.family}`;
  }
  function bonusCss(style) {
    return `font:${style.italic} ${style.weight} ${style.size}px/${style.size + 2}px ${style.family}!important;color:${style.color}!important;`;
  }

  // src/addons/item-tools/data.js
  var BONUSES = Object.freeze({
    anguish: "Krwawa udręka",
    cleanse: "Płomienne oczyszczenie",
    critred: "Krytyczna osłona",
    curse: "Klątwa",
    dmgred: "Fizyczna osłona",
    facade: "Fasada opieki",
    frenzy: "Eskalacja szału",
    glare: "Oślepienie",
    holytouch: "Dotyk anioła",
    lastheal: "Ostatni ratunek",
    puncture: "Przeszywająca skuteczność",
    pushback: "Odrzut",
    resgain: "Ochrona żywiołów",
    retaliation: "Aura odwetu",
    verycrit: "Cios bardzo krytyczny"
  });
  var defaults3 = {
    ...bonusDefaults,
    frames: [],
    overlays: [],
    activeFrame: "",
    activeOverlay: "",
    bonusLabels: true,
    tooltipEnabled: true,
    showUpgradeCost: true,
    upgradeDisplay: "both",
    showLootDate: true,
    showLootGroup: true,
    showEssence: true,
    rarities: { zwykly: true, unikatowy: true, heroiczny: true, ulepszony: true, legendarny: true }
  };
  function abbreviation(name) {
    const words = String(name).normalize("NFC").match(/\p{L}+/gu) || [];
    return (words.length === 1 ? [...words[0]].slice(0, 2).join("") : words.map((word) => [...word][0]).join("")).toLocaleUpperCase("pl-PL");
  }
  function itemStats(item) {
    if (typeof item?.stat?.stat === "string") return itemStats({ stat: item.stat.stat });
    if (typeof item?.stat === "string") return Object.fromEntries(item.stat.split(";").filter(Boolean).map((part) => {
      const index = part.indexOf("=");
      return index < 0 ? [part, true] : [part.slice(0, index), part.slice(index + 1)];
    }));
    return item?._cachedStats || item?.stat || {};
  }
  function legendaryBonus(item, legendaryDom = false) {
    const stats = itemStats(item);
    const type = item?.getItemType?.() || item?.itemType;
    const legendary = type ? type === "t-leg" : Object.hasOwn(stats, "legendary") || stats.rarity === "legendary" || legendaryDom;
    if (!legendary) return null;
    const values = [item?.getLegbonStat?.(), stats.legbon, stats.socket_injection_legbon, stats.socket_fleeting_legbon];
    const codes = [...new Set(values.filter((value) => typeof value === "string").map((value) => value.split(",")[0].trim()).filter((code) => Object.hasOwn(BONUSES, code)))];
    if (!codes.length) return null;
    return { name: codes.map((code) => BONUSES[code]).join(" / "), short: codes.map((code) => abbreviation(BONUSES[code])).join("/") };
  }
  function imageUrl(value) {
    try {
      const url = new URL(String(value));
      return url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }
  function cssImage(value) {
    return JSON.stringify(imageUrl(value)).replace(/</g, "\\3c ");
  }

  // src/addons/item-tools/tooltip.js
  function createTooltipTools(tooltipConfig) {
    const ITEM_TYPES = ["Pierścienie", "Naszyjniki", "Hełmy", "Rękawice", "Zbroje", "Dystansowe", "Strzały", "Buty", "Jednoręczne", "Półtoraręczne", "Dwuręczne", "Orby magiczne", "Tarcze", "Pomocnicze"];
    function isUpgradeableItem(html) {
      const match = html.match(/Typ:\s*([^<\n]+)/i);
      return match ? ITEM_TYPES.some((type) => match[1].trim().includes(type)) : false;
    }
    function calculateUpgradeCosts(level, currentUpgrade, rarity) {
      const levelMultipliers = { 1: 1, 2: 1.1, 3: 1.3, 4: 1.6, 5: 2 };
      const rarityMultipliers = {
        zwykły: 1,
        zwykłe: 1,
        unikatowy: 10,
        unikatowe: 10,
        heroiczny: 30,
        heroiczne: 30,
        ulepszony: 40,
        ulepszonych: 40,
        legendarny: 60,
        legendarne: 60
      };
      const upgradeMultipliers = {
        zwykły: 1,
        zwykłe: 1,
        unikatowy: 10,
        unikatowe: 10,
        heroiczny: 100,
        heroiczne: 100,
        ulepszony: 1,
        ulepszonych: 1,
        legendarny: 1e3,
        legendarne: 1e3
      };
      const rarityKey = String(rarity || "").toLowerCase();
      const rarityMultiplier = rarityMultipliers[rarityKey] || 1;
      const upgradeMultiplier = upgradeMultipliers[rarityKey] || 1;
      const upgradedItem = rarityKey === "ulepszony" || rarityKey === "ulepszonych";
      const costs = {};
      const totals = { upgrade: 0, gold: 0, essence: 0 };
      for (let upgrade = currentUpgrade + 1; upgrade <= 5; upgrade++) {
        const multiplier = levelMultipliers[upgrade];
        const upgradeCost = upgradedItem ? Math.round((150 * level + 27e3) * multiplier) : Math.round((180 + level) * multiplier * upgradeMultiplier);
        let gold = 0;
        let essence = 0;
        totals.upgrade += upgradeCost;
        if (upgrade === 5) {
          gold = Math.round((10 * level + 1300) * level * rarityMultiplier);
          essence = Math.round((level / 10 + 10) * 3);
          totals.gold += gold;
          totals.essence += essence;
        }
        costs[upgrade] = { upgrade: upgradeCost, gold, essence };
      }
      return { costs, totals };
    }
    function parseItemInfo(html) {
      const info = {
        level: null,
        currentUpgrade: 0,
        rarity: "zwykły"
      };
      for (const pattern of [/Wymagany poziom:\s*(\d+)/i, /Poziom:\s*(\d+)/i]) {
        const match = html.match(pattern);
        if (match) {
          info.level = parseInt(match[1], 10);
          break;
        }
      }
      const dataTypes = [
        [/data-item-type="t-leg"/i, "legendarny"],
        [/data-item-type="t-her"/i, "heroiczny"],
        [/data-item-type="t-uniupg"/i, "unikatowy"],
        [/data-item-type="t-upgraded"/i, "ulepszony"],
        [/data-item-type="t-norm"/i, "zwykły"]
      ];
      for (const [pattern, rarity] of dataTypes) {
        if (pattern.test(html)) {
          info.rarity = rarity;
          break;
        }
      }
      if (info.rarity === "zwykły") {
        const textTypes = [
          [/\bLegendarn[ey]\b/i, "legendarny"],
          [/\bHeroiczn[ey]\b/i, "heroiczny"],
          [/\bUnikatow[ey]\b/i, "unikatowy"],
          [/\bUlepszony\b|\bUlepszonych\b/i, "ulepszony"]
        ];
        for (const [pattern, rarity] of textTypes) {
          if (pattern.test(html)) {
            info.rarity = rarity;
            break;
          }
        }
      }
      const nameSection = html.split("Typ:")[0] || html;
      const upgradeMatch = nameSection.match(/\+([1-5])(?=\s|$|<)/);
      if (upgradeMatch) {
        info.currentUpgrade = parseInt(upgradeMatch[1], 10);
      }
      return info;
    }
    function itemById(itemId) {
      try {
        if (!itemId) return null;
        const items = window.Engine?.items;
        if (typeof items?.getItemById === "function") {
          const direct = items.getItemById(itemId);
          if (direct) return direct;
        }
        return items?.items?.[itemId] || null;
      } catch {
        return null;
      }
    }
    function itemByHid(hid) {
      try {
        if (!hid) return null;
        const store = window.Engine?.items?.items || window.Engine?.items?._items || {};
        for (const item of Object.values(store)) {
          if (item?.hid === hid) return item;
        }
      } catch {
      }
      return null;
    }
    function statFromItem(item) {
      if (!item) return null;
      if (typeof item.stat === "string") return item.stat;
      if (typeof item.stat?.stat === "string") return item.stat.stat;
      return null;
    }
    function currentItemId(html) {
      try {
        const htmlMatch = String(html || "").match(/item-id-(-?\d+)/);
        if (htmlMatch) return htmlMatch[1];
        const hovered = document.querySelector(".item:hover");
        const classMatch = hovered?.className?.match?.(/item-id-(-?\d+)/);
        if (classMatch) return classMatch[1];
        const targetItem = window.TIPS?.target?.data?.("item");
        if (targetItem?.id) return String(targetItem.id);
      } catch {
      }
      return null;
    }
    function currentHid(html) {
      try {
        const source = String(html || "");
        const htmlMatch = source.match(/data-hid="([a-f0-9]{40,})"/i) || source.match(/ITEM#([a-f0-9]{40,})/i);
        if (htmlMatch) return htmlMatch[1];
        const hovered = document.querySelector(".item:hover");
        const hid = hovered?.dataset?.hid || hovered?.getAttribute?.("data-hid");
        if (hid) return hid;
        const targetItem = window.TIPS?.target?.data?.("item");
        if (targetItem?.hid) return targetItem.hid;
      } catch {
      }
      return null;
    }
    function parseLootStat(stat) {
      if (!stat) return null;
      const match = stat.match(/loot=([^;]+)/);
      if (!match) return null;
      const parts = match[1].split(",");
      if (parts.length < 4) return null;
      const groupSize = parseInt(parts[2], 10);
      const timestamp = parseInt(parts[3], 10);
      if (!Number.isFinite(groupSize) || !Number.isFinite(timestamp)) return null;
      const date = new Date(timestamp * 1e3);
      const pad = (value) => String(value).padStart(2, "0");
      return {
        groupSize,
        formattedDate: `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
      };
    }
    function parseLootFallback(html) {
      const dateMatch = String(html || "").match(/W dniu (\d{2}\.\d{2}\.\d{4})/);
      if (!dateMatch) return null;
      let groupSizeText = "solo";
      if (/wraz z kompanem/i.test(html)) groupSizeText = "2 osoby";
      else if (/wraz z drużyną/i.test(html)) groupSizeText = "drużyna";
      return {
        formattedDate: dateMatch[1],
        groupSizeText
      };
    }
    function formatNumber(value) {
      return Number(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }
    function upgradeHtml(info) {
      const rarityMap = {
        zwykły: "zwykly",
        zwykłe: "zwykly",
        unikatowy: "unikatowy",
        unikatowe: "unikatowy",
        heroiczny: "heroiczny",
        heroiczne: "heroiczny",
        ulepszony: "ulepszony",
        ulepszonych: "ulepszony",
        legendarny: "legendarny",
        legendarne: "legendarny"
      };
      const rarity = rarityMap[String(info.rarity || "").toLowerCase()] || "zwykly";
      if (tooltipConfig.rarities?.[rarity] === false) return "";
      if (!info.level || info.currentUpgrade >= 5) return "";
      const { costs, totals } = calculateUpgradeCosts(info.level, info.currentUpgrade, info.rarity);
      const showLevels = tooltipConfig.upgradeDisplay === "all" || tooltipConfig.upgradeDisplay === "both";
      const showSum = tooltipConfig.upgradeDisplay === "sum" || tooltipConfig.upgradeDisplay === "both";
      let html = '<div style="border-top:1px solid #333333;margin-top:8px;padding-top:6px">';
      html += '<div style="color:#eeeeee;font-weight:700;margin-bottom:4px">Koszt ulepszeń</div>';
      if (showLevels) {
        for (const [level, cost] of Object.entries(costs)) {
          html += `<div style="font-size:11px;color:#cccccc;line-height:1.55">+${level}: <span style="color:#eeeeee">${formatNumber(cost.upgrade)}</span> pkt.`;
          if (cost.gold > 0) html += ` · <span style="color:#eeeeee">${formatNumber(cost.gold)}</span> zł`;
          if (cost.essence > 0) html += ` · <span style="color:#eeeeee">${cost.essence}</span> es.`;
          html += "</div>";
        }
      }
      if (showSum && Object.keys(costs).length > 0) {
        html += `<div style="font-size:11px;color:#cccccc;margin-top:5px;padding-top:5px;border-top:1px solid #333333"><b>Suma:</b> <span style="color:#eeeeee">${formatNumber(totals.upgrade)}</span> pkt.`;
        if (totals.gold > 0) html += ` · <span style="color:#eeeeee">${formatNumber(totals.gold)}</span> zł`;
        if (totals.essence > 0) html += ` · <span style="color:#eeeeee">${totals.essence}</span> es.`;
        html += "</div>";
      }
      html += "</div>";
      return html;
    }
    function lootHtml(itemId, info, fullHtml) {
      const hid = currentHid(fullHtml);
      let item = itemById(itemId);
      if (!item && hid) item = itemByHid(hid);
      const stat = statFromItem(item);
      let loot = parseLootStat(stat);
      if (!loot) {
        const fallback = parseLootFallback(fullHtml);
        if (fallback) {
          loot = {
            formattedDate: `${fallback.formattedDate} (brak godz.)`,
            groupSizeText: fallback.groupSizeText
          };
        }
      } else {
        loot.groupSizeText = loot.groupSize === 1 ? "solo" : `${loot.groupSize} graczy`;
      }
      let essence = item?.salvageItems;
      if ((essence === null || essence === void 0 || Number.isNaN(Number(essence))) && info?.level && info.rarity !== "zwykły") {
        essence = Math.floor(info.level / 10) + 10;
        if (String(info.rarity).toLowerCase() === "legendarny") essence *= 3;
      }
      let html = "";
      if (loot && tooltipConfig.showLootDate) {
        html += `<div><span style="color:#999999">Zdobyto:</span> <span style="color:#eeeeee">${loot.formattedDate}</span></div>`;
      }
      if (loot && tooltipConfig.showLootGroup) {
        html += `<div><span style="color:#999999">Grupa:</span> <span style="color:#eeeeee">${loot.groupSizeText}</span></div>`;
      }
      if (tooltipConfig.showEssence && essence !== null && essence !== void 0 && !Number.isNaN(Number(essence))) {
        html += `<div><span style="color:#999999">Esencja:</span> <span style="color:#eeeeee">${Number(essence)}</span></div>`;
      }
      return html ? `<div data-qtn-loot="1" style="font-size:11px;color:#cccccc;line-height:1.65;margin-top:5px">${html}</div>` : "";
    }
    return { isUpgradeableItem, calculateUpgradeCosts, parseItemInfo, upgradeHtml, lootHtml, currentItemId, itemById, statFromItem, currentHid, itemByHid };
  }

  // src/addons/item-tools/runtime.js
  var ITEM_SELECTOR = ".item, .bottomItem";
  var HIGHLIGHTS = ".item .highlight.h-exist,.bottomItem .highlight.h-exist,.item .icon.h-exist,.bottomItem .icon.h-exist";
  function startItemTools(ctx) {
    const { scheduler: scheduler2, settings } = ctx;
    const page2 = ctx.game.page;
    const tips = createTooltipTools(settings);
    const fingerprints = /* @__PURE__ */ new WeakMap();
    const renderedExtras = /* @__PURE__ */ new WeakMap();
    const groundDraws = /* @__PURE__ */ new Map();
    let pending = 0;
    let ground = null;
    let groundFrameChanged = false;
    let groundOverlayChanged = false;
    let appearanceKey = "";
    const sample = document.querySelector(".item .highlight.h-exist");
    const nativeStyle = sample ? getComputedStyle(sample) : null;
    const nativeFrame = nativeStyle?.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1] || "/img/gui/item_frames/frames/item_frames.png";
    const nativeOffset = Math.max(0, -(parseFloat(nativeStyle?.backgroundPositionY) || 0) / 32);
    const nativeOverlayStyle = sample ? getComputedStyle(sample, "::after") : null;
    const nativeOverlay = nativeOverlayStyle?.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1] || null;
    function resolveItem(element) {
      try {
        const attached = page2.$?.(element)?.data?.("item");
        if (attached) return attached;
        const id = element.className?.match?.(/(?:^|\s)item-id-(-?\d+)(?=\s|$)/)?.[1] || element.dataset.itemId;
        return tips.itemById(id);
      } catch {
        return null;
      }
    }
    function badges() {
      for (const element of document.querySelectorAll(ITEM_SELECTOR)) {
        const badge = element.querySelector(":scope > .qaddons-item-bonus");
        const bonus = settings.bonusLabels ? legendaryBonus(resolveItem(element), element.matches('[data-item-type="t-leg"]') || !!element.querySelector(".t-leg")) : null;
        if (!bonus) {
          badge?.remove();
          element.classList.remove("qaddons-bonus-static");
          continue;
        }
        if (!badge && getComputedStyle(element).position === "static") element.classList.add("qaddons-bonus-static");
        const label = badge || document.createElement("span");
        if (!badge) {
          label.className = "qaddons-item-bonus";
          element.append(label);
        }
        if (label.textContent !== bonus.short) label.textContent = bonus.short;
        if (label.getAttribute("aria-label") !== bonus.name) label.setAttribute("aria-label", bonus.name);
      }
    }
    function tooltips() {
      for (const element of document.querySelectorAll(".tip-wrapper .content")) {
        const extra = element.querySelector(":scope > [data-qaddons-item-extra]");
        if (!settings.tooltipEnabled) {
          extra?.remove();
          fingerprints.delete(element);
          continue;
        }
        const clone = element.cloneNode(true);
        clone.querySelectorAll("[data-qaddons-item-extra]").forEach((node) => node.remove());
        const html = clone.innerHTML;
        if (document.querySelector(".item:hover")?.closest(".show-equipment") || document.querySelector(".item:hover")?.className.includes("-showeq")) {
          extra?.remove();
          continue;
        }
        const id = tips.currentItemId(html);
        const item = tips.itemById(id) || tips.itemByHid(tips.currentHid(html));
        const fingerprint = html + JSON.stringify([id, item?.hid, tips.statFromItem(item), item?.salvageItems, settings.tooltipEnabled, settings.showUpgradeCost, settings.upgradeDisplay, settings.showLootDate, settings.showLootGroup, settings.showEssence, settings.rarities]);
        if (fingerprints.get(element) === fingerprint && extra) continue;
        fingerprints.set(element, fingerprint);
        const info = tips.parseItemInfo(html);
        const upgrade = settings.showUpgradeCost && tips.isUpgradeableItem(html) ? tips.upgradeHtml(info) : "";
        const loot = tips.lootHtml(id, tips.isUpgradeableItem(html) ? info : null, html);
        const content = upgrade + loot;
        if (!content) {
          extra?.remove();
          continue;
        }
        if (extra && renderedExtras.get(extra) === content) continue;
        const wrapper = extra || document.createElement("div");
        wrapper.dataset.qaddonsItemExtra = "1";
        wrapper.innerHTML = content;
        renderedExtras.set(wrapper, content);
        if (!extra) {
          const anchor = element.querySelector(":scope > .tip-item-stat-reqp,:scope > .tip-item-stat-lvl");
          element.insertBefore(wrapper, anchor || null);
        }
      }
    }
    function restoreGround() {
      if (groundFrameChanged) ground?.changeFrames?.(nativeFrame, nativeOffset);
      if (groundOverlayChanged) ground?.changeOverlays?.(nativeOverlay);
      groundFrameChanged = groundOverlayChanged = false;
    }
    function groundAppearance() {
      const next = page2.Engine?.map?.groundItems;
      const key = JSON.stringify([settings.activeFrame, settings.activeOverlay]);
      if (next === ground && key === appearanceKey) return;
      if (next !== ground) {
        restoreGround();
        ground = next;
      }
      appearanceKey = key;
      const frame = imageUrl(settings.activeFrame);
      const overlay = imageUrl(settings.activeOverlay);
      if (frame || groundFrameChanged) ground?.changeFrames?.(frame || nativeFrame, frame ? 0 : nativeOffset);
      if (overlay || groundOverlayChanged) ground?.changeOverlays?.(overlay || nativeOverlay);
      groundFrameChanged = !!frame;
      groundOverlayChanged = !!overlay;
    }
    function groundBadges() {
      const drawables = new Set(page2.Engine?.map?.groundItems?.getDrawableItems?.() || []);
      for (const [item, restore] of groundDraws) if (!drawables.has(item) || !settings.bonusLabels) {
        restore();
        groundDraws.delete(item);
      }
      if (!settings.bonusLabels) return;
      for (const item of drawables) {
        if (!item.i || typeof item.draw !== "function" || groundDraws.has(item)) continue;
        const original = item.draw;
        let active = true;
        const wrapper = function(canvas, ...args) {
          const result = original.call(this, canvas, ...args);
          if (!active || scheduler2.disposed || !settings.bonusLabels || !this.frames || !this.sprite) return result;
          const bonus = legendaryBonus(this.i);
          const engine = page2.Engine;
          if (!bonus || !engine?.map?.offset || !engine.mapShift?.getShift) return result;
          const shift = engine.mapShift.getShift();
          const x = Math.round(this.i.x * 32 - engine.map.offset[0] - shift[0]) + 31;
          const y = Math.round(this.i.y * 32 - engine.map.offset[1] - shift[1]) + 31;
          canvas.save();
          canvas.globalAlpha = 1;
          const textStyle = bonusStyle(settings);
          canvas.font = bonusFont(textStyle);
          canvas.fillStyle = textStyle.color;
          canvas.textAlign = "right";
          canvas.textBaseline = "bottom";
          canvas.fillText(bonus.short, x - 2, y);
          canvas.restore();
          return result;
        };
        item.draw = wrapper;
        groundDraws.set(item, () => {
          active = false;
          if (item.draw === wrapper) item.draw = original;
        });
      }
    }
    function scan() {
      pending = 0;
      badges();
      tooltips();
      groundAppearance();
      groundBadges();
    }
    function queue() {
      if (!pending) pending = scheduler2.timeout(scan, 80);
    }
    function apply2() {
      const frame = imageUrl(settings.activeFrame);
      const overlay = imageUrl(settings.activeOverlay);
      ctx.styles.set("items", `
            ${frame ? `${HIGHLIGHTS}{background-image:url(${cssImage(frame)})!important;background-position-y:0!important;}` : ""}
            ${overlay ? `${HIGHLIGHTS.split(",").map((selector) => selector + "::after").join(",")}{content:"";position:absolute;inset:0;z-index:1;background-image:url(${cssImage(overlay)})!important;pointer-events:none;}` : ""}
            .qaddons-bonus-static{position:relative!important}
            .qaddons-item-bonus{position:absolute!important;right:1px!important;bottom:1px!important;z-index:6;pointer-events:none!important;
                padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;color:#fff!important;box-shadow:none!important;
                ${bonusCss(bonusStyle(settings))}text-shadow:none!important;letter-spacing:0!important;white-space:nowrap!important;}
            [data-qaddons-item-extra]{pointer-events:none;background:#080808;color:#ddd;border:1px solid #333;padding:6px 8px;margin:6px 0;font:11px/1.55 Arial,sans-serif;}
            [data-qaddons-item-extra]>div:first-child{border-top:0!important;margin-top:0!important;padding-top:0!important;}
        `);
      queue();
    }
    scheduler2.observer(MutationObserver, (records) => {
      if (records.some((record) => !record.target.closest?.(".qaddons-item-bonus,[data-qaddons-item-extra]") && (record.type !== "childList" || [...record.addedNodes, ...record.removedNodes].some((node) => node.nodeType !== 1 || !node.matches(".qaddons-item-bonus,[data-qaddons-item-extra]"))))) queue();
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-item-type", "data-item-id", "data-hid"], characterData: true });
    const poll = () => {
      queue();
      scheduler2.timeout(poll, 500);
    };
    ctx.events.on("itemToolsChanged", apply2);
    scheduler2.cleanup(() => {
      groundDraws.forEach((restore) => restore());
      groundDraws.clear();
      restoreGround();
      document.querySelectorAll(".qaddons-item-bonus,[data-qaddons-item-extra]").forEach((node) => node.remove());
      document.querySelectorAll(".qaddons-bonus-static").forEach((node) => node.classList.remove("qaddons-bonus-static"));
    });
    apply2();
    poll();
  }

  // src/addons/item-tools/index.js
  function createItemTools() {
    return {
      id: "item-tools",
      name: "Przedmioty: ramki i tooltipy",
      description: "Własne ramki i nakładki, skróty bonusów legendarnych oraz informacje o ulepszeniach i łupie.",
      defaultEnabled: true,
      defaults: defaults3,
      enable: startItemTools,
      onSettingsChange: (ctx) => ctx.events.emit("itemToolsChanged"),
      renderSettings: renderSettings2
    };
  }
  function renderSettings2(ctx) {
    const section = document.createElement("section");
    section.className = "mtk-addon-settings qaddons-items-settings";
    section.innerHTML = `<h2>Przedmioty: ramki i tooltipy</h2>
        <label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
        <nav class="qi-tabs" aria-label="Ustawienia przedmiotów">
            <button type="button" class="ln-btn" data-tab="appearance" aria-pressed="true">Ramki i nakładki</button>
            <button type="button" class="ln-btn" data-tab="bonuses" aria-pressed="false">Bonusy legendarne</button>
            <button type="button" class="ln-btn" data-tab="tooltips" aria-pressed="false">Tooltipy</button>
        </nav>
        <div data-pane="appearance"><p>Dodaj adres HTTPS arkusza ramek lub nakładek zgodnego z Margonem (kafelki 32 × 32 px). Wybór zapisuje się od razu. „Wygląd gry” przywraca oryginał.</p>
            ${["frame", "overlay"].map((type) => `<h2>${type === "frame" ? "Ramki" : "Nakładki"}</h2><div data-library="${type}"></div>
                <form data-add="${type}" class="ln-grid"><label class="ln-field">Nazwa<input type="text" name="name" maxlength="60" required placeholder="Moja ${type === "frame" ? "ramka" : "nakładka"}"></label>
                <label class="ln-field">Adres grafiki HTTPS<input type="url" name="url" required placeholder="https://…/grafika.png"></label>
                <div class="qi-art-preview" aria-label="Podgląd arkusza"><span></span><small>Podgląd ramki legendarnej</small></div>
                <button class="ln-btn" type="submit">Dodaj i zastosuj</button><div class="ln-help ln-full" role="status" data-message></div></form>`).join("")}
        </div>
        <div data-pane="bonuses" hidden><h2>Skrót w prawym dolnym rogu</h2>
            <label class="mtk-enabled"><input type="checkbox" data-setting="bonusLabels"> Pokaż bonus na legendarnych przedmiotach</label>
            <p>Skrót pojawia się na ikonie przedmiotu, również z oryginalną ramką. Kilka słów → pierwsze litery; jedno słowo → dwie pierwsze litery. Polskie znaki zostają zachowane.</p>
            <div class="ln-grid">
                <label class="ln-field">Czcionka<select data-setting="bonusFont">${Object.keys(BONUS_FONTS).map((font) => `<option>${font}</option>`).join("")}</select></label>
                <label class="ln-field">Rozmiar (7–18 px)<input type="number" min="7" max="18" step="1" data-setting="bonusSize"></label>
                <label class="ln-field">Kolor tekstu<input type="color" data-setting="bonusColor"></label>
                <div><label class="ln-switch"><input type="checkbox" data-setting="bonusBold">Pogrubienie</label><label class="ln-switch"><input type="checkbox" data-setting="bonusItalic">Kursywa</label></div>
                <button class="ln-btn" type="button" data-reset-bonus>Przywróć wygląd tekstu</button>
            </div>
            <div class="qi-bonus-preview">${["Krytyczna osłona", "Cios bardzo krytyczny", "Oślepienie"].map((name) => `<div><div class="qi-example-icon">◇<span>${abbreviation(name)}</span></div><small>${name}</small></div>`).join("")}</div>
            <h2>Rozpoznawane bonusy</h2><div class="qi-bonus-list">${Object.values(BONUSES).map((name) => `<div><b>${abbreviation(name)}</b><span>${name}</span></div>`).join("")}</div>
            <p>Przedmiot bez bonusu lub z nierozpoznanym bonusem pozostaje bez etykiety. Etykieta nie przechwytuje kliknięć ani tooltipów.</p>
        </div>
        <div data-pane="tooltips" hidden><h2>Rozszerzenie opisu przedmiotu</h2>
            <div class="ln-grid">${[
      ["tooltipEnabled", "Rozszerzone tooltipy"],
      ["showUpgradeCost", "Koszty ulepszania"],
      ["showLootDate", "Data zdobycia"],
      ["showLootGroup", "Liczebność grupy"],
      ["showEssence", "Esencja z przedmiotu"]
    ].map(([key, name]) => `<label class="ln-switch"><input type="checkbox" data-setting="${key}">${name}</label>`).join("")}
            <label class="ln-field">Pokazywane koszty<select data-setting="upgradeDisplay"><option value="both">Każdy poziom i suma</option><option value="all">Każdy poziom</option><option value="sum">Tylko suma</option></select></label></div>
            <h2>Koszty dla wybranych rang</h2><div class="ln-grid">${Object.entries({ zwykly: "Zwykłe", unikatowy: "Unikatowe", heroiczny: "Heroiczne", ulepszony: "Ulepszone", legendarny: "Legendarne" }).map(([key, name]) => `<label class="ln-switch"><input type="checkbox" data-rarity="${key}">${name}</label>`).join("")}</div>
            <h2>Podgląd</h2><p>Przykładowy legendarny przedmiot, poziom 100, ulepszenie +3. Koszty zachowują wzory z dostarczonego skryptu.</p><div class="qi-tip-preview"></div>
        </div>`;
    ctx.styles.set("settings", `
        #mtk-panel .qi-tabs{display:flex;flex-wrap:wrap;gap:5px;margin:12px 0;}
        #mtk-panel .qi-tabs [aria-pressed="true"]{border-color:#aaa;background:#222;color:#fff;}
        #mtk-panel .qi-library-row{display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid #292929;}
        #mtk-panel .qi-library-row label{flex:1;min-width:0;overflow-wrap:anywhere;cursor:pointer;}
        #mtk-panel .qi-library-row input{margin-right:8px;accent-color:#ccc;}
        #mtk-panel .qi-art-preview{display:flex;align-items:center;gap:10px;color:#aaa;}
        #mtk-panel .qi-art-preview>span{display:block;width:32px;height:32px;background-color:#111;background-position:-128px 0;flex:none;border:1px solid #333;box-sizing:content-box;}
        #mtk-panel .qi-bonus-preview{display:flex;gap:22px;padding:14px 10px;flex-wrap:wrap;}
        #mtk-panel .qi-bonus-preview>div{display:flex;align-items:center;gap:9px;}
        #mtk-panel .qi-example-icon{position:relative;width:32px;height:32px;flex:none;border:1px solid #888;color:#aaa;text-align:center;line-height:28px;font-size:23px;background:#111;}
        #mtk-panel .qi-example-icon span{position:absolute;bottom:0;right:0;background:transparent;color:#fff;font:bold 9px/11px Arial;padding:0;border:0;}
        #mtk-panel .qi-bonus-list{display:grid;grid-template-columns:1fr 1fr;gap:0 15px;padding:0 10px 14px;}
        #mtk-panel .qi-bonus-list>div{display:flex;gap:10px;border-bottom:1px solid #222;padding:5px 0;font-size:12px;}
        #mtk-panel .qi-bonus-list b{min-width:30px;color:#fff;}
        #mtk-panel .qi-tip-preview{margin:10px;background:#080808;border:1px solid #333;padding:10px;color:#ccc;font:11px/1.55 Arial;}
    `);
    const enabled = section.querySelector("[data-enabled]");
    enabled.checked = ctx.enabled;
    ctx.scheduler.listen(enabled, "change", () => ctx.setEnabled(enabled.checked));
    ctx.events.on("addonChanged", (event) => {
      if (event.id === ctx.id) enabled.checked = event.enabled;
    });
    const preview = () => {
      ctx.styles.set("bonus-preview", `#mtk-panel .qi-example-icon span{${bonusCss(bonusStyle(ctx.settings))}}`);
      const target = section.querySelector(".qi-tip-preview");
      const tools = createTooltipTools(ctx.settings);
      target.innerHTML = ctx.settings.tooltipEnabled ? (ctx.settings.showUpgradeCost ? tools.upgradeHtml({ level: 100, currentUpgrade: 3, rarity: "legendarny" }) : "") + (ctx.settings.showLootDate ? "<div>Zdobyto: 09.09.2026 12:00:00</div>" : "") + (ctx.settings.showLootGroup ? "<div>Grupa: 3 graczy</div>" : "") + (ctx.settings.showEssence ? "<div>Esencja: 60</div>" : "") : "Rozszerzenie tooltipów jest wyłączone.";
      if (!target.textContent) target.textContent = "Wybrane informacje nie dotyczą tego przykładu.";
    };
    for (const button of section.querySelectorAll("[data-tab]")) ctx.scheduler.listen(button, "click", () => {
      section.querySelectorAll("[data-tab]").forEach((tab) => tab.setAttribute("aria-pressed", String(tab === button)));
      section.querySelectorAll("[data-pane]").forEach((pane) => {
        pane.hidden = pane.dataset.pane !== button.dataset.tab;
      });
    });
    for (const input of section.querySelectorAll("[data-setting],[data-rarity]")) {
      const key = input.dataset.setting;
      if (input.type === "checkbox") input.checked = key ? !!ctx.settings[key] : ctx.settings.rarities?.[input.dataset.rarity] !== false;
      else input.value = ctx.settings[key];
      ctx.scheduler.listen(input, key?.startsWith("bonus") && ["number", "color"].includes(input.type) ? "input" : "change", () => {
        if (input.type === "number" && !input.checkValidity()) return;
        ctx.changeSettings(key ? { [key]: input.type === "checkbox" ? input.checked : input.type === "number" ? Number(input.value) : input.value } : { rarities: { ...ctx.settings.rarities, [input.dataset.rarity]: input.checked } });
        preview();
      });
    }
    ctx.scheduler.listen(section.querySelector("[data-reset-bonus]"), "click", () => {
      ctx.changeSettings({ ...bonusDefaults });
      for (const [key, value] of Object.entries(bonusDefaults)) {
        const input = section.querySelector(`[data-setting="${key}"]`);
        if (input.type === "checkbox") input.checked = value;
        else input.value = value;
      }
      preview();
    });
    for (const type of ["frame", "overlay"]) {
      let renderLibrary = function() {
        library.replaceChildren();
        const list = Array.isArray(ctx.settings[key]) ? ctx.settings[key] : [];
        [{ name: "Wygląd gry", url: "" }, ...list].forEach((item, index) => {
          const row = document.createElement("div");
          row.className = "qi-library-row";
          const label = document.createElement("label");
          const input = document.createElement("input");
          input.type = "radio";
          input.name = `qi-${type}`;
          input.value = item.url;
          input.checked = (ctx.settings[active] || "") === item.url;
          label.append(input, document.createTextNode(item.name));
          row.append(label);
          if (index) {
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "ln-btn";
            remove.textContent = "Usuń";
            remove.dataset.removeIndex = index - 1;
            row.append(remove);
          }
          library.append(row);
        });
      };
      const key = type === "frame" ? "frames" : "overlays";
      const active = type === "frame" ? "activeFrame" : "activeOverlay";
      const library = section.querySelector(`[data-library="${type}"]`);
      ctx.scheduler.listen(library, "change", (event) => {
        if (event.target.matches('input[type="radio"]')) ctx.changeSettings({ [active]: event.target.value });
      });
      ctx.scheduler.listen(library, "click", (event) => {
        const button = event.target.closest("[data-remove-index]");
        if (!button) return;
        const list = [...ctx.settings[key]];
        const [removed] = list.splice(Number(button.dataset.removeIndex), 1);
        ctx.changeSettings({ [key]: list, ...removed?.url === ctx.settings[active] ? { [active]: "" } : {} });
        renderLibrary();
      });
      const form = section.querySelector(`[data-add="${type}"]`);
      const urlInput = form.elements.url;
      const message = form.querySelector("[data-message]");
      ctx.scheduler.listen(urlInput, "input", () => {
        const url = imageUrl(urlInput.value);
        form.querySelector(".qi-art-preview>span").style.backgroundImage = url ? `url(${JSON.stringify(url)})` : "";
        message.textContent = urlInput.value && !url ? "Podaj pełny adres HTTPS grafiki." : "";
      });
      ctx.scheduler.listen(form, "submit", (event) => {
        event.preventDefault();
        const url = imageUrl(urlInput.value);
        const name = form.elements.name.value.trim();
        if (!url || !name) {
          message.textContent = "Podaj nazwę i poprawny adres HTTPS.";
          return;
        }
        const list = (Array.isArray(ctx.settings[key]) ? ctx.settings[key] : []).filter((item) => item.url !== url);
        ctx.changeSettings({ [key]: [...list, { name, url }], [active]: url });
        renderLibrary();
        form.reset();
        form.querySelector(".qi-art-preview>span").style.backgroundImage = "";
        message.textContent = "Zapisano i wybrano grafikę.";
      });
      renderLibrary();
    }
    preview();
    ctx.container.append(section);
  }

  // src/main.js
  var page = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  page.__MARGONEM_TOOLKIT__?.destroy?.();
  page.__LegendaryNotificatorRuntime?.destroy?.();
  var scheduler = createScheduler();
  var events = createEvents();
  var styles = createStyles(document);
  var game = createGame(page, events, createScheduler());
  var manager = null;
  var panel = null;
  var destroyed = false;
  var toolkit = {
    version: VERSION,
    get addons() {
      return manager;
    },
    open: () => panel?.open(),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      scheduler.destroy();
      panel?.destroy();
      manager?.destroy();
      game.destroy();
      events.destroy();
      styles.destroy();
      if (page.__MARGONEM_TOOLKIT__ === toolkit) delete page.__MARGONEM_TOOLKIT__;
    }
  };
  page.__MARGONEM_TOOLKIT__ = toolkit;
  function start() {
    if (destroyed) return;
    try {
      const settings = createSettings(window.localStorage, importLegacy);
      panel = createPanel(settings, styles, createScheduler(), events);
      manager = createAddonManager({ settings, events, styles, game, ui: panel });
      manager.register(createLegendaryNotificator());
      manager.register(createNotificationPosition());
      manager.register(createDetectorGlobal());
      manager.register(createItemTools());
      panel.connect(manager);
      manager.start();
      game.start();
    } catch (error) {
      toolkit.destroy();
      console.error("[QADDONS start]", error);
    }
  }
  if (document.readyState === "loading") scheduler.listen(document, "DOMContentLoaded", start, { once: true });
  else start();
})();
