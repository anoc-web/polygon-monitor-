import { ethers } from "https://esm.sh/ethers@6.13.4";

// Configuración directa incrustada para evitar problemas de caché en GitHub Pages
const CONFIG = {
  rpcUrl: "https://polygon-rpc.com",
  // Tu dirección de MetaMask que vimos en las capturas
  wallets: [
    "0x68753328aabc02d0c8e863015d19ed02f3eda777"
  ],
  tokens: [
    { symbol: "USDC.e", address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6 },
    { symbol: "USDT",   address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 },
    { symbol: "WETH",   address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18 }
  ]
};

// Inicializar proveedor RPC de Polygon de forma directa
const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);

// Manejo de pestañas de la interfaz
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

// Precargar inputs de configuración
document.getElementById("input-rpc").value = CONFIG.rpcUrl;
document.getElementById("input-wallets").value = CONFIG.wallets.join("\n");

document.getElementById("btn-save-settings").addEventListener("click", () => {
  const newRpc = document.getElementById("input-rpc").value.trim();
  const newWallets = document.getElementById("input-wallets").value
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (newRpc) CONFIG.rpcUrl = newRpc;
  if (newWallets.length > 0) CONFIG.wallets = newWallets;
  
  alert("Configuración aplicada. Actualizando datos...");
  loadDashboard();
});

async function loadDashboard() {
  const statusEl = document.getElementById("wallets-status");
  statusEl.textContent = "Consultando red Polygon...";

  try {
    // 1. Obtener bloque y gas
    const [blockNumber, feeData] = await Promise.all([
      provider.getBlockNumber(),
      provider.getFeeData()
    ]);
    const gasGwei = feeData.gasPrice ? Number(ethers.formatUnits(feeData.gasPrice, "gwei")).toFixed(1) : "--";

    document.getElementById("block-number").textContent = `#${blockNumber}`;
    document.getElementById("gas-price").textContent = `${gasGwei} Gwei`;
    document.getElementById("pol-price").textContent = `$0.0861`; // Referencia inicial o se actualiza

    // 2. Consultar saldos de las wallets de forma directa y segura
    const tbody = document.getElementById("wallets-table-body");
    tbody.innerHTML = "";
    let grandTotalUsd = 0;

    for (let i = 0; i < CONFIG.wallets.length; i++) {
      const address = CONFIG.wallets[i];
      if (!ethers.isAddress(address)) continue;

      // Obtener balance nativo (POL/MATIC)
      const balanceWei = await provider.getBalance(address);
      const nativeBal = Number(ethers.formatEther(balanceWei));
      const usdValue = nativeBal * 0.0861; // Estimado base con el precio del POL
      grandTotalUsd += usdValue;

      const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
      const tr = document.createElement("tr");
      tr.className = "table-row transition";
      tr.innerHTML = `
        <td class="px-4 py-2.5 text-gray-400">W-${String(i + 1).padStart(2, "0")}</td>
        <td class="px-4 py-2.5"><a href="https://polygonscan.com/address/${address}" target="_blank" class="text-purple-400 hover:underline">${shortAddr}</a></td>
        <td class="px-4 py-2.5 text-right text-gray-200">${nativeBal.toFixed(4)}</td>
        <td class="px-4 py-2.5 text-right text-emerald-400">$0.00</td>
        <td class="px-4 py-2.5 text-right text-blue-300">0.0000</td>
        <td class="px-4 py-2.5 text-right font-semibold text-white">$${usdValue.toFixed(2)}</td>
      `;
      tbody.appendChild(tr);
    }

    document.getElementById("total-portfolio").textContent = `$${grandTotalUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    statusEl.textContent = `Sincronizado (${CONFIG.wallets.length} cuentas)`;

  } catch (err) {
    console.error("Error consultando blockchain:", err);
    statusEl.textContent = "Error de conexión RPC";
  }
}

document.getElementById("btn-refresh").addEventListener("click", loadDashboard);

// Ejecutar al iniciar
loadDashboard();
