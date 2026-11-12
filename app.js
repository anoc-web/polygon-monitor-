import { DEFAULT_CONFIG } from "./config.js";

function loadConfig() {
  const saved = localStorage.getItem("anoc_polygon_config");
  return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
}

let currentConfig = loadConfig();

// Pestañas
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

document.getElementById("input-wallets").value = currentConfig.wallets.join("\n");

document.getElementById("btn-save-settings").addEventListener("click", () => {
  const wallets = document.getElementById("input-wallets").value
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  currentConfig = { ...currentConfig, wallets };
  localStorage.setItem("anoc_polygon_config", JSON.stringify(currentConfig));
  refreshDashboard();
  alert("Direcciones guardadas.");
});

async function refreshDashboard() {
  const statusEl = document.getElementById("wallets-status");
  statusEl.textContent = "Consultando mercado...";

  try {
    // 1. Obtener precio del POL desde Dexscreener
    let polPrice = 0.0861; // fallback
    try {
      const resPair = await fetch(`https://api.dexscreener.com/latest/dex/pairs/polygon/${currentConfig.watchlistPairs[1]}`);
      const dataPair = await resPair.json();
      if (dataPair.pairs && dataPair.pairs.length > 0) {
        polPrice = Number(dataPair.pairs[0].priceUsd);
      }
    } catch (e) {
      console.warn("Usando precio base para POL");
    }

    document.getElementById("pol-price").textContent = `$${polPrice.toFixed(4)}`;

    // 2. Consultar saldos nativos usando la API pública de Polygonscan
    statusEl.textContent = "Consultando cuentas...";
    const tbody = document.getElementById("wallets-table-body");
    tbody.innerHTML = "";
    let grandTotalUsd = 0;

    for (let i = 0; i < currentConfig.wallets.length; i++) {
      const address = currentConfig.wallets[i];
      let nativeBal = 0;

      try {
        // API pública de Polygonscan para balance nativo
        const res = await fetch(`https://api.polygonscan.com/api?module=account&action=balance&address=${address}&tag=latest`);
        const data = await res.json();
        if (data.status === "1") {
          nativeBal = Number(data.result) / 1e18;
        }
      } catch (err) {
        console.warn(`Error consultando saldo para ${address}`, err);
      }

      const usdValue = nativeBal * polPrice;
      grandTotalUsd += usdValue;

      const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
      const tr = document.createElement("tr");
      tr.className = "table-row transition";
      tr.innerHTML = `
        <td class="px-4 py-2.5 text-gray-400">W-${String(i + 1).padStart(2, "0")}</td>
        <td class="px-4 py-2.5"><a href="https://polygonscan.com/address/${address}" target="_blank" class="text-purple-400 hover:underline">${shortAddr}</a></td>
        <td class="px-4 py-2.5 text-right text-gray-200">${nativeBal.toFixed(4)}</td>
        <td class="px-4 py-2.5 text-right font-semibold text-white">$${usdValue.toFixed(2)}</td>
      `;
      tbody.appendChild(tr);
    }

    document.getElementById("total-portfolio").textContent = `$${grandTotalUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    statusEl.textContent = `Sincronizado (${currentConfig.wallets.length} cuentas)`;

    // 3. Cargar Watchlist de Dexscreener
    const resDeX = await fetch(`https://api.dexscreener.com/latest/dex/pairs/polygon/${currentConfig.watchlistPairs.join(",")}`);
    const dataDeX = await resDeX.json();
    if (dataDeX.pairs) {
      renderWatchlist(dataDeX.pairs);
    }

  } catch (err) {
    console.error(err);
    statusEl.textContent = "Error al actualizar";
  }
}

function renderWatchlist(pairs) {
  const tbody = document.getElementById("watchlist-table-body");
  tbody.innerHTML = "";
  pairs.forEach(pair => {
    const change24 = pair.priceChange?.h24 ?? 0;
    const tr = document.createElement("tr");
    tr.className = "table-row transition";
    tr.innerHTML = `
      <td class="px-4 py-2.5 font-sans font-semibold text-white">${pair.baseToken.symbol}<span class="text-gray-400 font-normal">/${pair.quoteToken.symbol}</span></td>
      <td class="px-4 py-2.5 uppercase text-gray-400">${pair.dexId}</td>
      <td class="px-4 py-2.5 text-right text-white">$${Number(pair.priceUsd).toFixed(4)}</td>
      <td class="px-4 py-2.5 text-right ${change24 >= 0 ? "text-emerald-400" : "text-rose-400"}">${change24 > 0 ? "+" : ""}${change24}%</td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById("btn-refresh").addEventListener("click", refreshDashboard);
refreshDashboard();
