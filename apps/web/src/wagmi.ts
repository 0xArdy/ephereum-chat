import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

const RPC_URL = getRequiredRpcUrl();

export const config = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(RPC_URL),
  },
});

export { RPC_URL };

function getRequiredRpcUrl() {
  const rpcUrl = import.meta.env.VITE_PUBLIC_RPC_URL?.trim();
  if (!rpcUrl) {
    throw new Error(
      'Missing required environment variable: VITE_PUBLIC_RPC_URL. Set it in your .env file or deployment environment.',
    );
  }

  try {
    const parsed = new URL(rpcUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('VITE_PUBLIC_RPC_URL must use http or https.');
    }
    return parsed.toString();
  } catch {
    throw new Error('Invalid VITE_PUBLIC_RPC_URL. Expected a valid http(s) URL.');
  }
}
