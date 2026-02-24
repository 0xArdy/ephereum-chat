import { useEffect, useMemo, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { normalizeMetaAddress } from '../modules/stealth/meta-address';
import { getLatestMetaAddressFromLogs, getStealthMetaAddress } from '../modules/stealth/registry';
import { useSession } from '../state/session-context';
import { toUserErrorMessage } from '../utils';
import type { Address } from 'viem';

type RegistryEntry = {
  metaAddress: string;
  schemeId: bigint;
};

type RegistryState = {
  registryMetaAddress: string | null;
  latestRegistryEntry: RegistryEntry | null;
  isRegistryLoading: boolean;
  registryError: string | null;
  registryMatch: boolean;
  registryMismatch: boolean;
  registryStatus: string;
  refreshToken: number;
  refreshRegistry: () => void;
};

let globalRegistryCache: {
  address: string;
  schemeId: string;
  refreshToken: number;
  data: {
    registryMetaAddress: string | null;
    latestRegistryEntry: RegistryEntry | null;
  };
  timestamp: number;
} | null = null;

const CACHE_TTL = 10000;

let pendingRegistryFetch: Promise<{
  registryMetaAddress: string | null;
  latestRegistryEntry: RegistryEntry | null;
}> | null = null;

export function useRegistry(): RegistryState {
  const { address } = useAccount();
  const { schemeId, metaAddress } = useSession();

  const [registryMetaRaw, setRegistryMetaRaw] = useState<string | null>(null);
  const [latestRegistryEntry, setLatestRegistryEntry] = useState<RegistryEntry | null>(null);
  const [isRegistryLoading, setIsRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const fetchIdRef = useRef(0);

  const parsedSchemeId = useMemo(() => {
    const parsed = Number.parseInt(schemeId, 10);
    if (!Number.isFinite(parsed)) return null;
    return BigInt(parsed);
  }, [schemeId]);

  const registryMetaAddress = useMemo(() => {
    if (latestRegistryEntry?.metaAddress) return latestRegistryEntry.metaAddress;
    if (!registryMetaRaw) return null;
    const normalized = normalizeMetaAddress(registryMetaRaw);
    if (!normalized || normalized === '0x') return null;
    return normalized;
  }, [latestRegistryEntry, registryMetaRaw]);

  const registryMatch = Boolean(
    registryMetaAddress && metaAddress && registryMetaAddress.toLowerCase() === metaAddress.toLowerCase(),
  );
  const registryMismatch = Boolean(registryMetaAddress && metaAddress && !registryMatch);

  const registryStatus = useMemo(() => {
    if (!address) return 'Wallet not connected. Registry is optional; share your meta-address directly.';
    if (!parsedSchemeId) return 'Enter a numeric scheme id.';
    if (isRegistryLoading) return 'Checking registry...';
    if (registryError) return registryError;
    if (!registryMetaAddress) return 'No meta-address registered yet.';
    if (!metaAddress) return 'Registry has a meta-address. Set up keys to compare.';
    if (registryMatch) return 'Your meta-address is registered.';
    return 'Registry has a different meta-address.';
  }, [address, isRegistryLoading, metaAddress, parsedSchemeId, registryError, registryMatch, registryMetaAddress]);

  useEffect(() => {
    const currentFetchId = ++fetchIdRef.current;

    if (!address || !parsedSchemeId) {
      setRegistryMetaRaw(null);
      setLatestRegistryEntry(null);
      setRegistryError(null);
      setIsRegistryLoading(false);
      return;
    }

    const cacheKey = { address, schemeId, refreshToken };
    const now = Date.now();

    if (
      globalRegistryCache &&
      globalRegistryCache.address === address &&
      globalRegistryCache.schemeId === schemeId &&
      globalRegistryCache.refreshToken === refreshToken &&
      now - globalRegistryCache.timestamp < CACHE_TTL
    ) {
      setRegistryMetaRaw(globalRegistryCache.data.registryMetaAddress);
      setLatestRegistryEntry(globalRegistryCache.data.latestRegistryEntry);
      return;
    }

    if (pendingRegistryFetch) {
      setIsRegistryLoading(true);
      pendingRegistryFetch
        .then((result) => {
          if (currentFetchId !== fetchIdRef.current) return;
          setRegistryMetaRaw(result.registryMetaAddress);
          setLatestRegistryEntry(result.latestRegistryEntry);
        })
        .finally(() => {
          if (currentFetchId === fetchIdRef.current) {
            setIsRegistryLoading(false);
          }
        });
      return;
    }

    setIsRegistryLoading(true);
    setRegistryError(null);

    pendingRegistryFetch = Promise.all([
      getLatestMetaAddressFromLogs({ registrant: address as Address }),
      getStealthMetaAddress({ registrant: address as Address, schemeId: parsedSchemeId }),
    ])
      .then(([latest, registryMeta]) => {
        const result = {
          registryMetaAddress: typeof registryMeta === 'string' ? registryMeta : null,
          latestRegistryEntry: latest,
        };

        globalRegistryCache = {
          ...cacheKey,
          data: result,
          timestamp: Date.now(),
        };

        return result;
      })
      .catch((error: unknown) => {
        throw error instanceof Error ? error : new Error('Failed to check registry.');
      })
      .finally(() => {
        pendingRegistryFetch = null;
      });

    pendingRegistryFetch
      .then((result) => {
        if (currentFetchId !== fetchIdRef.current) return;
        setRegistryMetaRaw(result.registryMetaAddress);
        setLatestRegistryEntry(result.latestRegistryEntry);
      })
      .catch((error: unknown) => {
        if (currentFetchId !== fetchIdRef.current) return;
        const message = toUserErrorMessage(error, 'Failed to check registry.');
        setRegistryError(message);
      })
      .finally(() => {
        if (currentFetchId === fetchIdRef.current) {
          setIsRegistryLoading(false);
        }
      });
  }, [address, parsedSchemeId, schemeId, refreshToken]);

  const refreshRegistry = () => {
    globalRegistryCache = null;
    setRefreshToken((prev) => prev + 1);
  };

  return {
    registryMetaAddress,
    latestRegistryEntry,
    isRegistryLoading,
    registryError,
    registryMatch,
    registryMismatch,
    registryStatus,
    refreshToken,
    refreshRegistry,
  };
}
