(() => {
  const STORAGE_KEY = "ares-office-inventory-v1";
  const META_KEY = "ares-office-inventory-meta-v1";
  const SEED_KEY = "ares-office-inventory-seed-2026-v1";
  const STOCK_STORAGE_KEY = "ares-office-stock-v1";
  const STOCK_META_KEY = "ares-office-stock-meta-v1";
  const STOCK_SEED_KEY = "ares-general-stock-seed-2026-v1";
  const STOCK_PRICE_IMPORT_KEY = "ares-general-stock-price-import-v1";
  const INSTALLED_STORAGE_KEY = "ares-installed-base-v1";
  const INSTALLED_META_KEY = "ares-installed-base-meta-v1";
  const INSTALLED_SEED_KEY = "ares-installed-base-seed-2026-v1";
  const CATEGORIES = ["Equipos y tecnología", "Muebles", "Seguridad", "Herramientas", "Marketing y exhibición", "Accesorios y decoración", "Contenido general"];
  const DECISIONS = ["Incluir", "Revisar", "Excluir"];
  const STOCK_RUBRICS = ["Equipos", "Cartuchos", "Insumos", "Repuestos", "Cosmética"];
  const STOCK_RUBRIC_VERSION = "stock-rubrics-2026-09-v1";
  const STOCK_STATUSES = ["Disponible", "No disponible", "A préstamo"];
  const STOCK_PRICE_BASES = ["Unidad", "Caja"];
  const DEFAULT_STOCK_MARGIN_PERCENT = 40;
  const DEFAULT_INSURANCE_EXCHANGE_RATE = 5900;
  const STOCK_VALUATION_CRITERION = "Costo estimado previo a la venta";
  const AUTH_USERS = {
    teresa: { email: "teresaferres@gmail.com", name: "Teresa", scope: "full" },
    jack: { email: "jack@aresactivos.app", name: "Jack", scope: "installed" }
  };
  const money = new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 });
  const dateFormat = new Intl.DateTimeFormat("es-PY", { dateStyle: "medium" });

  const storedItems = loadJSON(STORAGE_KEY, null);
  const shouldLoadSeed = (!Array.isArray(storedItems) || storedItems.length === 0) && !localStorage.getItem(SEED_KEY);
  const storedStockItems = loadJSON(STOCK_STORAGE_KEY, null);
  const shouldLoadStockSeed = (!Array.isArray(storedStockItems) || storedStockItems.length === 0) && !localStorage.getItem(STOCK_SEED_KEY);
  const storedInstalledItems = loadJSON(INSTALLED_STORAGE_KEY, null);
  const installedSeedMeta = window.ARES_INSTALLED_BASE_SEED_META || {};
  const installedSeedItems = (window.ARES_INSTALLED_BASE_SEED || []).map(normalizeInstalledItem);
  const storedInstalledMeta = loadJSON(INSTALLED_META_KEY, {});
  const storedInstalledSeedVersion = storedInstalledMeta.seedVersion || localStorage.getItem(INSTALLED_SEED_KEY) || "";
  const hasStoredInstalledItems = Array.isArray(storedInstalledItems) && storedInstalledItems.length > 0;
  const shouldLoadInstalledSeed = !hasStoredInstalledItems;
  const shouldRefreshInstalledSeed = hasStoredInstalledItems && Boolean(installedSeedMeta.version) && storedInstalledSeedVersion !== installedSeedMeta.version;
  let items = (shouldLoadSeed ? (window.ARES_INVENTORY_SEED || []) : (storedItems || [])).map(normalizeItem);
  let meta = loadJSON(META_KEY, { owner: "ARES PARAGUAY SRL", address: "", date: new Date().toISOString().slice(0, 10), notes: "", insuranceExchangeRate: DEFAULT_INSURANCE_EXCHANGE_RATE, updatedAt: null });
  meta.insuranceExchangeRate = Number.isFinite(Number(meta.insuranceExchangeRate)) && Number(meta.insuranceExchangeRate) > 0
    ? Number(meta.insuranceExchangeRate)
    : DEFAULT_INSURANCE_EXCHANGE_RATE;
  let stockItems = (shouldLoadStockSeed ? (window.ARES_STOCK_SEED || []) : (storedStockItems || [])).map(normalizeStockItem);
  let stockMeta = loadJSON(STOCK_META_KEY, { updatedAt: shouldLoadStockSeed ? "2026-09-11T00:00:00.000Z" : null, defaultMarginPercent: DEFAULT_STOCK_MARGIN_PERCENT });
  stockMeta.defaultMarginPercent = Number.isFinite(Number(stockMeta.defaultMarginPercent)) ? Math.min(300, Math.max(0, Number(stockMeta.defaultMarginPercent))) : DEFAULT_STOCK_MARGIN_PERCENT;
  let installedItems = shouldLoadInstalledSeed
    ? installedSeedItems
    : shouldRefreshInstalledSeed
      ? mergeInstalledSeed(storedInstalledItems, installedSeedItems)
      : storedInstalledItems.map(normalizeInstalledItem);
  let installedMeta = {
    ...storedInstalledMeta,
    updatedAt: shouldLoadInstalledSeed || shouldRefreshInstalledSeed ? installedSeedMeta.importedAt || new Date().toISOString() : storedInstalledMeta.updatedAt || null,
    seedVersion: shouldLoadInstalledSeed || shouldRefreshInstalledSeed ? installedSeedMeta.version || "" : storedInstalledMeta.seedVersion || "",
    sourceFile: shouldLoadInstalledSeed || shouldRefreshInstalledSeed ? installedSeedMeta.sourceFile || "" : storedInstalledMeta.sourceFile || "",
    sourceSheet: shouldLoadInstalledSeed || shouldRefreshInstalledSeed ? installedSeedMeta.sourceSheet || "" : storedInstalledMeta.sourceSheet || ""
  };
  const stockPriceImport = window.ARES_STOCK_PRICE_IMPORT;
  const shouldImportStockPrices = stockPriceImport?.prices && localStorage.getItem(STOCK_PRICE_IMPORT_KEY) !== stockPriceImport.version;
  let importedStockPriceCount = 0;
  if (shouldImportStockPrices) {
    stockItems = stockItems.map((item) => {
      const importedPrice = stockPriceImport.prices[item.id];
      if (!importedPrice || Number(item.listPriceUsd) > 0) return item;
      importedStockPriceCount += 1;
      return normalizeStockItem({ ...item, ...importedPrice, updatedAt: new Date().toISOString() });
    });
    stockMeta.priceImport = {
      version: stockPriceImport.version,
      sourceFile: stockPriceImport.sourceFile,
      exchangeRate: stockPriceImport.exchangeRate,
      importedRecords: importedStockPriceCount,
      importedAt: new Date().toISOString()
    };
    stockMeta.updatedAt = stockMeta.priceImport.importedAt;
    localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(stockItems));
    localStorage.setItem(STOCK_META_KEY, JSON.stringify(stockMeta));
    localStorage.setItem(STOCK_PRICE_IMPORT_KEY, stockPriceImport.version);
  }
  if (shouldLoadSeed) {
    if (!meta.owner) meta.owner = "ARES PARAGUAY SRL";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(META_KEY, JSON.stringify(meta));
    localStorage.setItem(SEED_KEY, "loaded");
  }
  if (shouldLoadStockSeed) {
    localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(stockItems));
    localStorage.setItem(STOCK_META_KEY, JSON.stringify(stockMeta));
    localStorage.setItem(STOCK_SEED_KEY, "loaded");
  }
  if (shouldLoadInstalledSeed || shouldRefreshInstalledSeed) {
    localStorage.setItem(INSTALLED_STORAGE_KEY, JSON.stringify(installedItems));
    localStorage.setItem(INSTALLED_META_KEY, JSON.stringify(installedMeta));
    localStorage.setItem(INSTALLED_SEED_KEY, installedSeedMeta.version || "loaded");
  }
  let selectedId = null;
  let selectedStockId = null;
  let selectedInstalledId = null;
  let pendingPhoto = "";
  let sortState = { key: "", direction: "asc" };
  let stockSortState = { key: "", direction: "asc" };
  let groupedStockSortState = { key: "name", direction: "asc" };
  let installedSortState = { key: "installationDate", direction: "desc" };
  let currentView = "inventory";
  const cloudConfig = window.ARES_CLOUD_CONFIG || {};
  const cloudClient = window.supabase && cloudConfig.url && cloudConfig.publishableKey
    ? window.supabase.createClient(cloudConfig.url, cloudConfig.publishableKey)
    : null;
  let cloudReady = false;
  let cloudLoading = false;
  let cloudSaveTimer = null;
  let installedCloudSaveTimer = null;
  let activeCloudUser = null;
  let activeAccess = null;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const form = $("#item-form");
  const dialog = $("#item-dialog");
  const detailDialog = $("#detail-dialog");
  const stockForm = $("#stock-form");
  const stockDialog = $("#stock-dialog");
  const stockDetailDialog = $("#stock-detail-dialog");
  const installedForm = $("#installed-form");
  const installedDialog = $("#installed-dialog");
  const installedDetailDialog = $("#installed-detail-dialog");
  const backupDialog = $("#backup-dialog");

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }

  function normalizeItem(item) {
    return {
      id: item.id || uid(), name: item.name || "Bien sin nombre", category: item.category || "Contenido general", location: item.location || "",
      brand: item.brand || "", model: item.model || "", serial: item.serial || "", condition: item.condition || "Sin verificar",
      decision: DECISIONS.includes(item.decision) ? item.decision : "Incluir", quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
      unitCost: Math.max(0, Math.round(Number(item.unitCost) || 0)), purchaseDate: item.purchaseDate || "", receipt: item.receipt || "",
      notes: item.notes || "", source: item.source || "Registro manual", photo: item.photo || "", updatedAt: item.updatedAt || new Date().toISOString()
    };
  }

  function normalizeStockItem(item) {
    const legacyNotes = [item.notes, item.location && `Ubicación anterior: ${item.location}`, item.unit && `Unidad anterior: ${item.unit}`].filter(Boolean).join(" · ");
    const defaultPriceBasis = Number(item.quantity) > 0 || Number(item.boxes) === 0 ? "Unidad" : "Caja";
    return {
      id: item.id || uid(), name: item.name || "Producto sin nombre", category: item.category || "Insumos",
      brand: item.brand || "", model: item.model || "", serial: item.serial || "",
      status: STOCK_STATUSES.includes(item.status) ? item.status : (Number(item.quantity) > 0 ? "Disponible" : "No disponible"),
      boxes: Math.max(0, Math.round(Number(item.boxes) || 0)), quantity: Math.max(0, Math.round(Number(item.quantity) || 0)),
      priceBasis: STOCK_PRICE_BASES.includes(item.priceBasis) ? item.priceBasis : defaultPriceBasis,
      listPriceUsd: Math.max(0, Number(item.listPriceUsd) || 0),
      vatRate: [0, 5, 10].includes(Number(item.vatRate)) ? Number(item.vatRate) : 10,
      marginPercent: Number.isFinite(Number(item.marginPercent)) ? Math.min(300, Math.max(0, Number(item.marginPercent))) : DEFAULT_STOCK_MARGIN_PERCENT,
      valuationCriterion: STOCK_VALUATION_CRITERION,
      priceSource: item.priceSource || "", priceSourceRow: Number(item.priceSourceRow) || null,
      notes: legacyNotes, source: item.source || "Registro manual", updatedAt: item.updatedAt || new Date().toISOString()
    };
  }

  function normalizeInstalledItem(item) {
    return {
      id: item.id || uid(),
      client: String(item.client || "").trim(),
      manufacturer: String(item.manufacturer || "").trim(),
      model: String(item.model || "Equipo sin modelo").trim(),
      serial: String(item.serial || "").trim(),
      installationDate: item.installationDate || "",
      warrantyEnd: item.warrantyEnd || "",
      notes: String(item.notes || "").trim(),
      source: item.source || "Registro manual",
      updatedAt: item.updatedAt || new Date().toISOString()
    };
  }

  function mergeInstalledSeed(stored, official) {
    const officialIds = new Set(official.map((item) => item.id));
    const officialSerials = new Set(official.map((item) => normalizedSerial(item.serial)).filter(Boolean));
    const officialWithoutSerial = new Set(official.filter((item) => !normalizedSerial(item.serial)).map(installedIdentityKey));
    const manualItems = (stored || []).map(normalizeInstalledItem).filter((item) => {
      if (officialIds.has(item.id)) return false;
      const serial = normalizedSerial(item.serial);
      if (serial && officialSerials.has(serial)) return false;
      if (!serial && officialWithoutSerial.has(installedIdentityKey(item))) return false;
      return item.source === "Registro manual" || (!item.id.startsWith("base-instalada-") && !item.id.startsWith("servicio-tecnico-"));
    });
    return [...official, ...manualItems];
  }

  function save() {
    meta.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(META_KEY, JSON.stringify(meta));
    localStorage.setItem(SEED_KEY, "loaded");
    render();
    scheduleCloudSave();
  }

  function saveStock() {
    stockMeta.updatedAt = new Date().toISOString();
    localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(stockItems));
    localStorage.setItem(STOCK_META_KEY, JSON.stringify(stockMeta));
    localStorage.setItem(STOCK_SEED_KEY, "loaded");
    renderStock();
    scheduleCloudSave();
  }

  function saveInstalled() {
    installedMeta.updatedAt = new Date().toISOString();
    localStorage.setItem(INSTALLED_STORAGE_KEY, JSON.stringify(installedItems));
    localStorage.setItem(INSTALLED_META_KEY, JSON.stringify(installedMeta));
    localStorage.setItem(INSTALLED_SEED_KEY, installedMeta.seedVersion || "loaded");
    renderInstalled();
    scheduleInstalledCloudSave();
  }

  function cacheAllLocally() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(META_KEY, JSON.stringify(meta));
    localStorage.setItem(SEED_KEY, "loaded");
    localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(stockItems));
    localStorage.setItem(STOCK_META_KEY, JSON.stringify(stockMeta));
    localStorage.setItem(STOCK_SEED_KEY, "loaded");
    cacheInstalledLocally();
  }

  function cacheInstalledLocally() {
    localStorage.setItem(INSTALLED_STORAGE_KEY, JSON.stringify(installedItems));
    localStorage.setItem(INSTALLED_META_KEY, JSON.stringify(installedMeta));
    localStorage.setItem(INSTALLED_SEED_KEY, installedMeta.seedVersion || "loaded");
  }

  function clearRestrictedLocalState() {
    items = [];
    stockItems = [];
    meta = { owner: "", address: "", date: new Date().toISOString().slice(0, 10), notes: "", insuranceExchangeRate: DEFAULT_INSURANCE_EXCHANGE_RATE, updatedAt: null };
    stockMeta = { updatedAt: null, defaultMarginPercent: DEFAULT_STOCK_MARGIN_PERCENT };
    [STORAGE_KEY, META_KEY, SEED_KEY, STOCK_STORAGE_KEY, STOCK_META_KEY, STOCK_SEED_KEY, STOCK_PRICE_IMPORT_KEY].forEach((key) => localStorage.removeItem(key));
  }

  function setSyncState(state, detail) {
    const note = $(".cloud-note");
    const label = $("#sync-label");
    const description = $("#sync-detail");
    if (!note || !label || !description) return;
    note.classList.toggle("syncing", state === "syncing");
    note.classList.toggle("error", state === "error");
    const accessLabel = activeAccess?.scope === "installed" ? "Jack · Base instalada" : "Teresa · Acceso completo";
    label.textContent = state === "syncing" ? "Guardando…" : state === "error" ? "Error de conexión" : accessLabel;
    description.textContent = detail || (state === "syncing" ? "Enviando los cambios." : state === "error" ? "Los datos siguen guardados en este equipo." : "Los cambios se guardan automáticamente.");
  }

  function scheduleCloudSave() {
    if (!cloudReady || cloudLoading || !cloudClient || !activeCloudUser || activeAccess?.scope !== "full") return;
    clearTimeout(cloudSaveTimer);
    setSyncState("syncing");
    cloudSaveTimer = setTimeout(pushCloudState, 500);
  }

  function scheduleInstalledCloudSave() {
    if (!cloudReady || cloudLoading || !cloudClient || !activeCloudUser || !activeAccess) return;
    clearTimeout(installedCloudSaveTimer);
    setSyncState("syncing");
    installedCloudSaveTimer = setTimeout(pushInstalledCloudState, 500);
  }

  async function pushCloudState() {
    if (!cloudReady || cloudLoading || !cloudClient || !activeCloudUser || activeAccess?.scope !== "full") return;
    const updatedAt = new Date().toISOString();
    const { error } = await cloudClient.from("app_state").update({
      inventory: items,
      inventory_meta: meta,
      stock: stockItems,
      stock_meta: stockMeta,
      updated_at: updatedAt,
      updated_by: activeCloudUser.id
    }).eq("id", "main");
    if (error) {
      console.error("No se pudo sincronizar", error);
      setSyncState("error", "Los cambios quedan guardados localmente hasta recuperar la conexión.");
      showToast("No se pudo guardar en la nube");
      return;
    }
    setSyncState("ready", `Último guardado: ${new Date(updatedAt).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}`);
  }

  async function pushInstalledCloudState() {
    if (!cloudReady || cloudLoading || !cloudClient || !activeCloudUser || !activeAccess) return;
    const updatedAt = new Date().toISOString();
    const { error } = await cloudClient.from("installed_base_state").update({
      installed_base: installedItems,
      installed_meta: installedMeta,
      updated_at: updatedAt,
      updated_by: activeCloudUser.id
    }).eq("id", "main");
    if (error) {
      console.error("No se pudo sincronizar la base instalada", error);
      setSyncState("error", "Los cambios quedan guardados localmente hasta recuperar la conexión.");
      showToast("No se pudo guardar en la nube");
      return;
    }
    setSyncState("ready", `Último guardado: ${new Date(updatedAt).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}`);
  }

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  function formatMoney(value) { return money.format(Number(value) || 0).replace("PYG", "₲").trim(); }
  function formatStockMoney(value) { return `US$ ${(Number(value) || 0).toLocaleString("es-PY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
  function subtotal(item) { return (Number(item.quantity) || 0) * (Number(item.unitCost) || 0); }
  function stockValuationQuantity(item) { return item.priceBasis === "Caja" ? Number(item.boxes || 0) : Number(item.quantity || 0); }
  function stockNetPrice(item) { return Number(item.listPriceUsd || 0) / (1 + Number(item.vatRate || 0) / 100); }
  function stockEstimatedUnitCost(item) { return stockNetPrice(item) / (1 + Number(item.marginPercent || 0) / 100); }
  function stockEstimatedTotalCost(item) { return stockValuationQuantity(item) * stockEstimatedUnitCost(item); }
  function stockStatus(item) { return STOCK_STATUSES.includes(item.status) ? item.status : "No disponible"; }
  function stockStatusClass(item) { return stockStatus(item).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replaceAll(" ", "-"); }
  function normalizedStockProductKey(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLocaleUpperCase("es"); }
  function consolidatedStockCategory(value) { return STOCK_RUBRICS.includes(value) ? value : "Insumos"; }
  function inferStockRubric(item) {
    if (STOCK_RUBRICS.includes(item.category)) return item.category;
    const text = normalizedStockProductKey(`${item.name} ${item.model}`);
    const previousCategory = normalizedStockProductKey(item.category);
    if (previousCategory === "EQUIPOS") return "Equipos";
    if (/\bCARTUCHO\b/.test(text)) return "Cartuchos";
    if (/(PIEZA DE MANO|PIEZA MANO|MANGUERA|CONEXION|POWER STAGE|SENSOR DE PRESION|BOMBA DE AGUA|FLOW SWITCH|FILTRO DE AIRE|FILTRO DE AGUA|RUEDAS|SOPORTE PIEZA|APLICADOR|TAPON PIEZA|SET DE ACCESORIOS)/.test(text)) return "Repuestos";
    if (["ALQUIMIA", "COSMETICA", "FINE"].includes(previousCategory) || /(EMULSION|MORE TO SKIN|AMPOLLAS|MASCARA|CLEANSYS|\bPEEL\b|REJUVE|\bSEBO\b|\bACTIV\b|ANTIOX|BETA HD|BOOSTER|GLYSAL|PERK EYES|PERK LIPS|RINSEAWAY|\bGLIDE\b)/.test(text)) return "Cosmética";
    return "Insumos";
  }
  function migrateStockRubrics() {
    if (stockMeta.rubricVersion === STOCK_RUBRIC_VERSION) return false;
    const migratedAt = new Date().toISOString();
    let migratedRecords = 0;
    stockItems = stockItems.map((item) => {
      const category = inferStockRubric(item);
      if (category === item.category) return item;
      migratedRecords += 1;
      return { ...item, category, updatedAt: migratedAt };
    });
    const counts = STOCK_RUBRICS.reduce((result, rubric) => {
      result[rubric] = stockItems.filter((item) => item.category === rubric).length;
      return result;
    }, {});
    stockMeta.rubricVersion = STOCK_RUBRIC_VERSION;
    stockMeta.rubricMigration = { version: STOCK_RUBRIC_VERSION, migratedAt, migratedRecords, counts };
    stockMeta.updatedAt = migratedAt;
    return true;
  }
  function formatDate(value) { if (!value) return "—"; const d = new Date(`${value}T12:00:00`); return Number.isNaN(d.getTime()) ? "—" : dateFormat.format(d); }
  function uid() { return globalThis.crypto?.randomUUID?.() || `item-${Date.now()}-${Math.random().toString(16).slice(2)}`; }

  function decisionClass(decision) {
    if (decision === "Revisar") return "review";
    if (decision === "Excluir") return "exclude";
    return "include";
  }

  function itemIssue(item) {
    const issues = [];
    if (!Number(item.unitCost)) issues.push("falta valor");
    if (!item.location.trim()) issues.push("falta ubicación");
    return issues.join(" · ");
  }

  function renderInsuranceSummary() {
    const includedItems = items.filter((item) => item.decision === "Incluir");
    const reviewItems = items.filter((item) => item.decision === "Revisar");
    const inventoryTotalPyg = includedItems.reduce((sum, item) => sum + subtotal(item), 0);
    const exchangeRate = Math.max(1, Number(meta.insuranceExchangeRate) || DEFAULT_INSURANCE_EXCHANGE_RATE);
    const inventoryTotalUsd = inventoryTotalPyg / exchangeRate;
    const stockTotalUsd = stockItems.reduce((sum, item) => sum + stockEstimatedTotalCost(item), 0);
    const combinedTotalUsd = inventoryTotalUsd + stockTotalUsd;
    const combinedTotalPyg = inventoryTotalPyg + (stockTotalUsd * exchangeRate);
    const pricedStock = stockItems.filter((item) => Number(item.listPriceUsd) > 0);
    const unpricedStock = stockItems.length - pricedStock.length;
    const includedUnits = includedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    $("#report-inventory-pyg").textContent = formatMoney(inventoryTotalPyg);
    $("#report-inventory-usd").textContent = formatStockMoney(inventoryTotalUsd);
    $("#report-stock-usd").textContent = formatStockMoney(stockTotalUsd);
    $("#report-total").textContent = formatStockMoney(combinedTotalUsd);
    $("#report-total-pyg").textContent = `Equivale a ${formatMoney(combinedTotalPyg)}`;
    $("#report-office-count").textContent = `${includedItems.length} registros · ${includedUnits.toLocaleString("es-PY")} unidades`;
    $("#report-status-note").textContent = `Base calculada con ${includedItems.length} bienes de oficina incluidos y ${pricedStock.length} de ${stockItems.length} registros de stock con precio. Pendientes: ${reviewItems.length} bienes por revisar y ${unpricedStock} registros de stock sin precio de lista.`;

    const groupedStock = new Map();
    stockItems.forEach((item) => {
      const category = item.category || "Sin rubro";
      const group = groupedStock.get(category) || { category, records: 0, priced: 0, units: 0, boxes: 0, totalUsd: 0 };
      group.records += 1;
      if (Number(item.listPriceUsd) > 0) group.priced += 1;
      group.units += Number(item.quantity || 0);
      group.boxes += Number(item.boxes || 0);
      group.totalUsd += stockEstimatedTotalCost(item);
      groupedStock.set(category, group);
    });
    const stockGroups = [...groupedStock.values()].sort((a, b) => a.category.localeCompare(b.category, "es", { sensitivity: "base" }));
    $("#report-stock-summary-body").innerHTML = stockGroups.map((group) => `
      <tr><td><strong>${escapeHTML(group.category)}</strong></td><td>${group.priced} de ${group.records}</td><td>${group.units.toLocaleString("es-PY")}</td><td>${group.boxes.toLocaleString("es-PY")}</td><td><strong>${formatStockMoney(group.totalUsd)}</strong></td></tr>
    `).join("");
  }

  function sortValue(item, key) {
    if (key === "quantity") return Number(item.quantity) || 0;
    if (key === "unitCost") return Number(item.unitCost) || 0;
    if (key === "total") return subtotal(item);
    if (key === "decision") return DECISIONS.indexOf(item.decision);
    return String(item[key] || "");
  }

  function sortItems(list) {
    if (!sortState.key) return [...list];
    const direction = sortState.direction === "desc" ? -1 : 1;
    return list.map((item, index) => ({ item, index })).sort((left, right) => {
      const a = sortValue(left.item, sortState.key);
      const b = sortValue(right.item, sortState.key);
      const comparison = typeof a === "number" && typeof b === "number"
        ? a - b
        : String(a).localeCompare(String(b), "es", { numeric: true, sensitivity: "base" });
      return comparison ? comparison * direction : left.index - right.index;
    }).map(({ item }) => item);
  }

  function renderSortControls() {
    $$('[data-sort-key]').forEach((button) => {
      const active = button.dataset.sortKey === sortState.key;
      const direction = active ? sortState.direction : "";
      button.classList.toggle("active", active);
      button.querySelector(".sort-indicator").textContent = direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕";
      button.setAttribute("aria-label", `Ordenar por ${button.dataset.sortLabel} ${direction === "asc" ? "descendente" : "ascendente"}`);
      button.closest("th").setAttribute("aria-sort", direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none");
    });
  }

  function filteredItems() {
    const query = $("#search-input").value.trim().toLocaleLowerCase("es");
    const category = $("#category-filter").value;
    const decision = $("#decision-filter").value;
    return sortItems(items.filter((item) => {
      const haystack = [item.name, item.brand, item.model, item.serial, item.location, item.receipt, item.notes, item.source].join(" ").toLocaleLowerCase("es");
      return (!query || haystack.includes(query)) && (!category || item.category === category) && (!decision || item.decision === decision);
    }));
  }

  function render() {
    const includedItems = sortItems(items.filter((item) => item.decision === "Incluir"));
    const reviewItems = items.filter((item) => item.decision === "Revisar");
    const total = includedItems.reduce((sum, item) => sum + subtotal(item), 0);
    const reviewTotal = reviewItems.reduce((sum, item) => sum + subtotal(item), 0);
    const units = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const locations = new Set(items.map((item) => item.location.trim().toLocaleLowerCase("es")).filter(Boolean)).size;
    const missing = items.filter((item) => !Number(item.unitCost) || !item.location.trim()).length;

    $("#summary-value").textContent = formatMoney(total);
    $("#summary-records").textContent = `${includedItems.length} de ${items.length} registros incluidos`;
    $("#summary-review-value").textContent = formatMoney(reviewTotal);
    $("#summary-review-records").textContent = `${reviewItems.length} registros pendientes`;
    $("#summary-missing").textContent = missing.toLocaleString("es-PY");
    $("#summary-locations").textContent = locations;
    $("#summary-units").textContent = `${units.toLocaleString("es-PY")} unidades registradas`;
    $("#last-update").textContent = meta.updatedAt ? `Actualizado ${dateFormat.format(new Date(meta.updatedAt))}` : "Sin cambios todavía";

    const selectedCategory = $("#category-filter").value;
    const usedCategories = [...new Set([...CATEGORIES, ...items.map((item) => item.category)])].filter((category) => items.some((item) => item.category === category));
    $("#category-filter").innerHTML = `<option value="">Todas las categorías</option>${usedCategories.map((category) => `<option ${category === selectedCategory ? "selected" : ""}>${escapeHTML(category)}</option>`).join("")}`;

    const visible = filteredItems();
    renderSortControls();
    $("#table-count").textContent = visible.length === items.length
      ? `${items.length} ${items.length === 1 ? "bien" : "bienes"}`
      : `${visible.length} mostrados de ${items.length}`;
    $("#inventory-body").innerHTML = visible.map((item) => {
      const issue = itemIssue(item);
      return `
      <tr>
        <td><div class="item-cell">${item.photo ? `<img class="item-thumb" src="${item.photo}" alt="" />` : `<span class="item-thumb">${escapeHTML(item.name.charAt(0).toUpperCase())}</span>`}<div><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML([item.brand, item.model, item.serial].filter(Boolean).join(" · ") || "Sin identificación adicional")}</small>${issue ? `<small class="item-warning">${escapeHTML(issue)}</small>` : ""}</div></div></td>
        <td>${escapeHTML(item.category)}</td><td>${item.location ? escapeHTML(item.location) : `<span class="missing-value">Sin ubicación</span>`}</td><td class="numeric">${Number(item.quantity).toLocaleString("es-PY")}</td>
        <td class="numeric">${Number(item.unitCost) ? formatMoney(item.unitCost) : `<span class="missing-value">Sin valor</span>`}</td><td class="numeric"><strong>${Number(item.unitCost) ? formatMoney(subtotal(item)) : "—"}</strong></td>
        <td><select class="decision-control ${decisionClass(item.decision)}" data-decision-id="${item.id}" aria-label="Decisión para ${escapeHTML(item.name)}">${DECISIONS.map((decision) => `<option ${decision === item.decision ? "selected" : ""}>${decision}</option>`).join("")}</select></td>
        <td><button class="row-action" type="button" data-open-id="${item.id}" aria-label="Ver ${escapeHTML(item.name)}">•••</button></td>
      </tr>`;
    }).join("");

    $("#empty-state").hidden = items.length !== 0;
    $("#no-results").hidden = items.length === 0 || visible.length !== 0;
    $("#inventory-body").hidden = visible.length === 0;

    $("#report-body").innerHTML = includedItems.map((item, index) => `
      <tr><td>${index + 1}</td><td><strong>${escapeHTML(item.name)}</strong><br><small>${escapeHTML([item.category, item.brand, item.model, item.serial && `Serie: ${item.serial}`, item.receipt && `Comp.: ${item.receipt}`].filter(Boolean).join(" · "))}</small></td><td>${escapeHTML(item.location)}</td><td>${Number(item.quantity)}</td><td>${escapeHTML(item.condition)}</td><td>${formatMoney(item.unitCost)}</td><td>${formatMoney(subtotal(item))}</td></tr>
    `).join("");
    $("#report-empty").hidden = includedItems.length !== 0;
    renderInsuranceSummary();

    $$("[data-open-id]").forEach((button) => button.addEventListener("click", () => openDetail(button.dataset.openId)));
    $$("[data-decision-id]").forEach((select) => select.addEventListener("change", () => {
      const item = items.find((entry) => entry.id === select.dataset.decisionId);
      if (!item) return;
      item.decision = select.value;
      save();
      showToast(`“${item.name}” marcado: ${item.decision}`);
    }));
  }

  function stockSortValue(item, key) {
    if (["quantity", "boxes", "listPriceUsd", "marginPercent"].includes(key)) return Number(item[key]) || 0;
    if (key === "netPriceUsd") return stockNetPrice(item);
    if (key === "estimatedUnitCostUsd") return stockEstimatedUnitCost(item);
    if (key === "estimatedTotalCostUsd") return stockEstimatedTotalCost(item);
    if (key === "status") return STOCK_STATUSES.indexOf(stockStatus(item));
    return String(item[key] || "");
  }

  function sortStockItems(list) {
    if (!stockSortState.key) return [...list];
    const direction = stockSortState.direction === "desc" ? -1 : 1;
    return list.map((item, index) => ({ item, index })).sort((left, right) => {
      const a = stockSortValue(left.item, stockSortState.key);
      const b = stockSortValue(right.item, stockSortState.key);
      const comparison = typeof a === "number" && typeof b === "number"
        ? a - b
        : String(a).localeCompare(String(b), "es", { numeric: true, sensitivity: "base" });
      return comparison ? comparison * direction : left.index - right.index;
    }).map(({ item }) => item);
  }

  function renderStockSortControls() {
    $$('[data-stock-sort-key]').forEach((button) => {
      const active = button.dataset.stockSortKey === stockSortState.key;
      const direction = active ? stockSortState.direction : "";
      button.classList.toggle("active", active);
      button.querySelector(".sort-indicator").textContent = direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕";
      button.setAttribute("aria-label", `Ordenar por ${button.dataset.sortLabel} ${direction === "asc" ? "descendente" : "ascendente"}`);
      button.closest("th").setAttribute("aria-sort", direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none");
    });
  }

  function filteredStockItems() {
    const query = $("#stock-search-input").value.trim().toLocaleLowerCase("es");
    const category = $("#stock-category-filter").value;
    const status = $("#stock-status-filter").value;
    return sortStockItems(stockItems.filter((item) => {
      const haystack = [item.name, item.category, item.brand, item.model, item.serial, item.valuationCriterion, item.priceSource, item.notes, item.source].join(" ").toLocaleLowerCase("es");
      return (!query || haystack.includes(query)) && (!category || item.category === category) && (!status || stockStatus(item) === status);
    }));
  }

  function renderStock() {
    const units = stockItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const boxes = stockItems.reduce((sum, item) => sum + Number(item.boxes || 0), 0);
    const available = stockItems.filter((item) => stockStatus(item) === "Disponible").length;
    const unavailable = stockItems.filter((item) => stockStatus(item) === "No disponible").length;
    const loans = stockItems.filter((item) => stockStatus(item) === "A préstamo").length;
    const categories = new Set(stockItems.map((item) => item.category.trim().toLocaleLowerCase("es")).filter(Boolean)).size;
    const totalValue = stockItems.reduce((sum, item) => sum + stockEstimatedTotalCost(item), 0);
    const unpriced = stockItems.filter((item) => !Number(item.listPriceUsd)).length;

    $("#stock-summary-value").textContent = formatStockMoney(totalValue);
    $("#stock-summary-unpriced").textContent = `${unpriced.toLocaleString("es-PY")} ${unpriced === 1 ? "registro sin precio de lista" : "registros sin precio de lista"}`;
    $("#stock-summary-records").textContent = stockItems.length.toLocaleString("es-PY");
    $("#stock-summary-categories").textContent = `${categories} ${categories === 1 ? "rubro" : "rubros"}`;
    $("#stock-summary-available").textContent = available.toLocaleString("es-PY");
    $("#stock-summary-status-note").textContent = `${unavailable.toLocaleString("es-PY")} no disponibles · ${loans.toLocaleString("es-PY")} a préstamo`;
    $("#stock-summary-units").textContent = units.toLocaleString("es-PY");
    $("#stock-summary-boxes").textContent = `${boxes.toLocaleString("es-PY")} ${boxes === 1 ? "caja" : "cajas"}`;
    $("#stock-last-update").textContent = stockMeta.updatedAt ? `Actualizado ${dateFormat.format(new Date(stockMeta.updatedAt))}` : "Sin cambios todavía";
    $("#stock-default-margin").value = stockMeta.defaultMarginPercent;

    const selectedCategory = $("#stock-category-filter").value;
    const usedCategories = STOCK_RUBRICS.filter((category) => stockItems.some((item) => item.category === category));
    $("#stock-category-filter").innerHTML = `<option value="">Todos los rubros</option>${usedCategories.map((category) => `<option ${category === selectedCategory ? "selected" : ""}>${escapeHTML(category)}</option>`).join("")}`;

    const visible = filteredStockItems();
    renderStockSortControls();
    $("#stock-table-count").textContent = visible.length === stockItems.length
      ? `${stockItems.length} ${stockItems.length === 1 ? "producto" : "productos"}`
      : `${visible.length} mostrados de ${stockItems.length}`;
    $("#stock-body").innerHTML = visible.map((item) => {
      const status = stockStatus(item);
      return `
      <tr class="stock-row ${stockStatusClass(item)}">
        <td><div class="item-cell"><span class="item-thumb stock-thumb">${escapeHTML(item.name.charAt(0).toUpperCase())}</span><div><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.notes || item.source || "Sin notas adicionales")}</small></div></div></td>
        <td>${escapeHTML(item.category)}</td><td>${escapeHTML(item.brand || "—")}</td><td>${escapeHTML(item.model || "—")}</td><td>${escapeHTML(item.serial || "—")}</td>
        <td class="numeric">${Number(item.boxes).toLocaleString("es-PY")}</td><td class="numeric"><strong>${Number(item.quantity).toLocaleString("es-PY")}</strong></td>
        <td class="numeric">${Number(item.listPriceUsd) ? `${formatStockMoney(item.listPriceUsd)}<small class="price-basis">por ${item.priceBasis.toLocaleLowerCase("es")} · IVA ${item.vatRate}%</small>` : "—"}</td>
        <td class="numeric">${Number(item.listPriceUsd) ? formatStockMoney(stockNetPrice(item)) : "—"}</td>
        <td class="numeric"><span class="margin-badge">${Number(item.marginPercent).toLocaleString("es-PY", { maximumFractionDigits: 2 })}%</span></td>
        <td class="numeric">${Number(item.listPriceUsd) ? `<strong>${formatStockMoney(stockEstimatedUnitCost(item))}</strong><small class="price-basis">por ${item.priceBasis.toLocaleLowerCase("es")}</small>` : "—"}</td>
        <td class="numeric"><strong>${Number(item.listPriceUsd) ? formatStockMoney(stockEstimatedTotalCost(item)) : "—"}</strong></td>
        <td><span class="stock-status ${stockStatusClass(item)}">${status}</span></td>
        <td><button class="row-action" type="button" data-stock-open-id="${item.id}" aria-label="Ver ${escapeHTML(item.name)}">•••</button></td>
      </tr>`;
    }).join("");

    $("#stock-empty-state").hidden = stockItems.length !== 0;
    $("#stock-no-results").hidden = stockItems.length === 0 || visible.length !== 0;
    $("#stock-body").hidden = visible.length === 0;
    $$('[data-stock-open-id]').forEach((button) => button.addEventListener("click", () => openStockDetail(button.dataset.stockOpenId)));
    renderInsuranceSummary();
    renderGroupedStock();
  }

  function consolidatedStockItems() {
    const groups = new Map();
    stockItems.forEach((item) => {
      const key = normalizedStockProductKey(item.name || item.model || item.brand || item.id);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return [...groups.values()].map((members) => {
      const activeMembers = members.filter((item) => Number(item.quantity || 0) > 0 || Number(item.boxes || 0) > 0);
      const representative = activeMembers.find((item) => Number(item.listPriceUsd || 0) > 0) || activeMembers[0] || members[0];
      const valuationQuantity = members.reduce((sum, item) => sum + stockValuationQuantity(item), 0);
      const pricedValuationQuantity = members.reduce((sum, item) => sum + (Number(item.listPriceUsd || 0) > 0 ? stockValuationQuantity(item) : 0), 0);
      const totalCost = members.reduce((sum, item) => sum + stockEstimatedTotalCost(item), 0);
      const weightedAverage = (selector) => pricedValuationQuantity
        ? members.reduce((sum, item) => sum + (Number(item.listPriceUsd || 0) > 0 ? selector(item) * stockValuationQuantity(item) : 0), 0) / pricedValuationQuantity
        : 0;
      const categories = members.map((item) => consolidatedStockCategory(item.category)).filter(Boolean);
      const category = categories.sort((a, b) => categories.filter((value) => value === b).length - categories.filter((value) => value === a).length)[0] || "ARES";
      const brands = [...new Set(members.map((item) => item.brand.trim()).filter(Boolean))];
      const models = [...new Set(members.map((item) => item.model.trim()).filter(Boolean))];
      const priceBases = [...new Set(members.filter((item) => Number(item.listPriceUsd || 0) > 0).map((item) => item.priceBasis))];
      const priceSignatures = new Set(members.filter((item) => Number(item.listPriceUsd || 0) > 0).map((item) => [item.priceBasis, item.listPriceUsd, item.vatRate, item.marginPercent].join("|")));
      return {
        id: `grouped-${normalizedStockProductKey(representative.name)}`,
        name: representative.name,
        category,
        brand: brands.length > 1 ? "Varias marcas" : (brands[0] || ""),
        model: models.length > 1 ? "Varios modelos" : (models[0] || ""),
        boxes: members.reduce((sum, item) => sum + Number(item.boxes || 0), 0),
        quantity: members.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        recordCount: members.length,
        valuationQuantity,
        pricedValuationQuantity,
        priceBasis: priceBases.length > 1 ? "Mixto" : (priceBases[0] || representative.priceBasis),
        listPriceUsd: weightedAverage((item) => Number(item.listPriceUsd || 0)),
        netPriceUsd: weightedAverage(stockNetPrice),
        marginPercent: weightedAverage((item) => Number(item.marginPercent || 0)),
        estimatedUnitCostUsd: pricedValuationQuantity ? totalCost / pricedValuationQuantity : 0,
        estimatedTotalCostUsd: totalCost,
        priceVariants: priceSignatures.size,
        hasPartialPricing: pricedValuationQuantity < valuationQuantity
      };
    }).filter((item) => item.quantity > 0 || item.boxes > 0);
  }

  function groupedStockSortValue(item, key) {
    if (["quantity", "boxes", "listPriceUsd", "netPriceUsd", "marginPercent", "estimatedUnitCostUsd", "estimatedTotalCostUsd"].includes(key)) return Number(item[key]) || 0;
    return String(item[key] || "");
  }

  function sortGroupedStockItems(list) {
    const direction = groupedStockSortState.direction === "desc" ? -1 : 1;
    return list.map((item, index) => ({ item, index })).sort((left, right) => {
      const a = groupedStockSortValue(left.item, groupedStockSortState.key);
      const b = groupedStockSortValue(right.item, groupedStockSortState.key);
      const comparison = typeof a === "number" && typeof b === "number"
        ? a - b
        : String(a).localeCompare(String(b), "es", { numeric: true, sensitivity: "base" });
      return comparison ? comparison * direction : left.index - right.index;
    }).map(({ item }) => item);
  }

  function renderGroupedStockSortControls() {
    $$('[data-grouped-stock-sort-key]').forEach((button) => {
      const active = button.dataset.groupedStockSortKey === groupedStockSortState.key;
      const direction = active ? groupedStockSortState.direction : "";
      button.classList.toggle("active", active);
      button.querySelector(".sort-indicator").textContent = direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕";
      button.setAttribute("aria-label", `Ordenar por ${button.dataset.sortLabel} ${direction === "asc" ? "descendente" : "ascendente"}`);
      button.closest("th").setAttribute("aria-sort", direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none");
    });
  }

  function filteredGroupedStockItems(groups) {
    const query = $("#grouped-stock-search-input").value.trim().toLocaleLowerCase("es");
    const category = $("#grouped-stock-category-filter").value;
    return sortGroupedStockItems(groups.filter((item) => {
      const haystack = [item.name, item.category, item.brand, item.model].join(" ").toLocaleLowerCase("es");
      return (!query || haystack.includes(query)) && (!category || item.category === category);
    }));
  }

  function renderGroupedStock() {
    const groups = consolidatedStockItems();
    const totalValue = groups.reduce((sum, item) => sum + item.estimatedTotalCostUsd, 0);
    const detailedTotalValue = stockItems.reduce((sum, item) => sum + stockEstimatedTotalCost(item), 0);
    const units = groups.reduce((sum, item) => sum + item.quantity, 0);
    const boxes = groups.reduce((sum, item) => sum + item.boxes, 0);
    const categories = [...new Set(groups.map((item) => item.category))];
    const unpriced = groups.filter((item) => !item.listPriceUsd || item.hasPartialPricing).length;

    $("#grouped-stock-summary-value").textContent = formatStockMoney(totalValue);
    $("#grouped-stock-summary-valuation").textContent = Math.abs(totalValue - detailedTotalValue) < 0.01
      ? `Coincide con los ${stockItems.length.toLocaleString("es-PY")} registros detallados`
      : "Revisar diferencias con el stock detallado";
    $("#grouped-stock-summary-products").textContent = groups.length.toLocaleString("es-PY");
    $("#grouped-stock-summary-lines").textContent = `${categories.length.toLocaleString("es-PY")} ${categories.length === 1 ? "rubro" : "rubros"}`;
    $("#grouped-stock-summary-units").textContent = units.toLocaleString("es-PY");
    $("#grouped-stock-summary-boxes").textContent = `${boxes.toLocaleString("es-PY")} ${boxes === 1 ? "caja" : "cajas"}`;
    $("#grouped-stock-summary-unpriced").textContent = unpriced.toLocaleString("es-PY");
    $("#grouped-stock-last-update").textContent = stockMeta.updatedAt ? `Actualizado ${dateFormat.format(new Date(stockMeta.updatedAt))}` : "Sin cambios todavía";

    const selectedCategory = $("#grouped-stock-category-filter").value;
    $("#grouped-stock-category-filter").innerHTML = `<option value="">Todos los rubros</option>${categories.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })).map((category) => `<option ${category === selectedCategory ? "selected" : ""}>${escapeHTML(category)}</option>`).join("")}`;

    const visible = filteredGroupedStockItems(groups);
    renderGroupedStockSortControls();
    $("#grouped-stock-table-count").textContent = visible.length === groups.length
      ? `${groups.length} ${groups.length === 1 ? "producto agrupado" : "productos agrupados"}`
      : `${visible.length} mostrados de ${groups.length}`;
    $("#grouped-stock-body").innerHTML = visible.map((item) => {
      const priceNote = item.hasPartialPricing ? "Precio parcial" : item.priceVariants > 1 ? "Promedio ponderado" : `por ${String(item.priceBasis).toLocaleLowerCase("es")}`;
      return `
      <tr class="stock-row grouped-stock-row">
        <td><div class="item-cell"><span class="item-thumb stock-thumb">${escapeHTML(item.name.charAt(0).toUpperCase())}</span><div><strong>${escapeHTML(item.name)}</strong><small>${item.recordCount.toLocaleString("es-PY")} ${item.recordCount === 1 ? "registro detallado" : "registros detallados"} agrupados</small></div></div></td>
        <td>${escapeHTML(item.category)}</td>
        <td><strong>${escapeHTML(item.brand || "—")}</strong><small class="grouped-model">${escapeHTML(item.model || "Sin modelo")}</small></td>
        <td class="numeric">${item.boxes.toLocaleString("es-PY")}</td>
        <td class="numeric"><strong>${item.quantity.toLocaleString("es-PY")}</strong></td>
        <td class="numeric">${item.listPriceUsd ? `${formatStockMoney(item.listPriceUsd)}<small class="price-basis">${escapeHTML(priceNote)} · IVA incluido</small>` : "—"}</td>
        <td class="numeric">${item.netPriceUsd ? formatStockMoney(item.netPriceUsd) : "—"}</td>
        <td class="numeric">${item.listPriceUsd ? `<span class="margin-badge">${item.marginPercent.toLocaleString("es-PY", { maximumFractionDigits: 2 })}%</span>` : "—"}</td>
        <td class="numeric">${item.estimatedUnitCostUsd ? `<strong>${formatStockMoney(item.estimatedUnitCostUsd)}</strong><small class="price-basis">${escapeHTML(priceNote)}</small>` : "—"}</td>
        <td class="numeric"><strong>${item.estimatedTotalCostUsd ? formatStockMoney(item.estimatedTotalCostUsd) : "—"}</strong></td>
      </tr>`;
    }).join("");

    $("#grouped-stock-empty-state").hidden = groups.length !== 0;
    $("#grouped-stock-no-results").hidden = groups.length === 0 || visible.length !== 0;
    $("#grouped-stock-body").hidden = visible.length === 0;
  }

  function installedCompleteness(item) {
    if (!item.installationDate && !item.serial) return "Fecha y serie pendientes";
    if (!item.installationDate) return "Fecha pendiente";
    if (!item.serial) return "Serie pendiente";
    return "Completo";
  }

  function installedCompletenessClass(item) {
    return installedCompleteness(item).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replaceAll(" ", "-");
  }

  function normalizedSerial(serial) {
    return String(serial || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  }

  function installedIdentityKey(item) {
    const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/^(DRA|DR|LIC)\.?\s+/i, "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
    return `${normalize(item.client)}:${normalize(item.model)}`;
  }

  function installedSerialCounts() {
    return installedItems.reduce((counts, item) => {
      const serial = normalizedSerial(item.serial);
      if (serial) counts.set(serial, (counts.get(serial) || 0) + 1);
      return counts;
    }, new Map());
  }

  function installedSortValue(item, key) {
    if (key === "completeness") return ["Completo", "Fecha pendiente", "Serie pendiente", "Fecha y serie pendientes"].indexOf(installedCompleteness(item));
    return String(item[key] || "");
  }

  function sortInstalledItems(list) {
    if (!installedSortState.key) return [...list];
    const direction = installedSortState.direction === "desc" ? -1 : 1;
    return list.map((item, index) => ({ item, index })).sort((left, right) => {
      const a = installedSortValue(left.item, installedSortState.key);
      const b = installedSortValue(right.item, installedSortState.key);
      const comparison = typeof a === "number" && typeof b === "number"
        ? a - b
        : String(a).localeCompare(String(b), "es", { numeric: true, sensitivity: "base" });
      return comparison ? comparison * direction : left.index - right.index;
    }).map(({ item }) => item);
  }

  function renderInstalledSortControls() {
    $$('[data-installed-sort-key]').forEach((button) => {
      const active = button.dataset.installedSortKey === installedSortState.key;
      const direction = active ? installedSortState.direction : "";
      button.classList.toggle("active", active);
      button.querySelector(".sort-indicator").textContent = direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕";
      button.setAttribute("aria-label", `Ordenar por ${button.dataset.sortLabel} ${direction === "asc" ? "descendente" : "ascendente"}`);
      button.closest("th").setAttribute("aria-sort", direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none");
    });
  }

  function filteredInstalledItems() {
    const query = $("#installed-search-input").value.trim().toLocaleLowerCase("es");
    const manufacturer = $("#installed-manufacturer-filter").value;
    const completeness = $("#installed-completeness-filter").value;
    return sortInstalledItems(installedItems.filter((item) => {
      const haystack = [item.client, item.manufacturer, item.model, item.serial, item.installationDate, item.warrantyEnd, item.notes, item.source].join(" ").toLocaleLowerCase("es");
      return (!query || haystack.includes(query)) && (!manufacturer || item.manufacturer === manufacturer) && (!completeness || installedCompleteness(item) === completeness);
    }));
  }

  function renderInstalled() {
    const clients = new Set(installedItems.map((item) => item.client.trim().toLocaleLowerCase("es")).filter(Boolean)).size;
    const manufacturers = new Set(installedItems.map((item) => item.manufacturer.trim().toLocaleLowerCase("es")).filter(Boolean)).size;
    const withDate = installedItems.filter((item) => item.installationDate).length;
    const missingDate = installedItems.filter((item) => !item.installationDate).length;
    const missingSerial = installedItems.filter((item) => !item.serial).length;
    const incomplete = installedItems.filter((item) => installedCompleteness(item) !== "Completo").length;
    const datedRecords = installedItems.filter((item) => item.installationDate).sort((a, b) => a.installationDate.localeCompare(b.installationDate));
    const firstDate = datedRecords[0]?.installationDate;
    const lastDate = datedRecords.at(-1)?.installationDate;

    $("#installed-summary-records").textContent = installedItems.length.toLocaleString("es-PY");
    $("#installed-summary-brands").textContent = `${manufacturers.toLocaleString("es-PY")} ${manufacturers === 1 ? "fabricante registrado" : "fabricantes registrados"}`;
    $("#installed-summary-clients").textContent = clients.toLocaleString("es-PY");
    $("#installed-summary-dated").textContent = withDate.toLocaleString("es-PY");
    $("#installed-summary-date-range").textContent = firstDate && lastDate ? `${formatDate(firstDate)} a ${formatDate(lastDate)}` : "Sin fechas registradas";
    $("#installed-summary-incomplete").textContent = incomplete.toLocaleString("es-PY");
    $("#installed-summary-missing-note").textContent = `${missingDate} sin fecha · ${missingSerial} sin serie`;
    $("#installed-last-update").textContent = installedMeta.updatedAt ? `Actualizado ${dateFormat.format(new Date(installedMeta.updatedAt))}` : "Sin cambios todavía";

    const selectedManufacturer = $("#installed-manufacturer-filter").value;
    const usedManufacturers = [...new Set(installedItems.map((item) => item.manufacturer).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    $("#installed-manufacturer-filter").innerHTML = `<option value="">Todos los fabricantes</option>${usedManufacturers.map((manufacturer) => `<option ${manufacturer === selectedManufacturer ? "selected" : ""}>${escapeHTML(manufacturer)}</option>`).join("")}`;

    const visible = filteredInstalledItems();
    const serialCounts = installedSerialCounts();
    renderInstalledSortControls();
    $("#installed-table-count").textContent = visible.length === installedItems.length
      ? `${installedItems.length} ${installedItems.length === 1 ? "equipo" : "equipos"}`
      : `${visible.length} mostrados de ${installedItems.length}`;
    $("#installed-body").innerHTML = visible.map((item) => {
      const completeness = installedCompleteness(item);
      const duplicateSerial = item.serial && (serialCounts.get(normalizedSerial(item.serial)) || 0) > 1;
      return `
      <tr class="installed-row ${installedCompletenessClass(item)}">
        <td><div class="client-cell"><strong>${escapeHTML(item.client || "Cliente pendiente")}</strong><small>${escapeHTML(item.notes || "Sin observaciones")}</small></div></td>
        <td><div class="item-cell installed-equipment-cell"><span class="item-thumb installed-thumb">${escapeHTML((item.manufacturer || item.model).charAt(0).toUpperCase())}</span><div><strong>${escapeHTML(item.model)}</strong><small>${escapeHTML(item.manufacturer || "Fabricante pendiente")}</small></div></div></td>
        <td>${item.serial ? `<span class="serial-value">${escapeHTML(item.serial)}</span>${duplicateSerial ? `<small class="duplicate-note">Serie repetida</small>` : ""}` : `<span class="missing-value">Sin serie</span>`}</td>
        <td>${item.installationDate ? formatDate(item.installationDate) : `<span class="missing-value">Sin fecha</span>`}</td>
        <td>${item.warrantyEnd ? formatDate(item.warrantyEnd) : "—"}</td>
        <td><span class="installed-status ${installedCompletenessClass(item)}">${completeness}</span></td>
        <td><button class="row-action" type="button" data-installed-open-id="${item.id}" aria-label="Ver ${escapeHTML(item.model)} de ${escapeHTML(item.client)}">•••</button></td>
      </tr>`;
    }).join("");

    $("#installed-empty-state").hidden = installedItems.length !== 0;
    $("#installed-no-results").hidden = installedItems.length === 0 || visible.length !== 0;
    $("#installed-body").hidden = visible.length === 0;
    $$('[data-installed-open-id]').forEach((button) => button.addEventListener("click", () => openInstalledDetail(button.dataset.installedOpenId)));
  }

  function openInstalledForm(item = null) {
    installedForm.reset();
    $("#installed-dialog-title").textContent = item ? "Editar equipo" : "Añadir equipo";
    if (item) {
      Object.entries(item).forEach(([key, value]) => { if (installedForm.elements[key]) installedForm.elements[key].value = value ?? ""; });
    } else {
      installedForm.elements.id.value = "";
    }
    installedDialog.showModal();
    setTimeout(() => installedForm.elements.client.focus(), 30);
  }

  function openInstalledDetail(id) {
    const item = installedItems.find((entry) => entry.id === id);
    if (!item) return;
    selectedInstalledId = id;
    const completeness = installedCompleteness(item);
    const duplicateSerial = item.serial && (installedSerialCounts().get(normalizedSerial(item.serial)) || 0) > 1;
    $("#installed-detail-title").textContent = item.model;
    $("#installed-detail-content").innerHTML = `<div class="detail-layout installed-detail-layout">
      <div class="detail-photo detail-placeholder installed-detail-placeholder">${escapeHTML((item.manufacturer || item.model).charAt(0).toUpperCase())}</div>
      <dl class="detail-list">
        <div class="full"><dt>Cliente</dt><dd><strong>${escapeHTML(item.client || "Cliente pendiente")}</strong></dd></div>
        <div><dt>Fabricante</dt><dd>${escapeHTML(item.manufacturer || "—")}</dd></div><div><dt>Modelo</dt><dd>${escapeHTML(item.model)}</dd></div>
        <div><dt>Número de serie</dt><dd>${escapeHTML(item.serial || "Sin serie")}${duplicateSerial ? ` <span class="duplicate-inline">Repetida en la base</span>` : ""}</dd></div><div><dt>Estado de datos</dt><dd><span class="installed-status ${installedCompletenessClass(item)}">${completeness}</span></dd></div>
        <div><dt>Fecha de instalación</dt><dd>${formatDate(item.installationDate)}</dd></div><div><dt>Fin de garantía</dt><dd>${formatDate(item.warrantyEnd)}</dd></div>
        <div class="full"><dt>Observaciones</dt><dd>${escapeHTML(item.notes || "—")}</dd></div>
        <div class="full"><dt>Fuente</dt><dd>${escapeHTML(item.source || "Registro manual")}</dd></div>
      </dl></div>`;
    installedDetailDialog.showModal();
  }

  function openStockForm(item = null) {
    stockForm.reset();
    $("#stock-dialog-title").textContent = item ? "Editar registro" : "Añadir registro";
    if (item) {
      Object.entries(item).forEach(([key, value]) => { if (stockForm.elements[key]) stockForm.elements[key].value = value ?? ""; });
    } else {
      stockForm.elements.status.value = "Disponible";
      stockForm.elements.boxes.value = 0;
      stockForm.elements.quantity.value = 0;
      stockForm.elements.priceBasis.value = "Unidad";
      stockForm.elements.listPriceUsd.value = 0;
      stockForm.elements.vatRate.value = 10;
      stockForm.elements.marginPercent.value = stockMeta.defaultMarginPercent;
      stockForm.elements.id.value = "";
    }
    updateStockFormTotal();
    stockDialog.showModal();
    setTimeout(() => stockForm.elements.name.focus(), 30);
  }

  function updateStockFormTotal() {
    const basis = stockForm.elements.priceBasis.value;
    const quantity = basis === "Caja" ? Number(stockForm.elements.boxes.value || 0) : Number(stockForm.elements.quantity.value || 0);
    const listPriceUsd = Math.max(0, Number(stockForm.elements.listPriceUsd.value) || 0);
    const vatRate = Math.max(0, Number(stockForm.elements.vatRate.value) || 0);
    const marginPercent = Math.max(0, Number(stockForm.elements.marginPercent.value) || 0);
    const netPriceUsd = listPriceUsd / (1 + vatRate / 100);
    const estimatedUnitCostUsd = netPriceUsd / (1 + marginPercent / 100);
    $("#stock-form-net").textContent = formatStockMoney(netPriceUsd);
    $("#stock-form-unit-cost").textContent = formatStockMoney(estimatedUnitCostUsd);
    $("#stock-form-total").textContent = formatStockMoney(quantity * estimatedUnitCostUsd);
    $("#stock-form-total-note").textContent = `${quantity.toLocaleString("es-PY")} ${basis === "Caja" ? (quantity === 1 ? "caja" : "cajas") : (quantity === 1 ? "unidad" : "unidades")} × ${formatStockMoney(estimatedUnitCostUsd)}`;
  }

  function openStockDetail(id) {
    const item = stockItems.find((entry) => entry.id === id);
    if (!item) return;
    selectedStockId = id;
    const status = stockStatus(item);
    $("#stock-detail-title").textContent = item.name;
    $("#stock-detail-content").innerHTML = `<div class="detail-layout stock-detail-layout">
      <div class="detail-photo detail-placeholder stock-detail-placeholder">${escapeHTML(item.name.charAt(0).toUpperCase())}</div>
      <dl class="detail-list">
        <div><dt>Rubro</dt><dd>${escapeHTML(item.category)}</dd></div><div><dt>Estado</dt><dd><span class="stock-status ${stockStatusClass(item)}">${status}</span></dd></div>
        <div><dt>Marca</dt><dd>${escapeHTML(item.brand || "—")}</dd></div><div><dt>Modelo</dt><dd>${escapeHTML(item.model || "—")}</dd></div>
        <div><dt>Número de serie</dt><dd>${escapeHTML(item.serial || "—")}</dd></div><div><dt>Fuente</dt><dd>${escapeHTML(item.source || "Registro manual")}</dd></div>
        <div><dt>Cajas</dt><dd>${Number(item.boxes).toLocaleString("es-PY")}</dd></div><div><dt>Unidades</dt><dd><strong>${Number(item.quantity).toLocaleString("es-PY")}</strong></dd></div>
        <div><dt>Precio de lista (IVA incluido)</dt><dd>${Number(item.listPriceUsd) ? `${formatStockMoney(item.listPriceUsd)} por ${item.priceBasis.toLocaleLowerCase("es")}` : "Sin precio"}</dd></div><div><dt>IVA</dt><dd>${Number(item.vatRate) ? `${item.vatRate}%` : "Exento"}</dd></div>
        <div><dt>Precio neto sin IVA</dt><dd>${Number(item.listPriceUsd) ? formatStockMoney(stockNetPrice(item)) : "—"}</dd></div><div><dt>Ganancia aplicada</dt><dd>${Number(item.marginPercent).toLocaleString("es-PY", { maximumFractionDigits: 2 })}%</dd></div>
        <div><dt>Costo estimado unitario</dt><dd>${Number(item.listPriceUsd) ? `${formatStockMoney(stockEstimatedUnitCost(item))} por ${item.priceBasis.toLocaleLowerCase("es")}` : "—"}</dd></div><div><dt>Costo total estimado</dt><dd><strong>${Number(item.listPriceUsd) ? formatStockMoney(stockEstimatedTotalCost(item)) : "—"}</strong></dd></div>
        <div class="full"><dt>Fuente del precio</dt><dd>${escapeHTML(item.priceSource || "Sin precio importado")}</dd></div>
        <div class="full"><dt>Criterio de valorización</dt><dd>${STOCK_VALUATION_CRITERION}</dd></div>
        <div class="full"><dt>Notas</dt><dd>${escapeHTML(item.notes || "—")}</dd></div>
      </dl></div>`;
    stockDetailDialog.showModal();
  }

  function openForm(item = null) {
    form.reset();
    pendingPhoto = item?.photo || "";
    $("#dialog-title").textContent = item ? "Editar bien" : "Añadir bien";
    $("#photo-name").textContent = pendingPhoto ? "Imagen guardada" : "Sin archivo seleccionado";
    if (item) {
      Object.entries(item).forEach(([key, value]) => { if (form.elements[key] && key !== "photo") form.elements[key].value = value ?? ""; });
    } else {
      form.elements.quantity.value = 1;
      form.elements.condition.value = "Sin verificar";
      form.elements.decision.value = "Incluir";
      form.elements.id.value = "";
    }
    dialog.showModal();
    setTimeout(() => form.elements.name.focus(), 30);
  }

  function openDetail(id) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    selectedId = id;
    $("#detail-title").textContent = item.name;
    $("#detail-content").innerHTML = `<div class="detail-layout">
      ${item.photo ? `<img class="detail-photo" src="${item.photo}" alt="Foto de ${escapeHTML(item.name)}" />` : `<div class="detail-photo detail-placeholder">${escapeHTML(item.name.charAt(0).toUpperCase())}</div>`}
      <dl class="detail-list">
        <div><dt>Categoría</dt><dd>${escapeHTML(item.category)}</dd></div><div><dt>Ubicación</dt><dd>${escapeHTML(item.location || "Sin ubicación")}</dd></div>
        <div><dt>Marca y modelo</dt><dd>${escapeHTML([item.brand, item.model].filter(Boolean).join(" ") || "—")}</dd></div><div><dt>Serie / patrimonio</dt><dd>${escapeHTML(item.serial || "—")}</dd></div>
        <div><dt>Estado</dt><dd>${escapeHTML(item.condition)}</dd></div><div><dt>Decisión</dt><dd><span class="badge ${decisionClass(item.decision)}">${escapeHTML(item.decision)}</span></dd></div>
        <div><dt>Adquirido</dt><dd>${formatDate(item.purchaseDate)}</dd></div><div><dt>Fuente</dt><dd>${escapeHTML(item.source || "Registro manual")}</dd></div>
        <div><dt>Cantidad</dt><dd>${Number(item.quantity)}</dd></div><div><dt>Valor unitario</dt><dd>${Number(item.unitCost) ? formatMoney(item.unitCost) : "Sin valor"}</dd></div>
        <div><dt>Subtotal</dt><dd><strong>${Number(item.unitCost) ? formatMoney(subtotal(item)) : "—"}</strong></dd></div><div><dt>Comprobante</dt><dd>${escapeHTML(item.receipt || "—")}</dd></div>
        <div class="full"><dt>Notas</dt><dd>${escapeHTML(item.notes || "—")}</dd></div>
      </dl></div>`;
    detailDialog.showModal();
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  async function compressImage(file) {
    const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = dataUrl; });
    const max = 1200;
    const scale = Math.min(1, max / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", .76);
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function csvCell(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
  function exportCSV() {
    const headers = ["Nombre", "Categoría", "Ubicación", "Marca", "Modelo", "Serie/Patrimonio", "Estado", "Decisión", "Cantidad", "Valor unitario PYG", "Subtotal PYG", "Fecha adquisición", "Comprobante", "Notas", "Fuente"];
    const rows = items.map((item) => [item.name, item.category, item.location, item.brand, item.model, item.serial, item.condition, item.decision, item.quantity, item.unitCost, subtotal(item), item.purchaseDate, item.receipt, item.notes, item.source]);
    download(`inventario-oficina-${new Date().toISOString().slice(0, 10)}.csv`, `\ufeff${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}`, "text/csv;charset=utf-8");
    showToast("Planilla CSV descargada");
  }

  function exportStockCSV() {
    const headers = ["Producto o equipo", "Rubro", "Marca", "Modelo", "Número de serie", "Estado", "Cajas", "Unidades", "Precio aplicado por", "Precio de lista USD (IVA incluido)", "IVA %", "Precio neto USD", "Ganancia %", "Costo unitario estimado USD", "Costo total estimado USD", "Fuente del precio", "Criterio de valorización", "Notas", "Fuente del inventario"];
    const rows = stockItems.map((item) => [item.name, item.category, item.brand, item.model, item.serial, stockStatus(item), item.boxes, item.quantity, item.priceBasis, item.listPriceUsd, item.vatRate, stockNetPrice(item), item.marginPercent, stockEstimatedUnitCost(item), stockEstimatedTotalCost(item), item.priceSource, STOCK_VALUATION_CRITERION, item.notes, item.source]);
    download(`stock-general-ares-${new Date().toISOString().slice(0, 10)}.csv`, `\ufeff${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}`, "text/csv;charset=utf-8");
    showToast("Stock exportado en CSV");
  }

  function localDateStamp(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function filenamePart(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 45);
  }

  function exportGroupedStockExcel() {
    if (!window.XLSX) {
      showToast("No se pudo preparar el archivo Excel");
      return;
    }

    const visible = filteredGroupedStockItems(consolidatedStockItems());
    if (!visible.length) {
      showToast("No hay resultados para exportar");
      return;
    }

    const query = $("#grouped-stock-search-input").value.trim();
    const category = $("#grouped-stock-category-filter").value;
    const totalValue = visible.reduce((sum, item) => sum + Number(item.estimatedTotalCostUsd || 0), 0);
    const headers = ["Producto o equipo", "Rubro", "Marca", "Modelo", "Registros detallados agrupados", "Cajas", "Unidades", "Precio aplicado por", "Precio de lista USD (IVA incluido)", "Precio neto USD", "Ganancia %", "Costo unitario estimado USD", "Costo total estimado USD", "Observación del precio", "Criterio de valorización"];
    const rows = visible.map((item) => [
      item.name,
      item.category,
      item.brand,
      item.model,
      item.recordCount,
      item.boxes,
      item.quantity,
      item.priceBasis,
      item.listPriceUsd || null,
      item.netPriceUsd || null,
      item.listPriceUsd ? item.marginPercent / 100 : null,
      item.estimatedUnitCostUsd || null,
      item.estimatedTotalCostUsd || null,
      item.hasPartialPricing ? "Precio parcial" : item.priceVariants > 1 ? "Promedio ponderado" : "Precio uniforme",
      STOCK_VALUATION_CRITERION
    ]);
    const exportRows = [
      ["ARES Activos · Stock consolidado"],
      ["Fecha de exportación", new Date().toLocaleString("es-PY")],
      ["Búsqueda aplicada", query || "Todas"],
      ["Rubro aplicado", category || "Todos"],
      ["Resultados exportados", visible.length],
      ["Costo total estimado USD", totalValue],
      [],
      headers,
      ...rows
    ];
    const worksheet = window.XLSX.utils.aoa_to_sheet(exportRows);
    const headerRow = 7;
    const firstDataRow = headerRow + 1;
    const lastDataRow = firstDataRow + rows.length - 1;
    const currencyColumns = [8, 9, 11, 12];

    worksheet["!cols"] = [
      { wch: 34 }, { wch: 16 }, { wch: 18 }, { wch: 22 }, { wch: 14 },
      { wch: 10 }, { wch: 11 }, { wch: 18 }, { wch: 20 }, { wch: 18 },
      { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 21 }, { wch: 42 }
    ];
    worksheet["!autofilter"] = {
      ref: window.XLSX.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: lastDataRow, c: headers.length - 1 } })
    };
    const totalCell = worksheet[window.XLSX.utils.encode_cell({ r: 5, c: 1 })];
    if (totalCell) totalCell.z = '"US$" #,##0.00';
    for (let rowIndex = firstDataRow; rowIndex <= lastDataRow; rowIndex += 1) {
      currencyColumns.forEach((columnIndex) => {
        const cell = worksheet[window.XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
        if (cell) cell.z = '"US$" #,##0.00';
      });
      const marginCell = worksheet[window.XLSX.utils.encode_cell({ r: rowIndex, c: 10 })];
      if (marginCell) marginCell.z = "0.00%";
    }

    const workbook = window.XLSX.utils.book_new();
    workbook.Props = {
      Title: "ARES Activos - Stock consolidado",
      Subject: "Valorización del stock filtrado para el seguro",
      Author: "ARES Activos",
      CreatedDate: new Date()
    };
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Stock consolidado");

    const filterPart = filenamePart(category || query);
    const filename = `stock-consolidado${filterPart ? `-${filterPart}` : ""}-${localDateStamp()}.xlsx`;
    window.XLSX.writeFile(workbook, filename, { compression: true });
    showToast(`Excel descargado: ${visible.length} ${visible.length === 1 ? "producto" : "productos"}`);
  }

  function exportInstalledCSV() {
    const headers = ["Cliente", "Fabricante", "Modelo", "Número de serie", "Fecha de instalación", "Fin de garantía", "Estado de datos", "Observaciones", "Fuente"];
    const rows = installedItems.map((item) => [item.client, item.manufacturer, item.model, item.serial, item.installationDate, item.warrantyEnd, installedCompleteness(item), item.notes, item.source]);
    download(`base-instalada-ares-${new Date().toISOString().slice(0, 10)}.csv`, `\ufeff${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}`, "text/csv;charset=utf-8");
    showToast("Base instalada exportada en CSV");
  }

  function switchView(view) {
    if (activeAccess?.scope === "installed" && view !== "installed") return;
    currentView = view;
    $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
    $$(".view").forEach((section) => section.classList.toggle("active", section.id === `${view}-view`));
    document.body.classList.toggle("stock-mode", view === "stock" || view === "stock-grouped");
    document.body.classList.toggle("installed-mode", view === "installed");
    const viewCopy = {
      inventory: { eyebrow: "GESTIÓN PATRIMONIAL", title: "Inventario de oficina", add: "Añadir bien" },
      stock: { eyebrow: "CONTROL DE EXISTENCIAS", title: "Stock General", add: "Añadir registro" },
      "stock-grouped": { eyebrow: "RESUMEN POR PRODUCTO", title: "Stock por cantidad", add: "" },
      installed: { eyebrow: "TRAZABILIDAD DE EQUIPOS", title: "Base instalada", add: "Añadir equipo" },
      report: { eyebrow: "VALORIZACIÓN PARA EL SEGURO", title: "Informe del seguro", add: "" }
    }[view] || {};
    $("#page-eyebrow").textContent = viewCopy.eyebrow || "ARES ACTIVOS";
    $("#page-title").textContent = viewCopy.title || "ARES Activos";
    $("#add-button-label").textContent = viewCopy.add || "Añadir";
    $("#add-button").style.display = view === "report" || view === "stock-grouped" ? "none" : "inline-flex";
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const existing = items.find((entry) => entry.id === data.id);
    const item = {
      id: data.id || uid(), name: data.name.trim(), category: data.category, location: data.location.trim(), brand: data.brand.trim(), model: data.model.trim(), serial: data.serial.trim(),
      condition: data.condition, decision: data.decision, quantity: Math.max(1, Math.round(Number(data.quantity) || 1)), unitCost: Math.max(0, Math.round(Number(data.unitCost) || 0)), purchaseDate: data.purchaseDate,
      receipt: data.receipt.trim(), notes: data.notes.trim(), source: existing?.source || "Registro manual", photo: pendingPhoto, updatedAt: new Date().toISOString()
    };
    const index = items.findIndex((entry) => entry.id === item.id);
    if (index >= 0) items[index] = item; else items.unshift(item);
    save(); dialog.close(); showToast(index >= 0 ? "Bien actualizado" : "Bien añadido al inventario");
  });

  stockForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(stockForm));
    const existing = stockItems.find((entry) => entry.id === data.id);
    const priceWasChanged = existing && Number(existing.listPriceUsd || 0) !== Number(data.listPriceUsd || 0);
    const item = {
      id: data.id || uid(), name: data.name.trim(), category: data.category, brand: data.brand.trim(), model: data.model.trim(), serial: data.serial.trim(),
      status: data.status, boxes: Math.max(0, Math.round(Number(data.boxes) || 0)), quantity: Math.max(0, Math.round(Number(data.quantity) || 0)),
      priceBasis: STOCK_PRICE_BASES.includes(data.priceBasis) ? data.priceBasis : "Unidad", listPriceUsd: Math.max(0, Number(data.listPriceUsd) || 0),
      vatRate: [0, 5, 10].includes(Number(data.vatRate)) ? Number(data.vatRate) : 10, marginPercent: Math.min(300, Math.max(0, Number(data.marginPercent) || 0)), valuationCriterion: STOCK_VALUATION_CRITERION,
      priceSource: priceWasChanged ? "Precio editado manualmente" : (existing?.priceSource || (Number(data.listPriceUsd) ? "Carga manual" : "")), priceSourceRow: priceWasChanged ? null : (existing?.priceSourceRow || null),
      notes: data.notes.trim(), source: existing?.source || "Registro manual", updatedAt: new Date().toISOString()
    };
    const index = stockItems.findIndex((entry) => entry.id === item.id);
    if (index >= 0) stockItems[index] = item; else stockItems.unshift(item);
    saveStock(); stockDialog.close(); showToast(index >= 0 ? "Producto actualizado" : "Producto añadido al stock");
  });

  installedForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(installedForm));
    const existing = installedItems.find((entry) => entry.id === data.id);
    const item = normalizeInstalledItem({
      id: data.id || uid(), client: data.client, manufacturer: data.manufacturer, model: data.model, serial: data.serial,
      installationDate: data.installationDate, warrantyEnd: data.warrantyEnd, notes: data.notes,
      source: existing?.source || "Registro manual", updatedAt: new Date().toISOString()
    });
    const index = installedItems.findIndex((entry) => entry.id === item.id);
    if (index >= 0) installedItems[index] = item; else installedItems.unshift(item);
    saveInstalled(); installedDialog.close(); showToast(index >= 0 ? "Equipo actualizado" : "Equipo añadido a la base instalada");
  });

  $("#photo-input").addEventListener("change", async (event) => {
    const file = event.target.files[0]; if (!file) return;
    try { pendingPhoto = await compressImage(file); $("#photo-name").textContent = file.name; }
    catch { showToast("No se pudo leer la imagen"); }
  });

  $("#delete-item").addEventListener("click", () => {
    const item = items.find((entry) => entry.id === selectedId); if (!item) return;
    if (!confirm(`¿Eliminar “${item.name}” del inventario?`)) return;
    items = items.filter((entry) => entry.id !== selectedId); save(); detailDialog.close(); showToast("Bien eliminado");
  });
  $("#edit-item").addEventListener("click", () => { const item = items.find((entry) => entry.id === selectedId); detailDialog.close(); if (item) openForm(item); });

  $("#delete-stock-item").addEventListener("click", () => {
    const item = stockItems.find((entry) => entry.id === selectedStockId); if (!item) return;
    if (!confirm(`¿Eliminar “${item.name}” del stock?`)) return;
    stockItems = stockItems.filter((entry) => entry.id !== selectedStockId); saveStock(); stockDetailDialog.close(); showToast("Producto eliminado");
  });
  $("#edit-stock-item").addEventListener("click", () => { const item = stockItems.find((entry) => entry.id === selectedStockId); stockDetailDialog.close(); if (item) openStockForm(item); });

  $("#delete-installed-item").addEventListener("click", () => {
    const item = installedItems.find((entry) => entry.id === selectedInstalledId); if (!item) return;
    if (!confirm(`¿Eliminar “${item.model}” de la base instalada?`)) return;
    installedItems = installedItems.filter((entry) => entry.id !== selectedInstalledId); saveInstalled(); installedDetailDialog.close(); showToast("Equipo eliminado");
  });
  $("#edit-installed-item").addEventListener("click", () => { const item = installedItems.find((entry) => entry.id === selectedInstalledId); installedDetailDialog.close(); if (item) openInstalledForm(item); });

  $("#add-button").addEventListener("click", () => currentView === "stock" ? openStockForm() : currentView === "installed" ? openInstalledForm() : openForm());
  $("#empty-add-button").addEventListener("click", () => openForm());
  $("#stock-empty-add-button").addEventListener("click", () => openStockForm());
  $("#installed-empty-add-button").addEventListener("click", () => openInstalledForm());
  $$("[data-close]").forEach((button) => button.addEventListener("click", () => dialog.close()));
  $$("[data-detail-close]").forEach((button) => button.addEventListener("click", () => detailDialog.close()));
  $$("[data-stock-close]").forEach((button) => button.addEventListener("click", () => stockDialog.close()));
  $$("[data-stock-detail-close]").forEach((button) => button.addEventListener("click", () => stockDetailDialog.close()));
  $$("[data-installed-close]").forEach((button) => button.addEventListener("click", () => installedDialog.close()));
  $$("[data-installed-detail-close]").forEach((button) => button.addEventListener("click", () => installedDetailDialog.close()));
  $$("[data-backup-close]").forEach((button) => button.addEventListener("click", () => backupDialog.close()));
  $$(".nav-item").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
  $("#search-input").addEventListener("input", render);
  $("#category-filter").addEventListener("change", render);
  $("#decision-filter").addEventListener("change", render);
  $("#stock-search-input").addEventListener("input", renderStock);
  $("#stock-category-filter").addEventListener("change", renderStock);
  $("#stock-status-filter").addEventListener("change", renderStock);
  $("#grouped-stock-search-input").addEventListener("input", renderGroupedStock);
  $("#grouped-stock-category-filter").addEventListener("change", renderGroupedStock);
  $("#installed-search-input").addEventListener("input", renderInstalled);
  $("#installed-manufacturer-filter").addEventListener("change", renderInstalled);
  $("#installed-completeness-filter").addEventListener("change", renderInstalled);
  ["boxes", "quantity", "priceBasis", "listPriceUsd", "vatRate", "marginPercent"].forEach((name) => stockForm.elements[name].addEventListener("input", updateStockFormTotal));
  $("#stock-default-margin").addEventListener("change", (event) => {
    const value = Number(event.target.value);
    stockMeta.defaultMarginPercent = Number.isFinite(value) ? Math.min(300, Math.max(0, value)) : DEFAULT_STOCK_MARGIN_PERCENT;
    localStorage.setItem(STOCK_META_KEY, JSON.stringify(stockMeta));
    scheduleCloudSave();
    event.target.value = stockMeta.defaultMarginPercent;
    showToast(`Ganancia predeterminada: ${stockMeta.defaultMarginPercent}%`);
  });
  $$('[data-sort-key]').forEach((button) => button.addEventListener("click", () => {
    const key = button.dataset.sortKey;
    sortState = {
      key,
      direction: sortState.key === key && sortState.direction === "asc" ? "desc" : "asc"
    };
    render();
  }));
  $$('[data-stock-sort-key]').forEach((button) => button.addEventListener("click", () => {
    const key = button.dataset.stockSortKey;
    stockSortState = {
      key,
      direction: stockSortState.key === key && stockSortState.direction === "asc" ? "desc" : "asc"
    };
    renderStock();
  }));
  $$('[data-grouped-stock-sort-key]').forEach((button) => button.addEventListener("click", () => {
    const key = button.dataset.groupedStockSortKey;
    groupedStockSortState = {
      key,
      direction: groupedStockSortState.key === key && groupedStockSortState.direction === "asc" ? "desc" : "asc"
    };
    renderGroupedStock();
  }));
  $$('[data-installed-sort-key]').forEach((button) => button.addEventListener("click", () => {
    const key = button.dataset.installedSortKey;
    installedSortState = {
      key,
      direction: installedSortState.key === key && installedSortState.direction === "asc" ? "desc" : "asc"
    };
    renderInstalled();
  }));
  $("#export-csv").addEventListener("click", exportCSV);
  $("#stock-export-csv").addEventListener("click", exportStockCSV);
  $("#grouped-stock-export-xlsx").addEventListener("click", exportGroupedStockExcel);
  $("#installed-export-csv").addEventListener("click", exportInstalledCSV);
  $("#backup-button").addEventListener("click", () => backupDialog.showModal());
  $("#print-button").addEventListener("click", () => window.print());
  $("#export-json").addEventListener("click", () => { download(`respaldo-ares-activos-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ version: 7, exportedAt: new Date().toISOString(), items, meta, stockItems, stockMeta, installedItems, installedMeta }, null, 2), "application/json"); showToast("Respaldo descargado"); });
  $("#import-json").addEventListener("change", async (event) => {
    const file = event.target.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.items) && !Array.isArray(data.stockItems) && !Array.isArray(data.installedItems)) throw new Error("Formato inválido");
      const inventoryCount = Array.isArray(data.items) ? data.items.length : items.length;
      const stockCount = Array.isArray(data.stockItems) ? data.stockItems.length : stockItems.length;
      const installedCount = Array.isArray(data.installedItems) ? data.installedItems.length : installedItems.length;
      if (!confirm(`El respaldo contiene ${inventoryCount} bienes, ${stockCount} productos de stock y ${installedCount} equipos instalados. ¿Reemplazar los datos actuales?`)) return;
      if (Array.isArray(data.items)) items = data.items.map(normalizeItem);
      if (Array.isArray(data.stockItems)) stockItems = data.stockItems.map(normalizeStockItem);
      if (Array.isArray(data.installedItems)) installedItems = data.installedItems.map(normalizeInstalledItem);
      meta = { ...meta, ...(data.meta || {}) }; stockMeta = { ...stockMeta, ...(data.stockMeta || {}) }; installedMeta = { ...installedMeta, ...(data.installedMeta || {}) };
      stockMeta.defaultMarginPercent = Number.isFinite(Number(stockMeta.defaultMarginPercent)) ? Math.min(300, Math.max(0, Number(stockMeta.defaultMarginPercent))) : DEFAULT_STOCK_MARGIN_PERCENT;
      save(); saveStock(); saveInstalled(); hydrateMeta(); backupDialog.close(); showToast("Respaldo restaurado");
    } catch { showToast("El archivo de respaldo no es válido"); }
    event.target.value = "";
  });

  function hydrateMeta() {
    $("#report-owner").value = meta.owner || ""; $("#report-address").value = meta.address || ""; $("#report-date").value = meta.date || new Date().toISOString().slice(0,10); $("#report-notes").value = meta.notes || "";
    $("#report-exchange-rate").value = meta.insuranceExchangeRate || DEFAULT_INSURANCE_EXCHANGE_RATE;
  }
  ["owner", "address", "date", "notes"].forEach((key) => {
    $(`#report-${key}`).addEventListener("input", (event) => { meta[key] = event.target.value; localStorage.setItem(META_KEY, JSON.stringify(meta)); scheduleCloudSave(); });
  });
  $("#report-exchange-rate").addEventListener("input", (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value) || value <= 0) return;
    meta.insuranceExchangeRate = value;
    localStorage.setItem(META_KEY, JSON.stringify(meta));
    scheduleCloudSave();
    renderInsuranceSummary();
  });

  function setAccessMessage(message, type = "") {
    const element = $("#auth-message");
    element.textContent = message;
    element.className = `auth-message ${type}`.trim();
  }

  function showAuthScreen(message = "Ingresá para continuar.", type = "") {
    cloudReady = false;
    cloudLoading = false;
    activeCloudUser = null;
    activeAccess = null;
    $("#auth-title").textContent = "Ingresar";
    $("#auth-intro").textContent = "Usá tu nombre de usuario y contraseña.";
    document.body.classList.remove("cloud-loading", "cloud-ready", "role-installed", "stock-mode", "installed-mode");
    document.body.classList.add("auth-required");
    setAccessMessage(message, type);
  }

  function showCloudApp() {
    document.body.classList.remove("cloud-loading", "auth-required");
    document.body.classList.add("cloud-ready");
  }

  async function loadCloudState() {
    cloudLoading = true;
    setSyncState("syncing", "Descargando la información más reciente.");
    const installedRequest = cloudClient.from("installed_base_state").select("installed_base, installed_meta, updated_at").eq("id", "main").single();
    const appRequest = activeAccess?.scope === "full"
      ? cloudClient.from("app_state").select("inventory, inventory_meta, stock, stock_meta, updated_at").eq("id", "main").single()
      : Promise.resolve({ data: null, error: null });
    const [{ data: appData, error: appError }, { data: installedData, error: installedError }] = await Promise.all([appRequest, installedRequest]);
    if (appError || installedError) {
      cloudLoading = false;
      throw appError || installedError;
    }
    if (activeAccess.scope === "full") {
      items = (Array.isArray(appData.inventory) ? appData.inventory : []).map(normalizeItem);
      meta = { ...meta, ...(appData.inventory_meta || {}) };
      stockItems = (Array.isArray(appData.stock) ? appData.stock : []).map(normalizeStockItem);
      stockMeta = { ...stockMeta, ...(appData.stock_meta || {}) };
      migrateStockRubrics();
    } else {
      clearRestrictedLocalState();
    }
    installedItems = (Array.isArray(installedData.installed_base) ? installedData.installed_base : []).map(normalizeInstalledItem);
    installedMeta = { ...installedMeta, ...(installedData.installed_meta || {}) };
    if (activeAccess.scope === "full") cacheAllLocally();
    else cacheInstalledLocally();
    hydrateMeta();
    render();
    renderStock();
    renderInstalled();
    document.body.classList.toggle("role-installed", activeAccess.scope === "installed");
    switchView(activeAccess.scope === "installed" ? "installed" : "inventory");
    cloudLoading = false;
    cloudReady = true;
    const updatedAt = activeAccess.scope === "full" && appData?.updated_at > installedData.updated_at ? appData.updated_at : installedData.updated_at;
    if (activeAccess.scope === "full" && stockMeta.rubricVersion === STOCK_RUBRIC_VERSION && appData?.stock_meta?.rubricVersion !== STOCK_RUBRIC_VERSION) {
      setSyncState("syncing", "Guardando la nueva clasificación por rubros.");
      await pushCloudState();
    } else {
      setSyncState("ready", `Actualizado: ${new Date(updatedAt).toLocaleString("es-PY", { dateStyle: "short", timeStyle: "short" })}`);
    }
  }

  async function openCloudSession(session) {
    const email = session?.user?.email?.toLocaleLowerCase("es") || "";
    const access = Object.values(AUTH_USERS).find((entry) => entry.email === email);
    if (!access) {
      await cloudClient.auth.signOut();
      showAuthScreen("Este usuario no tiene acceso.", "error");
      return;
    }
    activeCloudUser = session.user;
    activeAccess = access;
    setAccessMessage(`Abriendo el acceso de ${access.name}…`);
    try {
      await loadCloudState();
      showCloudApp();
    } catch (error) {
      console.error("No se pudo abrir la información", error);
      await cloudClient.auth.signOut();
      showAuthScreen("No se pudo abrir la información. Revisá la conexión e intentá nuevamente.", "error");
    }
  }

  async function initializeCloud() {
    if (!cloudClient) {
      showAuthScreen("No se pudo iniciar la conexión con la nube.", "error");
      return;
    }
    const { data: { session }, error } = await cloudClient.auth.getSession();
    if (error || !session) showAuthScreen(error ? "No se pudo comprobar la sesión." : "Ingresá para continuar.", error ? "error" : "");
    else await openCloudSession(session);
  }

  $("#auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = $("#auth-username").value.trim().toLocaleLowerCase("es");
    const access = AUTH_USERS[username];
    if (!access) return setAccessMessage("Usuario o contraseña incorrectos.", "error");
    setAccessMessage("Comprobando tus datos…");
    const { data, error } = await cloudClient.auth.signInWithPassword({ email: access.email, password: $("#auth-password").value });
    if (error || !data.session) return setAccessMessage("Usuario o contraseña incorrectos.", "error");
    $("#auth-password").value = "";
    await openCloudSession(data.session);
  });

  $("#logout-button").addEventListener("click", async () => {
    clearTimeout(cloudSaveTimer);
    clearTimeout(installedCloudSaveTimer);
    if (cloudReady && activeAccess?.scope === "full") await pushCloudState();
    if (cloudReady && activeAccess) await pushInstalledCloudState();
    await cloudClient.auth.signOut();
    showAuthScreen("Sesión cerrada.", "success");
  });

  function registerWebMCP() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const tools = [
      {
        name: "list_office_inventory", title: "Consultar inventario de oficina", description: "Devuelve los bienes del inventario de oficina y su valor total declarado.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: () => ({ records: items.length, includedRecords: items.filter((item) => item.decision === "Incluir").length, totalIncludedPYG: items.filter((item) => item.decision === "Incluir").reduce((sum, item) => sum + subtotal(item), 0), reviewTotalPYG: items.filter((item) => item.decision === "Revisar").reduce((sum, item) => sum + subtotal(item), 0), items: items.map(({ photo, ...item }) => ({ ...item, subtotalPYG: subtotal(item) })) })
      },
      {
        name: "add_office_inventory_item", title: "Añadir bien de oficina", description: "Añade un bien al inventario de oficina y actualiza los totales visibles.",
        inputSchema: { type: "object", properties: { name: { type: "string" }, category: { type: "string" }, location: { type: "string" }, quantity: { type: "integer", minimum: 1 }, unitCost: { type: "integer", minimum: 0 }, condition: { type: "string" } }, required: ["name", "category", "location", "quantity", "unitCost"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (input) => { if (!input?.name || !input?.category || !input?.location || !Number.isInteger(input.quantity) || input.quantity < 1 || !Number.isInteger(input.unitCost) || input.unitCost < 0) throw new Error("Datos inválidos"); const item = { id: uid(), name: input.name.trim(), category: input.category.trim(), location: input.location.trim(), brand: "", model: "", serial: "", condition: input.condition || "Sin verificar", decision: "Incluir", quantity: input.quantity, unitCost: input.unitCost, purchaseDate: "", receipt: "", notes: "", source: "Registro manual", photo: "", updatedAt: new Date().toISOString() }; items.unshift(item); save(); return { id: item.id, name: item.name, subtotalPYG: subtotal(item) }; }
      },
      {
        name: "list_office_stock", title: "Consultar stock general", description: "Devuelve los equipos y productos del stock general de ARES, agrupados por rubro y estado.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: () => ({ records: stockItems.length, totalUnits: stockItems.reduce((sum, item) => sum + item.quantity, 0), totalBoxes: stockItems.reduce((sum, item) => sum + item.boxes, 0), totalEstimatedCostUSD: stockItems.reduce((sum, item) => sum + stockEstimatedTotalCost(item), 0), availableRecords: stockItems.filter((item) => stockStatus(item) === "Disponible").length, items: stockItems.map((item) => ({ ...item, status: stockStatus(item), netPriceUSD: stockNetPrice(item), estimatedUnitCostUSD: stockEstimatedUnitCost(item), estimatedTotalCostUSD: stockEstimatedTotalCost(item) })) })
      },
      {
        name: "add_office_stock_item", title: "Añadir registro al stock general", description: "Añade un equipo o producto al stock general de ARES.",
        inputSchema: { type: "object", properties: { name: { type: "string" }, category: { type: "string", enum: STOCK_RUBRICS }, brand: { type: "string" }, model: { type: "string" }, serial: { type: "string" }, status: { type: "string", enum: STOCK_STATUSES }, boxes: { type: "integer", minimum: 0 }, quantity: { type: "integer", minimum: 0 }, priceBasis: { type: "string", enum: STOCK_PRICE_BASES }, listPriceUsd: { type: "number", minimum: 0 }, vatRate: { type: "number", enum: [0, 5, 10] }, marginPercent: { type: "number", minimum: 0 }, notes: { type: "string" } }, required: ["name", "category", "status", "boxes", "quantity"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (input) => { if (!input?.name || !STOCK_RUBRICS.includes(input?.category) || !STOCK_STATUSES.includes(input.status) || !Number.isInteger(input.boxes) || input.boxes < 0 || !Number.isInteger(input.quantity) || input.quantity < 0) throw new Error("Datos inválidos"); const item = normalizeStockItem({ marginPercent: stockMeta.defaultMarginPercent, ...input, id: uid(), updatedAt: new Date().toISOString() }); stockItems.unshift(item); saveStock(); return { id: item.id, name: item.name, status: stockStatus(item) }; }
      },
      {
        name: "list_installed_base", title: "Consultar base instalada", description: "Devuelve las unidades centrales entregadas por ARES con cliente, equipo, fecha de instalación y número de serie.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: () => ({ records: installedItems.length, clients: new Set(installedItems.map((item) => item.client.toLocaleLowerCase("es")).filter(Boolean)).size, incompleteRecords: installedItems.filter((item) => installedCompleteness(item) !== "Completo").length, items: installedItems.map((item) => ({ ...item, dataStatus: installedCompleteness(item) })) })
      },
      {
        name: "add_installed_equipment", title: "Añadir equipo a la base instalada", description: "Registra una unidad central entregada a un cliente.",
        inputSchema: { type: "object", properties: { client: { type: "string" }, manufacturer: { type: "string" }, model: { type: "string" }, serial: { type: "string" }, installationDate: { type: "string" }, warrantyEnd: { type: "string" }, notes: { type: "string" } }, required: ["client", "model"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (input) => { if (!input?.client?.trim() || !input?.model?.trim()) throw new Error("Datos inválidos"); const item = normalizeInstalledItem({ ...input, id: uid(), source: "Registro manual", updatedAt: new Date().toISOString() }); installedItems.unshift(item); saveInstalled(); return { id: item.id, client: item.client, model: item.model, dataStatus: installedCompleteness(item) }; }
      }
    ];
    tools.forEach((tool) => { try { context.registerTool(tool); } catch (error) { console.debug("WebMCP no disponible", error); } });
  }

  hydrateMeta(); render(); renderStock(); renderInstalled(); initializeCloud();
})();
