export const DEFAULT_CONFIG = {
  // RPC público rápido de Polygon (puedes cambiarlo por tu Alchemy/Infura en Configuración)
  rpcUrl: "https://polygon-bor-rpc.publicnode.com",
  
  // Contrato oficial Multicall3 en Polygon
  multicallAddress: "0xcA11bde05977b3631167028862bE2a173976CA11",

  // Tokens principales en Polygon para lectura rápida
  tokens: [
    { symbol: "USDC.e", address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6 },
    { symbol: "USDT",   address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 },
    { symbol: "WETH",   address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18 }
  ],

  // Direcciones de ejemplo (reemplazalas por tus 24 cuentas en la pestaña Configuración)
  wallets: [
    "0x0000000000000000000000000000000000001010",
    "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"
  ],

  // Pares de Polygon para monitorear vía Dexscreener API (ej. WPOL/USDC, QuickSwap, etc.)
  watchlistPairs: [
    "0x45dda9cb7c25131df268515131f647d726f50608", // WETH / USDC Uniswap V3 Polygon
    "0x6e7a5fafcec6bb1e78bae2a1f0b612012bf14827", // WPOL / USDC QuickSwap
    "0x3f5228d0e7d75467366be7de2c31d0d098ba2c23"  // LINK / WETH QuickSwap
  ]
};

export const MULTICALL3_ABI = [
  "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)",
  "function getEthBalance(address addr) view returns (uint256 balance)"
];

export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)"
];
