/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TELEGRAM_BOT_TOKEN?: string;
  readonly VITE_TELEGRAM_ALLOWED_CHAT_ID?: string;
  readonly VITE_TWELVEDATA_API_KEY?: string;
  readonly VITE_COINGECKO_API_KEY?: string;
  readonly VITE_BINANCE_API_KEY?: string;
  readonly VITE_NEWSAPI_KEY?: string;
  readonly VITE_CRYPTOPANIC_KEY?: string;
  readonly VITE_FMP_API_KEY?: string;
  readonly VITE_ETHERSCAN_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
