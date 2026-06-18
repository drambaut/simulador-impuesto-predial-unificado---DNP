(function () {
  const contexts = [
    {
      paneId: "liquidation-tabs-tabpane-year_0",
      context: "avaluo_year1",
      title: "Mapa de predios - Avalúo Catastral Año 1",
    },
    {
      paneId: "liquidation-tabs-tabpane-year_1",
      context: "avaluo_year2",
      title: "Mapa de predios - Avalúo Catastral Año 2",
    },
    {
      paneId: "tariff-simulator-tabs-tabpane-year1",
      context: "tarifa_year1",
      title: "Mapa de predios - Modificación Tarifas Año 1",
    },
    {
      paneId: "tariff-simulator-tabs-tabpane-year2",
      context: "tarifa_year2",
      title: "Mapa de predios - Modificación Tarifas Año 2",
    },
  ];

  const DEFAULT_API_BASE = "http://localhost:5000";
  const AVALUO_YEAR1_CONTEXT = "avaluo_year1";
  const AVALUO_YEAR2_CONTEXT = "avaluo_year2";
  const TARIFA_YEAR1_CONTEXT = "tarifa_year1";
  const TARIFA_YEAR2_CONTEXT = "tarifa_year2";
  const TARIFA_ENDPOINT_TO_CONTEXT = {
    "/calculate/tariff/base": TARIFA_YEAR1_CONTEXT,
    "/calculate/tariff/projected": TARIFA_YEAR2_CONTEXT,
  };
  const AVALUO_CONTEXT_CONFIG = {
    avaluo_year1: {
      legendTitle: "Aumento absoluto del aval&uacute;o",
      legendSubtitle: "Diferencia entre aval&uacute;o actualizado y aval&uacute;o original",
      baseLabel: "Aval&uacute;o original",
      updatedLabel: "Aval&uacute;o actualizado",
    },
    avaluo_year2: {
      legendTitle: "Aumento absoluto del aval&uacute;o A&ntilde;o 2",
      legendSubtitle: "Diferencia entre aval&uacute;o actualizado y aval&uacute;o base del A&ntilde;o 2",
      baseLabel: "Aval&uacute;o base A&ntilde;o 2",
      updatedLabel: "Aval&uacute;o actualizado A&ntilde;o 2",
    },
  };
  const AVALUO_THEME_CLASSES = [
    { className: "geo-predio--avaluo-bajo", label: "Q1 menor aumento" },
    { className: "geo-predio--avaluo-medio", label: "Q2 aumento medio-bajo" },
    { className: "geo-predio--avaluo-alto", label: "Q3 aumento medio-alto" },
    { className: "geo-predio--avaluo-muy-alto", label: "Q4 mayor aumento" },
  ];

  function normalizeApiBase(apiBase) {
    if (!apiBase || apiBase === "http://135.119.155.28" || apiBase === "http://135.119.155.28/api") return null;
    return apiBase.replace(/\/$/, "");
  }

  function resolveApiBase() {
    return normalizeApiBase(window.IPU_API_BASE) || normalizeApiBase(localStorage.getItem("ipuApiBase")) || DEFAULT_API_BASE;
  }

  function getApiBaseFromUrl(url) {
    const parsed = new URL(url, window.location.href);
    const endpointMarkers = ["/store-data", "/retrieve-data", "/calculate/", "/login"];
    const marker = endpointMarkers.find(function (item) {
      return parsed.pathname.includes(item);
    });

    if (!marker) return null;
    return parsed.origin + parsed.pathname.slice(0, parsed.pathname.indexOf(marker));
  }

  const state = {
    apiBase: resolveApiBase(),
    dataId: localStorage.getItem("ipuDataId") || "",
    cache: {},
  };

  function rememberApiBase(url) {
    try {
      const parsed = new URL(url, window.location.href);
      const apiBase = getApiBaseFromUrl(url);
      if (apiBase) {
        state.apiBase = apiBase;
        localStorage.setItem("ipuApiBase", state.apiBase);
      }
      const dataId = parsed.searchParams.get("dataId");
      if (dataId) {
        rememberDataId(dataId);
      }
    } catch (_) {
      return;
    }
  }

  function rememberDataId(dataId) {
    if (!dataId) return;
    state.dataId = dataId;
    localStorage.setItem("ipuDataId", dataId);
    mountAll();
  }

  function installNetworkHooks() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
      this.__ipuUrl = url;
      rememberApiBase(url);
      return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
      this.addEventListener("load", function () {
        if (!this.__ipuUrl) return;
        const url = String(this.__ipuUrl);
        if (url.includes("/store-data")) {
          try {
            const payload = JSON.parse(this.responseText);
            rememberDataId(payload.data_id);
          } catch (_) {
            return;
          }
          return;
        }
        const tarifaContext = getTarifaContextFromUrl(url);
        if (tarifaContext && this.status >= 200 && this.status < 300) {
          invalidateAndRefreshTarifaContext(tarifaContext);
        }
      });
      return originalSend.apply(this, arguments);
    };

    if (window.fetch) {
      const originalFetch = window.fetch;
      window.fetch = function (input, init) {
        const url = typeof input === "string" ? input : input && input.url;
        if (url) rememberApiBase(url);
        return originalFetch.apply(this, arguments).then(function (response) {
          if (url && String(url).includes("/store-data")) {
            response.clone().json().then(function (payload) {
              rememberDataId(payload.data_id);
            }).catch(function () {});
          } else {
            const tarifaContext = url ? getTarifaContextFromUrl(String(url)) : null;
            if (tarifaContext && response.ok) {
              invalidateAndRefreshTarifaContext(tarifaContext);
            }
          }
          return response;
        });
      };
    }
  }

  function getTarifaContextFromUrl(url) {
    const marker = Object.keys(TARIFA_ENDPOINT_TO_CONTEXT).find(function (endpoint) {
      return url.includes(endpoint);
    });
    return marker ? TARIFA_ENDPOINT_TO_CONTEXT[marker] : null;
  }

  function invalidateAndRefreshTarifaContext(context) {
    if (!state.dataId) return;
    delete state.cache[state.dataId + ":" + context];
    document.querySelectorAll("[data-geo-context='" + context + "']").forEach(function (panel) {
      loadContext(panel, context);
    });
  }

  function formatNumber(value) {
    if (value === null || value === undefined || value === "") return "Sin dato";
    if (typeof value === "number") {
      return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(value);
    }
    return String(value);
  }

  function formatMoney(value) {
    if (value === null || value === undefined || value === "") return "Sin dato";
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);
    return new Intl.NumberFormat("es-CO", {
      currency: "COP",
      maximumFractionDigits: 0,
      style: "currency",
    }).format(number);
  }

  function formatPercent(value) {
    if (value === null || value === undefined || value === "") return "Sin dato";
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);
    return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(number) + "%";
  }

  function toNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function hasAvaluoChange(props) {
    return toNumber(props.AVALUO) !== null && toNumber(props.AVALUO_ACTUALIZADO) !== null;
  }

  function getAvaluoVariation(props) {
    const existing = toNumber(props.VARIACION_AVALUO_PCT);
    if (existing !== null) return existing;

    const base = toNumber(props.AVALUO);
    const updated = toNumber(props.AVALUO_ACTUALIZADO);
    if (base === null || updated === null || base <= 0) return null;
    return ((updated - base) / base) * 100;
  }

  function getAvaluoDiff(props) {
    const existing = toNumber(props.DIFERENCIA_AVALUO);
    if (existing !== null) return existing;

    const base = toNumber(props.AVALUO);
    const updated = toNumber(props.AVALUO_ACTUALIZADO);
    if (base === null || updated === null) return null;
    return updated - base;
  }

  function quantile(sortedValues, q) {
    if (!sortedValues.length) return null;
    const position = (sortedValues.length - 1) * q;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper) return sortedValues[lower];
    return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (position - lower);
  }

  function buildAvaluoTheme(features) {
    const values = features.map(function (feature) {
      return getAvaluoDiff(feature.properties || {});
    }).filter(function (value) {
      return value !== null;
    }).sort(function (a, b) {
      return a - b;
    });
    const uniqueValues = Array.from(new Set(values.map(function (value) {
      return value.toFixed(2);
    }))).map(Number).sort(function (a, b) {
      return a - b;
    });

    if (!values.length) {
      return { breaks: [], ranges: [], uniqueCount: 0 };
    }

    const breaks = (uniqueValues.length >= 4
      ? [quantile(values, 0.25), quantile(values, 0.5), quantile(values, 0.75)]
      : uniqueValues.slice(0, -1)).filter(function (value) {
      return value !== null && Number.isFinite(value);
    }).sort(function (a, b) {
      return a - b;
    });
    const min = values[0];
    const max = values[values.length - 1];
    const limits = [min].concat(breaks, [max]).sort(function (a, b) {
      return a - b;
    });
    const ranges = AVALUO_THEME_CLASSES.slice(0, Math.max(1, limits.length - 1)).map(function (item, index) {
      const lower = Math.min(limits[index], limits[index + 1]);
      const upper = Math.max(limits[index], limits[index + 1]);
      return {
        className: item.className,
        label: item.label,
        min: lower,
        max: upper,
        count: 0,
      };
    });
    const theme = { breaks: breaks, ranges: ranges, uniqueCount: uniqueValues.length, sinInfoCount: 0 };

    features.forEach(function (feature) {
      const props = feature.properties || {};
      const diff = getAvaluoDiff(props);
      if (!props.coincide_tabla || diff === null) {
        theme.sinInfoCount += 1;
        return;
      }
      const index = getAvaluoCategoryIndex(diff, theme);
      if (theme.ranges[index]) theme.ranges[index].count += 1;
    });

    return theme;
  }

  function getAvaluoCategoryIndex(diff, theme) {
    if (!theme || !theme.ranges.length) return 0;
    if (!theme.breaks.length) return 0;
    if (diff <= theme.breaks[0]) return 0;
    if (theme.breaks.length < 2 || diff <= theme.breaks[1]) return Math.min(1, theme.ranges.length - 1);
    if (theme.breaks.length < 3 || diff <= theme.breaks[2]) return Math.min(2, theme.ranges.length - 1);
    return Math.min(3, theme.ranges.length - 1);
  }

  function getAvaluoThemeClass(props, theme) {
    if (!props.coincide_tabla || getAvaluoDiff(props) === null) return "geo-predio--avaluo-sin-info";
    const diff = getAvaluoDiff(props);
    if (!theme || !theme.ranges.length) return "geo-predio--avaluo-sin-info";
    return theme.ranges[getAvaluoCategoryIndex(diff, theme)].className;
  }

  function getAvaluoImpactLabel(props, theme) {
    if (!props.coincide_tabla || getAvaluoDiff(props) === null || !theme || !theme.ranges.length) {
      return "Sin informaci&oacute;n";
    }
    const range = theme.ranges[getAvaluoCategoryIndex(getAvaluoDiff(props), theme)];
    return range.label.replace(/^Q([0-9])\s+(.+)$/, function (_, number, label) {
      return "Q" + number + " - " + label.charAt(0).toUpperCase() + label.slice(1);
    });
  }

  function isAvaluoThematicContext(context) {
    return context === AVALUO_YEAR1_CONTEXT || context === AVALUO_YEAR2_CONTEXT;
  }

  function isTarifaThematicContext(context) {
    return context === TARIFA_YEAR1_CONTEXT || context === TARIFA_YEAR2_CONTEXT;
  }

  function getTarifaLegendTitle(context) {
    return context === TARIFA_YEAR2_CONTEXT
      ? "Modificaci&oacute;n de tarifas A&ntilde;o 2 - escenario actual"
      : "Modificaci&oacute;n de tarifas - escenario actual";
  }

  function hasTarifaScenarioData(features) {
    return features.some(function (feature) {
      return typeof (feature.properties || {}).PREDIO_AFECTADO === "boolean";
    });
  }

  function buildTarifaTheme(features) {
    const theme = { afectados: 0, noAfectados: 0, sinInfo: 0 };
    features.forEach(function (feature) {
      const props = feature.properties || {};
      if (typeof props.PREDIO_AFECTADO !== "boolean") {
        theme.sinInfo += 1;
        return;
      }
      if (props.PREDIO_AFECTADO) theme.afectados += 1;
      else theme.noAfectados += 1;
    });
    return theme;
  }

  function getTarifaThemeClass(props) {
    if (typeof props.PREDIO_AFECTADO !== "boolean") return "geo-predio--sin-tabla";
    return props.PREDIO_AFECTADO ? "geo-predio--tarifa-afectado" : "geo-predio--tarifa-no-afectado";
  }

  function buildTarifaLegendHtml(hasScenario, theme, context) {
    const title = getTarifaLegendTitle(context);
    if (!hasScenario) {
      return "<h4>" + title + "</h4><div class=\"geo-theme-message\">Sin escenario aplicado. Se muestra el mapa base.</div>";
    }

    return [
      "<h4>" + title + "</h4>",
      "<p class=\"geo-legend__note\">Predios afectados por el &uacute;ltimo escenario de tarifa creado.</p>",
      "<div class=\"geo-legend__counts\">",
      "<div><span>Predios afectados</span><strong>" + formatNumber(theme.afectados) + " predios</strong></div>",
      "<div><span>Predios no afectados</span><strong>" + formatNumber(theme.noAfectados) + " predios</strong></div>",
      "<div><span>Sin informaci&oacute;n</span><strong>" + formatNumber(theme.sinInfo) + " predios</strong></div>",
      "</div>",
      "<div class=\"geo-legend__item\"><span class=\"geo-legend__swatch geo-predio--tarifa-afectado\"></span><span>Predios afectados</span></div>",
      "<div class=\"geo-legend__item\"><span class=\"geo-legend__swatch geo-predio--tarifa-no-afectado\"></span><span>Predios no afectados</span></div>",
    ].join("");
  }

  function buildAvaluoLegendHtml(theme, context) {
    const config = getAvaluoContextConfig(context);
    if (!theme || !theme.ranges.length) {
      return "<h4>" + config.legendTitle + "</h4><div class=\"geo-theme-message\">No se encontraron campos suficientes para calcular el cambio de aval&uacute;o. Se muestra el mapa base.</div>";
    }

    const message = theme.uniqueCount < 4
      ? "<div class=\"geo-theme-message\">Hay pocos valores &uacute;nicos para formar cuatro cuantiles; se muestran los grupos disponibles.</div>"
      : "";
    const counts = [
      "<div class=\"geo-legend__counts\">",
      theme.ranges.map(function (item) {
        return "<div><span>" + item.label + "</span><strong>" + formatNumber(item.count) + " predios</strong></div>";
      }).join(""),
      "<div><span>Sin informaci&oacute;n</span><strong>" + formatNumber(theme.sinInfoCount) + " predios</strong></div>",
      "</div>",
    ].join("");
    return [
      "<h4>" + config.legendTitle + "</h4>",
      "<p class=\"geo-legend__note\">" + config.legendSubtitle + "</p>",
      message,
      counts,
      "<div class=\"geo-legend__item\"><span class=\"geo-legend__swatch geo-legend__swatch--sin-info\"></span><span>Sin informaci&oacute;n</span></div>",
    ].concat(theme.ranges.map(function (item) {
      return "<div class=\"geo-legend__item\"><span class=\"geo-legend__swatch " + item.className + "\"></span><span>" + item.label + " <small>" + formatMoney(item.min) + " a " + formatMoney(item.max) + "</small></span></div>";
    })).join("");
  }

  function buildBaseLegendHtml() {
    return "<h4>Mapa base de predios</h4><div class=\"geo-theme-message\">Este panel no tiene simbolog&iacute;a tem&aacute;tica activa para mostrar. Los colores solo distinguen zona rural/urbana y predios sin informaci&oacute;n asociada.</div>";
  }

  function renderLegend(panel, context, avaluoTheme, hasAvaluoFields, hasTarifaScenario, tarifaTheme) {
    const legend = panel.querySelector(".geo-legend");
    if (!legend) return;
    legend.hidden = false;

    if (isAvaluoThematicContext(context)) {
      legend.innerHTML = buildAvaluoLegendHtml(hasAvaluoFields ? avaluoTheme : null, context);
    } else if (isTarifaThematicContext(context)) {
      legend.innerHTML = buildTarifaLegendHtml(hasTarifaScenario, tarifaTheme, context);
    } else {
      legend.innerHTML = buildBaseLegendHtml();
    }
  }

  function getScenarioNewTariff(features) {
    const affected = features.find(function (feature) {
      return (feature.properties || {}).PREDIO_AFECTADO === true;
    });
    if (!affected) return null;
    return toNumber((affected.properties || {}).TARIFA_NUEVA);
  }

  function renderScenarioSummary(panel, isTarifaContext, hasScenario, theme, features) {
    const summary = panel.querySelector(".geo-scenario-summary");
    if (!summary) return;

    if (!isTarifaContext || !hasScenario) {
      summary.innerHTML = "";
      summary.hidden = true;
      return;
    }

    summary.hidden = false;
    const newTariff = getScenarioNewTariff(features);
    summary.innerHTML = [
      "<h4>Escenario actual</h4>",
      "<div class=\"geo-attribute\"><span>Tarifa nueva</span><span>" + (newTariff !== null ? formatNumber(newTariff) : "Sin dato") + "</span></div>",
      "<div class=\"geo-attribute\"><span>Predios afectados</span><span>" + formatNumber(theme.afectados) + "</span></div>",
      "<div class=\"geo-attribute\"><span>Predios no afectados</span><span>" + formatNumber(theme.noAfectados) + "</span></div>",
    ].join("");
  }

  function getAvaluoContextConfig(context) {
    return AVALUO_CONTEXT_CONFIG[context] || AVALUO_CONTEXT_CONFIG[AVALUO_YEAR1_CONTEXT];
  }

  function getCoordinates(geometry) {
    if (!geometry) return [];
    if (geometry.type === "Polygon") return geometry.coordinates.flat(1);
    if (geometry.type === "MultiPolygon") return geometry.coordinates.flat(2);
    return [];
  }

  function computeBounds(features) {
    const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    features.forEach(function (feature) {
      getCoordinates(feature.geometry).forEach(function (point) {
        bounds.minX = Math.min(bounds.minX, point[0]);
        bounds.maxX = Math.max(bounds.maxX, point[0]);
        bounds.minY = Math.min(bounds.minY, point[1]);
        bounds.maxY = Math.max(bounds.maxY, point[1]);
      });
    });
    return bounds;
  }

  function pathFromRing(ring, bounds, width, height, padding) {
    return ring.map(function (point, index) {
      const x = padding + ((point[0] - bounds.minX) / (bounds.maxX - bounds.minX || 1)) * (width - padding * 2);
      const y = height - padding - ((point[1] - bounds.minY) / (bounds.maxY - bounds.minY || 1)) * (height - padding * 2);
      return (index === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2);
    }).join(" ") + " Z";
  }

  function pathFromGeometry(geometry, bounds) {
    const width = 1000;
    const height = 650;
    const padding = 24;
    if (!geometry) return "";
    if (geometry.type === "Polygon") {
      return geometry.coordinates.map(function (ring) {
        return pathFromRing(ring, bounds, width, height, padding);
      }).join(" ");
    }
    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates.map(function (polygon) {
        return polygon.map(function (ring) {
          return pathFromRing(ring, bounds, width, height, padding);
        }).join(" ");
      }).join(" ");
    }
    return "";
  }

  function renderAttributes(container, feature, context, theme, hasScenario) {
    const props = feature && feature.properties ? feature.properties : {};
    const isAvaluoContext = isAvaluoThematicContext(context);
    const config = getAvaluoContextConfig(context);
    const isTarifaContext = isTarifaThematicContext(context);
    const isTarifaYear2 = context === TARIFA_YEAR2_CONTEXT;
    const predioTieneEscenario = isTarifaContext && typeof props.PREDIO_AFECTADO === "boolean";
    const missingTableNote = isAvaluoContext && !props.coincide_tabla
      ? "<div class=\"geo-sidebar-note\">Este predio tiene geometr&iacute;a, pero no informaci&oacute;n asociada en la plantilla.</div>"
      : isTarifaContext && !hasScenario
      ? "<div class=\"geo-sidebar-note\">No hay un escenario de modificaci&oacute;n de tarifas aplicado. Se muestra la informaci&oacute;n base del predio.</div>"
      : isTarifaContext && hasScenario && !predioTieneEscenario
      ? "<div class=\"geo-sidebar-note\">Este predio no tiene informaci&oacute;n asociada en la plantilla para el escenario aplicado.</div>"
      : "";
    const rows = isAvaluoContext ? [
      ["Predial", props.NUMERO_PREDIAL || props.CODIGO, "text"],
      ["Zona", props.zona_geografica || props.ZONA, "text"],
      ["Destinaci&oacute;n", props.EQUIVALENCIA_DESTINO || props.DESTINACION_ECONOMICA, "text"],
      [config.baseLabel, props.AVALUO, "money"],
      [config.updatedLabel, props.AVALUO_ACTUALIZADO, "money"],
      ["Diferencia aval&uacute;o ($)", getAvaluoDiff(props), "money"],
      ["Variaci&oacute;n aval&uacute;o (%)", getAvaluoVariation(props), "percent"],
      ["Categor&iacute;a de impacto", getAvaluoImpactLabel(props, theme), "text"],
      ["Coincide tabla", props.coincide_tabla ? "S&iacute;" : "No", "text"],
    ] : hasScenario && isTarifaContext ? [
      ["Predial", props.NUMERO_PREDIAL || props.CODIGO, "text"],
      ["Zona", props.zona_geografica || props.ZONA, "text"],
      ["Destinaci&oacute;n", props.EQUIVALENCIA_DESTINO || props.DESTINACION_ECONOMICA, "text"],
      ["Tarifa original", props.TARIFA_ORIGINAL, "number"],
      ["Tarifa nueva", props.TARIFA_NUEVA, "number"],
      ["&iquest;Afectado por escenario?", predioTieneEscenario ? (props.PREDIO_AFECTADO ? "S&iacute;" : "No") : "Sin informaci&oacute;n", "text"],
      ["Liquidaci&oacute;n original", props.VALOR_LIQUIDADO_ORIGINAL, "money"],
      ["Liquidaci&oacute;n modificada", props.VALOR_LIQUIDADO_MODIFICADO, "money"],
      ["Diferencia liquidaci&oacute;n", props.DIFERENCIA_LIQUIDACION, "money"],
    ].concat(isTarifaYear2 ? [["Categor&iacute;a/estado del predio", props.CATEGORIA_PREDIO, "text"]] : []).concat([
      ["Coincide tabla", props.coincide_tabla ? "S&iacute;" : "No", "text"],
    ]) : [
      ["Predial", props.CODIGO],
      ["Zona", props.zona_geografica],
      ["Destino", props.EQUIVALENCIA_DESTINO || props.DESTINACION_ECONOMICA],
      ["Avalúo", props.AVALUO],
      ["Avalúo actualizado", props.AVALUO_ACTUALIZADO],
      ["Tarifa", props.TARIFA],
      ["Liquidado", props.VALOR_LIQUIDADO],
      ["Liquidado actualizado", props.VALOR_LIQUIDADO_ACTUALIZADO],
      ["Área terreno", props.AREA_TERRENO],
      ["Área construida", props.AREA_CONSTRUIDA],
      ["Estrato", props.ESTRATO],
      ["Coincide tabla", props.coincide_tabla ? "Sí" : "No"],
    ];

    container.innerHTML = missingTableNote + "<h4>Predio seleccionado</h4>" + rows.map(function (row) {
      const formatter = row[2] === "money" ? formatMoney : row[2] === "percent" ? formatPercent : formatNumber;
      return "<div class=\"geo-attribute\"><span>" + row[0] + "</span><span>" + formatter(row[1]) + "</span></div>";
    }).join("");
  }

  function renderMap(panel, payload, context) {
    const map = panel.querySelector(".geo-map");
    const sidebar = panel.querySelector(".geo-sidebar");
    const attributesContainer = panel.querySelector(".geo-sidebar__attributes") || sidebar;
    const meta = panel.querySelector(".geo-panel__meta");
    const features = payload.features || [];
    const metadata = payload.metadata || {};
    const isAvaluoContext = isAvaluoThematicContext(context);
    const hasAvaluoFields = features.some(function (feature) {
      return getAvaluoDiff(feature.properties || {}) !== null;
    });
    const avaluoTheme = isAvaluoContext && hasAvaluoFields ? buildAvaluoTheme(features) : null;
    const isTarifaContext = isTarifaThematicContext(context);
    const hasTarifaScenario = isTarifaContext && hasTarifaScenarioData(features);
    const tarifaTheme = isTarifaContext ? buildTarifaTheme(features) : null;

    meta.textContent = [
      formatNumber(metadata.coincidencias) + " predios con información",
      formatNumber(metadata.sin_tabla) + " geometrías sin tabla",
      formatNumber(metadata.sin_geometria) + " registros sin geometría",
    ].join(" · ");

    if (!features.length) {
      map.innerHTML = "<div class=\"geo-empty\">No hay geometrías para mostrar.</div>";
      renderLegend(panel, context, null, false, false, null);
      renderScenarioSummary(panel, isTarifaContext, false, null, []);
      return;
    }

    renderLegend(panel, context, avaluoTheme, hasAvaluoFields, hasTarifaScenario, tarifaTheme);
    renderScenarioSummary(panel, isTarifaContext, hasTarifaScenario, tarifaTheme, features);
    const bounds = computeBounds(features);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 1000 650");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Mapa de predios");

    features.forEach(function (feature, index) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const props = feature.properties || {};
      const thematicApplied = (isAvaluoContext && hasAvaluoFields) || (isTarifaContext && hasTarifaScenario);
      path.setAttribute("d", pathFromGeometry(feature.geometry, bounds));
      path.setAttribute("class", [
        "geo-predio",
        isAvaluoContext && hasAvaluoFields ? getAvaluoThemeClass(props, avaluoTheme) : "",
        isTarifaContext && hasTarifaScenario ? getTarifaThemeClass(props) : "",
        !thematicApplied && props.zona_geografica === "rural" ? "geo-predio--rural" : "",
        !thematicApplied && !props.coincide_tabla ? "geo-predio--sin-tabla" : "",
      ].filter(Boolean).join(" "));
      path.setAttribute("tabindex", "0");
      path.addEventListener("click", function () {
        panel.querySelectorAll(".geo-predio--selected").forEach(function (node) {
          node.classList.remove("geo-predio--selected");
        });
        path.classList.add("geo-predio--selected");
        renderAttributes(attributesContainer, feature, context, avaluoTheme, hasTarifaScenario);
      });
      path.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          path.dispatchEvent(new MouseEvent("click"));
        }
      });
      svg.appendChild(path);
      if (index === 0) renderAttributes(attributesContainer, feature, context, avaluoTheme, hasTarifaScenario);
    });

    map.innerHTML = "";
    map.appendChild(svg);
  }

  async function loadContext(panel, context) {
    const button = panel.querySelector(".geo-panel__button");
    const map = panel.querySelector(".geo-map");
    if (!state.dataId) {
      map.innerHTML = "<div class=\"geo-empty\">Cargue una plantilla y envíe la información para activar el mapa.</div>";
      return;
    }

    const cacheKey = state.dataId + ":" + context;
    if (state.cache[cacheKey]) {
      renderMap(panel, state.cache[cacheKey], context);
      return;
    }

    button.disabled = true;
    button.textContent = "Cargando";
    map.innerHTML = "<div class=\"geo-empty\">Cargando geometrías...</div>";

    try {
      const url = state.apiBase + "/geo/predios?dataId=" + encodeURIComponent(state.dataId) + "&context=" + encodeURIComponent(context);
      const response = await fetch(url);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No fue posible cargar el mapa.");
      state.cache[cacheKey] = payload;
      renderMap(panel, payload, context);
    } catch (error) {
      map.innerHTML = "<div class=\"geo-error\">" + error.message + "</div>";
    } finally {
      button.disabled = false;
      button.textContent = "Actualizar mapa";
    }
  }

  function createPanel(config) {
    const panel = document.createElement("section");
    panel.className = "geo-panel";
    panel.dataset.geoContext = config.context;
    panel.innerHTML = [
      "<div class=\"geo-panel__header\">",
      "<div><h3 class=\"geo-panel__title\">" + config.title + "</h3><p class=\"geo-panel__meta\">Mapa predial vinculado a la plantilla cargada.</p></div>",
      "<div class=\"geo-panel__actions\"><button class=\"geo-panel__button\" type=\"button\">Actualizar mapa</button></div>",
      "</div>",
      "<div class=\"geo-panel__body\">",
      "<div class=\"geo-map\"><div class=\"geo-empty\">Cargue una plantilla y envíe la información para activar el mapa.</div></div>",
      "<aside class=\"geo-sidebar\"><div class=\"geo-legend\"></div><div class=\"geo-scenario-summary\"></div><div class=\"geo-sidebar__attributes\"><h4>Predio seleccionado</h4><p class=\"geo-empty\">Seleccione un polígono para consultar sus atributos.</p></div></aside>",
      "</div>",
    ].join("");
    panel.querySelector(".geo-panel__button").addEventListener("click", function () {
      state.cache = {};
      loadContext(panel, config.context);
    });
    return panel;
  }

  function mountAll() {
    contexts.forEach(function (config) {
      const pane = document.getElementById(config.paneId);
      if (!pane || pane.querySelector("[data-geo-context='" + config.context + "']")) return;
      const panel = createPanel(config);
      pane.appendChild(panel);
      loadContext(panel, config.context);
    });
  }

  installNetworkHooks();
  const observer = new MutationObserver(mountAll);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", mountAll);
  mountAll();
})();
