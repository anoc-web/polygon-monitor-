import { ethers } from "https://esm.sh/ethers@6.13.4";
import { MULTICALL3_ABI, ERC20_ABI } from "./config.js";

export class PolygonMonitorService {
  constructor(config) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.multicall = new ethers.Contract(config.multicallAddress, MULTICALL3_ABI, this.provider);
    this.erc20Interface = new ethers.Interface(ERC20_ABI);
    this.mcInterface = new ethers.Interface(MULTICALL3_ABI);
  }

  async getNetworkStats() {
    const [blockNumber, feeData] = await Promise.all([
      this.provider.getBlockNumber(),
      this.provider.getFeeData()
    ]);
    const gasGwei = feeData.gasPrice ? Number(ethers.formatUnits(feeData.gasPrice, "gwei")).toFixed(1) : "--";
    return { blockNumber, gasGwei };
  }

  // Consulta las 24 wallets y todos sus tokens en UNA SOLA llamada RPC
  async fetchAllWalletsBalances(wallets) {
    const validWallets = wallets.filter(w => ethers.isAddress(w));
    if (validWallets.length === 0) return [];

    const calls = [];
    const tokens = this.config.tokens;

    for (const wallet of validWallets) {
      // 1. Llamada para balance nativo (POL/MATIC)
      calls.push({
        target: this.config.multicallAddress,
        allowFailure: true,
        callData: this.mcInterface.encodeFunctionData("getEthBalance", [wallet])
      });

      // 2. Llamadas para cada token ERC-20
      for (const token of tokens) {
        calls.push({
          target: token.address,
          allowFailure: true,
          callData: this.erc20Interface.encodeFunctionData("balanceOf", [wallet])
        });
      }
    }

    const results = await this.multicall.aggregate3(calls);
    const stride = 1 + tokens.length;
    const output = [];

    for (let i = 0; i < validWallets.length; i++) {
      const baseIdx = i * stride;
      const nativeRes = results[baseIdx];
      const nativeBal = nativeRes.success
        ? Number(ethers.formatEther(this.mcInterface.decodeFunctionResult("getEthBalance", nativeRes.returnData)[0]))
        : 0;

      const tokenBalances = {};
      tokens.forEach((token, tIdx) => {
        const res = results[baseIdx + 1 + tIdx];
        tokenBalances[token.symbol] = res.success
          ? Number(ethers.formatUnits(this.erc20Interface.decodeFunctionResult("balanceOf", res.returnData)[0], token.decimals))
          : 0;
      });

      output.push({
        index: i + 1,
        address: validWallets[i],
        native: nativeBal,
        tokens: tokenBalances
      });
    }

    return output;
  }

  // Consulta API pública de Dexscreener para pares en Polygon
  async fetchDexscreenerPairs(pairAddresses) {
    if (!pairAddresses || pairAddresses.length === 0) return [];
    const joined = pairAddresses.join(",");
    const url = `https://api.dexscreener.com/latest/dex/pairs/polygon/${joined}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Error consultando Dexscreener API");
    const data = await response.json();
    return data.pairs || [];
  }
}
