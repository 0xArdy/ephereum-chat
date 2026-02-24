import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { useAccount, useConnect, useSignMessage } from 'wagmi';
import { PasswordField } from '../../components/password-field/PasswordField';
import {
  deriveKeysFromSignature,
  generateNewKeys,
  generateSigningKey,
  importKeys,
  SIGNATURE_MESSAGE,
  type SigningKey,
} from '../../modules/keys/derivation';
import { useRouter } from '../../state/router-context';
import { useSession } from '../../state/session-context';
import { truncateAddress } from '../../utils';
import './onboarding-page.css';

type Step = 'method' | 'import' | 'password' | 'signing' | 'done';

export function OnboardingPage() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { saveKeys, sessionReady, signingAddress, signingBalance, refreshSigningBalance, saveSigningKey } =
    useSession();
  const { navigate } = useRouter();

  const [step, setStep] = useState<Step>('method');

  const [pendingKeys, setPendingKeys] = useState<ReturnType<typeof deriveKeysFromSignature> | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [importViewKey, setImportViewKey] = useState('');
  const [importSpendKey, setImportSpendKey] = useState('');
  const [pendingSigningKey, setPendingSigningKey] = useState<SigningKey | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [derivationMethod, setDerivationMethod] = useState<'signature' | 'imported' | 'generated'>('signature');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (sessionReady && step === 'method') {
      navigate('/chat');
    }
  }, [sessionReady, step, navigate]);

  const handleDerive = useCallback(async () => {
    if (!address) {
      setError('Connect a wallet first to derive deterministic keys.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const signature = await signMessageAsync({ message: SIGNATURE_MESSAGE });
      const keys = deriveKeysFromSignature(signature);
      setPendingKeys(keys);
      setDerivationMethod('signature');
      setStep('password');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign message';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [address, signMessageAsync]);

  const handleImport = useCallback(() => {
    setError('');

    const keys = importKeys(importViewKey, importSpendKey);
    if (!keys) {
      setError('Invalid private keys. Keys must be 66-character hex strings starting with 0x.');
      return;
    }

    setPendingKeys(keys);
    setDerivationMethod('imported');
    setStep('password');
  }, [importViewKey, importSpendKey]);

  const handleGenerate = useCallback(() => {
    const keys = generateNewKeys();
    setPendingKeys(keys);
    setDerivationMethod('generated');
    setStep('password');
  }, []);

  const handleSaveKeys = useCallback(async () => {
    if (!pendingKeys) return;

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await saveKeys(pendingKeys, derivationMethod, password, pendingSigningKey || undefined);
      setStep('signing');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save keys';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [pendingKeys, password, confirmPassword, derivationMethod, saveKeys, pendingSigningKey]);

  const handleGenerateSigningKey = useCallback(() => {
    const key = generateSigningKey();
    setPendingSigningKey(key);
  }, []);

  const handleSaveSigningKey = useCallback(async () => {
    if (!pendingSigningKey) return;

    setIsLoading(true);
    setError('');

    try {
      await saveSigningKey(pendingSigningKey, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save signing key';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [pendingSigningKey, password, saveSigningKey]);

  const handleRefreshBalance = useCallback(() => {
    void refreshSigningBalance();
  }, [refreshSigningBalance]);

  const handleCopyAddress = useCallback(() => {
    const addr = pendingSigningKey?.address || signingAddress;
    if (!addr) return;
    void navigator.clipboard.writeText(addr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [pendingSigningKey, signingAddress]);

  const handleContinue = useCallback(() => {
    if (step === 'signing') {
      void handleSaveSigningKey().then(() => {
        setStep('done');
      });
    }
  }, [step, handleSaveSigningKey]);

  if (sessionReady && step === 'done') {
    return (
      <div className='onboarding'>
        <div className='onboarding__card'>
          <h1>All Set!</h1>
          <p>Your keys are configured and ready to use.</p>
          <a className='btn btn--primary' href='/chat'>
            Go to Chat
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className='onboarding'>
      <div className='onboarding__card'>
        <header className='onboarding__header'>
          <h1>Ephereum Chat</h1>
          <p>Ephemeral messages secured by EIP-4844 blobs</p>
        </header>

        <div className='onboarding__progress'>
          <div
            className={`onboarding__step ${['method', 'import', 'password'].includes(step) ? 'onboarding__step--active' : 'onboarding__step--done'}`}
          >
            1. Setup Keys
          </div>
          <div className={`onboarding__step ${['signing', 'done'].includes(step) ? 'onboarding__step--active' : ''}`}>
            2. Signing Key
          </div>
        </div>

        {error && <p className='onboarding__error'>{error}</p>}

        {step === 'method' && (
          <div className='onboarding__content'>
            <h2>Setup Your Keys</h2>
            <p>Generate or import keys to start now. Wallet connection is optional.</p>

            <div className='onboarding__options'>
              <button
                className='onboarding__option'
                type='button'
                onClick={handleDerive}
                disabled={isLoading || !address}
              >
                <span className='onboarding__option-title'>Derive from Wallet</span>
                <span className='onboarding__option-desc'>Sign a message to generate deterministic keys</span>
              </button>

              <button className='onboarding__option' type='button' onClick={handleGenerate} disabled={isLoading}>
                <span className='onboarding__option-title'>Generate New Keys</span>
                <span className='onboarding__option-desc'>Create random keys (you must back them up)</span>
              </button>

              <button className='onboarding__option' type='button' onClick={() => setStep('import')}>
                <span className='onboarding__option-title'>Import Existing Keys</span>
                <span className='onboarding__option-desc'>Paste your existing view/spend private keys</span>
              </button>
            </div>

            {!address && (
              <div className='onboarding__wallet-info'>
                <p className='onboarding__hint'>Optional: connect a wallet to use deterministic key derivation.</p>
                <WalletConnectPrompt />
              </div>
            )}
            {address && <p className='onboarding__connected'>Wallet connected: {truncateAddress(address)}</p>}
          </div>
        )}

        {step === 'import' && (
          <div className='onboarding__content'>
            <h2>Import Your Keys</h2>
            <p>Paste your existing private keys to import them.</p>

            <div className='field'>
              <label className='field__label' htmlFor='import-view'>
                View Private Key
              </label>
              <input
                className='field__input'
                id='import-view'
                type='password'
                placeholder='0x...'
                value={importViewKey}
                onChange={(e) => setImportViewKey(e.target.value)}
                autoComplete='off'
              />
            </div>

            <div className='field'>
              <label className='field__label' htmlFor='import-spend'>
                Spend Private Key
              </label>
              <input
                className='field__input'
                id='import-spend'
                type='password'
                placeholder='0x...'
                value={importSpendKey}
                onChange={(e) => setImportSpendKey(e.target.value)}
                autoComplete='off'
              />
            </div>

            <div className='onboarding__actions'>
              <button className='btn btn--primary' type='button' onClick={handleImport}>
                Continue
              </button>
              <button className='btn btn--ghost' type='button' onClick={() => setStep('method')}>
                Back
              </button>
            </div>
          </div>
        )}

        {step === 'password' && (
          <div className='onboarding__content'>
            <h2>Set Encryption Password</h2>
            <p>Your keys will be encrypted and stored locally. Choose a strong password.</p>

            <PasswordField
              value={password}
              onChange={setPassword}
              placeholder='At least 8 characters'
              autoComplete='new-password'
            />

            <PasswordField
              id='confirm-password'
              label='Confirm Password'
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder='Confirm your password'
              autoComplete='new-password'
            />

            <div className='onboarding__actions'>
              <button className='btn btn--primary' type='button' onClick={handleSaveKeys} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Keys'}
              </button>
              <button className='btn btn--ghost' type='button' onClick={() => setStep('method')} disabled={isLoading}>
                Back
              </button>
            </div>
          </div>
        )}

        {step === 'signing' && (
          <div className='onboarding__content'>
            <h2>Setup Signing Key (Optional)</h2>
            <p>
              A signing key is required to send messages. Generate one and fund it with ETH for gas fees. You can also
              set this up later in Settings.
            </p>

            <div className='onboarding__info'>
              <p className='onboarding__info-title'>Why do I need a signing key?</p>
              <p>
                To send messages onchain, you need to pay gas fees. Your browser wallet cannot send blob transactions
                (EIP-4844), so a separate signing key is required. You&apos;ll need to fund it with ETH.
              </p>
              <p>
                <strong>Privacy tip:</strong> The signing key is separate from your main wallet. You can fund it
                privately via{' '}
                <a href='https://privacypools.com' target='_blank' rel='noopener noreferrer'>
                  privacypools.com
                </a>{' '}
                so no third party can link it to your original address.
              </p>
            </div>

            {!pendingSigningKey && !signingAddress ? (
              <div className='onboarding__signing-setup'>
                <button className='btn btn--primary' type='button' onClick={handleGenerateSigningKey}>
                  Generate Signing Key
                </button>
              </div>
            ) : (
              <div className='onboarding__signing-info'>
                <div className='field'>
                  <span className='field__label'>Address</span>
                  <p className='field__value field__value--mono field__value--copyable'>
                    <span>{truncateAddress(pendingSigningKey?.address || signingAddress || '')}</span>
                    <button className='copy-icon-btn' type='button' onClick={handleCopyAddress} title='Copy address'>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </p>
                </div>

                <div className='field'>
                  <span className='field__label'>Balance</span>
                  <p className='field__value field__value--copyable'>
                    <span>{signingBalance !== null ? `${signingBalance} ETH` : '0 ETH'}</span>
                    <button
                      className='copy-icon-btn'
                      type='button'
                      onClick={handleRefreshBalance}
                      title='Refresh balance'
                    >
                      <RefreshCw size={14} />
                    </button>
                  </p>
                </div>
              </div>
            )}

            <div className='onboarding__actions'>
              <button className='btn btn--primary' type='button' onClick={handleContinue}>
                Continue
              </button>
              <button className='btn btn--ghost' type='button' onClick={() => setStep('password')}>
                Back
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className='onboarding__content'>
            <h2>Ready to Chat!</h2>
            <p>Your keys have been configured. You can now start sending and receiving messages.</p>
            <a className='btn btn--primary' href='/chat'>
              Start Chatting
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function WalletConnectPrompt() {
  const { connect, connectors, isPending } = useConnect();

  return (
    <div className='onboarding__connect'>
      <div className='onboarding__connect-buttons'>
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            className='btn btn--primary'
            type='button'
            onClick={() => connect({ connector })}
            disabled={isPending}
          >
            {isPending ? 'Connecting...' : `Connect ${connector.name}`}
          </button>
        ))}
      </div>
    </div>
  );
}
