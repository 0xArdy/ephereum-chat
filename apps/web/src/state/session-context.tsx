import { createContext, useCallback, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';
import { privateKeyToAccount } from 'viem/accounts';
import { getPublicClient } from 'wagmi/actions';
import { generateSigningKey, deriveSigningKeyFromPrivateKey, type SigningKey } from '../modules/keys/derivation';
import { hasStoredKeys, loadKeys, storeKeys, clearKeys, type KeyBundle } from '../modules/keys/storage';
import { SCHEME_ID } from '../modules/stealth/constants';
import { encodeMetaAddress } from '../modules/stealth/meta-address';
import { getCompressedPublicKey } from '../modules/stealth/stealth';
import { config } from '../wagmi';
import type { DerivedKeys } from '../modules/keys/derivation';

type SessionStatus = 'checking' | 'locked' | 'unlocked';

type SessionContextValue = {
  viewPrivKey: string;
  setViewPrivKey: (value: string) => void;
  spendPrivKey: string;
  setSpendPrivKey: (value: string) => void;
  viewPubKey: `0x${string}` | null;
  spendPubKey: `0x${string}` | null;
  metaAddress: string | null;
  sessionReady: boolean;
  schemeId: string;
  setSchemeId: (value: string) => void;
  sessionStatus: SessionStatus;
  hasStoredKeysFlag: boolean;
  derivationMethod: KeyBundle['derivationMethod'] | null;
  unlockSession: (password: string) => Promise<boolean>;
  lockSession: () => void;
  saveKeys: (
    keys: DerivedKeys,
    method: KeyBundle['derivationMethod'],
    password: string,
    signingKey?: SigningKey,
  ) => Promise<void>;
  clearStoredKeys: () => void;
  signingPrivKey: string | null;
  signingAddress: `0x${string}` | null;
  signingBalance: string | null;
  hasSigningKey: boolean;
  generateSigningKey: () => SigningKey;
  saveSigningKey: (signingKey: SigningKey, password: string) => Promise<void>;
  importSigningKey: (privateKey: string) => SigningKey | null;
  clearSigningKey: (password: string) => Promise<void>;
  refreshSigningBalance: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [viewPrivKey, setViewPrivKey] = useState('');
  const [spendPrivKey, setSpendPrivKey] = useState('');
  const [schemeId, setSchemeId] = useState('1');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('checking');
  const [derivationMethod, setDerivationMethod] = useState<KeyBundle['derivationMethod'] | null>(null);
  const [hasStoredKeysFlag, setHasStoredKeysFlag] = useState(false);
  const [signingPrivKey, setSigningPrivKey] = useState<string | null>(null);
  const [signingAddress, setSigningAddress] = useState<`0x${string}` | null>(null);
  const [signingBalance, setSigningBalance] = useState<string | null>(null);

  useEffect(() => {
    const stored = hasStoredKeys();
    setHasStoredKeysFlag(stored);
    if (stored) {
      setSessionStatus('locked');
    } else {
      setSessionStatus('unlocked');
    }
  }, []);

  const viewPubKey = useMemo(() => derivePublicKey(viewPrivKey), [viewPrivKey]);
  const spendPubKey = useMemo(() => derivePublicKey(spendPrivKey), [spendPrivKey]);
  const metaAddress = useMemo(() => {
    if (!viewPubKey || !spendPubKey) return null;
    try {
      return encodeMetaAddress({
        metaAddress: {
          scheme: SCHEME_ID,
          spendPubKey,
          viewPubKey,
        },
      });
    } catch {
      return null;
    }
  }, [spendPubKey, viewPubKey]);

  const sessionReady = Boolean(viewPubKey && spendPubKey);
  const hasSigningKey = Boolean(signingPrivKey && signingAddress);

  const refreshSigningBalance = useCallback(async () => {
    if (!signingAddress) {
      setSigningBalance(null);
      return;
    }

    try {
      const publicClient = getPublicClient(config);
      if (!publicClient) {
        setSigningBalance(null);
        return;
      }

      const balance = await publicClient.getBalance({ address: signingAddress });
      const ethBalance = Number(balance) / 1e18;
      setSigningBalance(ethBalance.toFixed(6));
    } catch {
      setSigningBalance(null);
    }
  }, [signingAddress]);

  useEffect(() => {
    if (signingAddress && sessionReady) {
      void refreshSigningBalance();
    }
  }, [signingAddress, sessionReady, refreshSigningBalance]);

  const unlockSession = useCallback(async (password: string): Promise<boolean> => {
    const bundle = await loadKeys(password);
    if (!bundle) return false;

    setViewPrivKey(bundle.viewPrivKey);
    setSpendPrivKey(bundle.spendPrivKey);
    setDerivationMethod(bundle.derivationMethod);
    if (bundle.signingPrivKey) {
      setSigningPrivKey(bundle.signingPrivKey);
      const account = privateKeyToAccount(bundle.signingPrivKey as `0x${string}`);
      setSigningAddress(account.address);
    }
    setSessionStatus('unlocked');
    return true;
  }, []);

  const lockSession = useCallback(() => {
    setViewPrivKey('');
    setSpendPrivKey('');
    setDerivationMethod(null);
    setSigningPrivKey(null);
    setSigningAddress(null);
    setSigningBalance(null);
    setSessionStatus('locked');
  }, []);

  const saveKeys = useCallback(
    async (keys: DerivedKeys, method: KeyBundle['derivationMethod'], password: string, signingKey?: SigningKey) => {
      const bundle: KeyBundle = {
        viewPrivKey: keys.viewPrivKey,
        spendPrivKey: keys.spendPrivKey,
        createdAt: Date.now(),
        derivationMethod: method,
        signingPrivKey: signingKey?.privateKey,
      };

      await storeKeys(bundle, password);
      setHasStoredKeysFlag(true);
      setViewPrivKey(keys.viewPrivKey);
      setSpendPrivKey(keys.spendPrivKey);
      setDerivationMethod(method);
      if (signingKey) {
        setSigningPrivKey(signingKey.privateKey);
        setSigningAddress(signingKey.address);
      }
      setSessionStatus('unlocked');
    },
    [],
  );

  const clearStoredKeys = useCallback(() => {
    clearKeys();
    setHasStoredKeysFlag(false);
    setViewPrivKey('');
    setSpendPrivKey('');
    setDerivationMethod(null);
    setSigningPrivKey(null);
    setSigningAddress(null);
    setSigningBalance(null);
    setSessionStatus('unlocked');
  }, []);

  const generateNewSigningKey = useCallback((): SigningKey => {
    return generateSigningKey();
  }, []);

  const saveSigningKeyWithPassword = useCallback(async (signingKey: SigningKey, password: string) => {
    const bundle = await loadKeys(password);
    if (!bundle) throw new Error('Invalid password');

    const updatedBundle: KeyBundle = {
      ...bundle,
      signingPrivKey: signingKey.privateKey,
    };

    await storeKeys(updatedBundle, password);
    setSigningPrivKey(signingKey.privateKey);
    setSigningAddress(signingKey.address);
    setSigningBalance(null);
  }, []);

  const importSigningKeyFromPrivate = useCallback((privateKey: string): SigningKey | null => {
    return deriveSigningKeyFromPrivateKey(privateKey);
  }, []);

  const clearSigningKeyOnly = useCallback(async (password: string) => {
    const bundle = await loadKeys(password);
    if (!bundle) throw new Error('Invalid password');

    const updatedBundle: KeyBundle = {
      ...bundle,
      signingPrivKey: undefined,
    };

    await storeKeys(updatedBundle, password);
    setSigningPrivKey(null);
    setSigningAddress(null);
    setSigningBalance(null);
  }, []);

  const value = useMemo(
    () => ({
      viewPrivKey,
      setViewPrivKey,
      spendPrivKey,
      setSpendPrivKey,
      viewPubKey,
      spendPubKey,
      metaAddress,
      sessionReady,
      schemeId,
      setSchemeId,
      sessionStatus,
      hasStoredKeysFlag,
      derivationMethod,
      unlockSession,
      lockSession,
      saveKeys,
      clearStoredKeys,
      signingPrivKey,
      signingAddress,
      signingBalance,
      hasSigningKey,
      generateSigningKey: generateNewSigningKey,
      saveSigningKey: saveSigningKeyWithPassword,
      importSigningKey: importSigningKeyFromPrivate,
      clearSigningKey: clearSigningKeyOnly,
      refreshSigningBalance,
    }),
    [
      viewPrivKey,
      spendPrivKey,
      viewPubKey,
      spendPubKey,
      metaAddress,
      sessionReady,
      schemeId,
      sessionStatus,
      hasStoredKeysFlag,
      derivationMethod,
      unlockSession,
      lockSession,
      saveKeys,
      clearStoredKeys,
      signingPrivKey,
      signingAddress,
      signingBalance,
      hasSigningKey,
      generateNewSigningKey,
      saveSigningKeyWithPassword,
      importSigningKeyFromPrivate,
      clearSigningKeyOnly,
      refreshSigningBalance,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within a SessionProvider');
  return context;
}

function derivePublicKey(privateKey: string) {
  if (!isValidPrivateKey(privateKey)) return null;

  try {
    return getCompressedPublicKey({ privateKey: privateKey as `0x${string}` });
  } catch {
    return null;
  }
}

function isValidPrivateKey(value: string) {
  return value.startsWith('0x') && value.length === 66;
}
