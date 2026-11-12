import { DEFAULT_CONFIG } from "./config.js";
import { PolygonMonitorService } from "./web3-service.js";

function loadConfig() {
  const saved = localStorage.getItem("anoc_polygon_config");
  return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
}

let currentConfig = loadConfig();
let service = new PolygonMonitorService(currentConfig);

// Manejo de pestañas
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => {
      b.classList.remove("border-purple-500", "text-white");
      b.classList.add("border-transparent", "text-gray-400");
    });
    btn.classList.add("border-purple-500", "text-white");
    btn.classList.remove("border-transparent", "text-gray-400");

    const target = btn.dataset.tab;
    document.querySelectorAll(".tab-content").forEach(sec => sec.classList.add("hidden"));
    document.getElementById(`tab-${target}`).classList.remove("hidden");
  });
});

// Inicializar formulario de configuración
document.getElementById("input-rpc").value = currentConfig.rpcUrl;
document.getElementById("input-wallets").value = currentConfig.wallets.join("\n");

document.getElementById("btn-save-settings").addEventListener("click", () => {
  const rpcUrl = document.getElementById("input-rpc").value.trim() || DEFAULT_CONFIG.rpcUrl;
  const wallets = document.getElementById("input-wallets").value
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  currentConfig = { ...currentConfig, rpcUrl, wallets };
  localStorage.setItem("anoc_polygon_config", JSON.stringify(currentConfig));
  service = new PolygonMonitorService(currentConfig);
  refreshAll();
  alert("Configuración guardada localmente.");
});

async function refreshAll() {
  const statusEl = document.getElementById("wallets-status");
  statusEl.textContent = "Consultando Multicall...";

  try {
    // 1. Red + Dexscreener en paralelo
    const [netStats, pairs] = await Promise.all([
      service.getNetworkStats(),
      service.fetchDexscreenerPairs(currentConfig.watchlistPairs)
    ]);

    document.getElementById("block-number").textContent = `#${netStats.blockNumber}`;
    document.getElementById("gas-price").textContent = `${netStats.gasGwei} Gwei`;

    // Extraer precios de referencia desde Dexscreener
    const ethPair = pairs.find(p => p.baseToken.symbol === "WETH");
    const polPair = pairs.find(p => p.baseToken.symbol === "WPOL" || p.baseToken.symbol === "WMATIC");
    const ethPrice = ethPair ? Number(ethPair.priceUsd) : 0;
    const polPrice = polPair ? Number(polPair.priceUsd) : 0;

    document.getElementById("pol-price").textContent = polPrice > 0 ? `$${polPrice.toFixed(4)}` : "$--";

    // Renderizar Watchlist (Dexscreener)
    renderWatchlist(pairs);

    // 2. Consultar las 24 wallets en 1 sola llamada
    const walletsData = await service.fetchAllWalletsBalances(currentConfig.wallets);
    renderWalletsTable(walletsData, { polPrice, ethPrice });

    statusEl.textContent = `Actualizado (${walletsData.length} cuentas)`;
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Error de conexión RPC";
  }
}

function renderWalletsTable(walletsData, prices) {
  const tbody = document.getElementById("wallets-table-body");
  tbody.innerHTML = "";
  let grandTotalUsd = 0;

  walletsData.forEach(w => {
    const stables = (w.tokens["USDC.e"] || 0) + (w.tokens["USDT"] || 0);
    const weth = w.tokens["WETH"] || 0;
    const usdValue = (w.native * prices.polPrice) + stables + (weth * prices.ethPrice);
    grandTotalUsd += usdValue;

    const shortAddr = `${w.address.slice(0, 6)}...${w.address.slice(-4)}`;
    const tr = document.createElement("tr");
    tr.className = "table-row transition";
    tr.innerHTML = `
      <td class="px-4 py-2.5 text-gray-400">W-${String(w.index).padStart(2, "0")}</td>
      <td class="px-4 py-2.5">
        <a href="https://polygonscan.com/address/${w.address}" target="_blank" class="text-purple-400 hover:underline">${shortAddr}</a>
      </td>
      <td class="px-4 py-2.5 text-right text-gray-200">${w.native.toFixed(3)}</td>
      <td class="px-4 py-2.5 text-right text-emerald-400">$${stables.toFixed(2)}</td>
      <td class="px-4 py-2.5 text-right text-blue-300">${weth.toFixed(4)}</td>
      <td class="px-4 py-2.5 text-right font-semibold text-white">$${usdValue.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("total-portfolio").textContent = `$${grandTotalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function renderWatchlist(pairs) {
  const tbody = document.getElementById("watchlist-table-body");
  tbody.innerHTML = "";

  pairs.forEach(pair => {
    const change24 = pair.priceChange?.h24 ?? 0;
    const changeColor = change24 >= 0 ? "text-emerald-400" : "text-rose-400";
    const tr = document.createElement("tr");
    tr.className = "table-row transition";
    tr.innerHTML = `
      <td class="px-4 py-2.5 font-sans font-semibold text-white">
        ${pair.baseToken.symbol}<span class="text-gray-400 font-normal">/${pair.quoteToken.symbol}</span>
      </td>
      <td class="px-4 py-2.5 uppercase text-gray-400">${pair.dexId}</td>
      <td class="px-4 py-2.5 text-right text-white">$${Number(pair.priceUsd).toFixed(4)}</td>
      <td class="px-4 py-2.5 text-right ${changeColor}">${change24 > 0 ? "+" : ""}${change24}%</td>
      <td class="px-4 py-2.5 text-right text-gray-300">$${Number(pair.volume?.h24 || 0).toLocaleString()}</td>
      <td class="px-4 py-2.5 text-right text-gray-300">$${Number(pair.liquidity?.usd || 0).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById("btn-refresh").addEventListener("click", refreshAll);
refreshAll();
