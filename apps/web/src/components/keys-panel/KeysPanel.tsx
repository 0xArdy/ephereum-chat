import { useCallback, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { useAccount, useSignMessage } from 'wagmi';
import { deriveKeysFromSignature, generateNewKeys, importKeys, SIGNATURE_MESSAGE } from '../../modules/keys/derivation';
import { loadKeys } from '../../modules/keys/storage';
import { useSession } from '../../state/session-context';
import { toUserErrorMessage, truncateString } from '../../utils';
import './keys-panel.css';

type KeysPanelProps = {
  onLock?: () => void;
};

type ModalType =
  | 'derive'
  | 'import'
  | 'generate'
  | 'export'
  | 'clear-keys'
  | 'signing-generate'
  | 'signing-import'
  | 'signing-backup'
  | 'signing-remove'
  | null;

export function KeysPanel({ onLock }: KeysPanelProps) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const {
    sessionReady,
    metaAddress,
    derivationMethod,
    lockSession,
    clearStoredKeys,
    saveKeys,
    signingPrivKey,
    signingAddress,
    signingBalance,
    hasSigningKey,
    generateSigningKey,
    saveSigningKey,
    importSigningKey,
    clearSigningKey,
    refreshSigningBalance,
  } = useSession();

  const [showModal, setShowModal] = useState<ModalType>(null);
  const [importViewKey, setImportViewKey] = useState('');
  const [importSpendKey, setImportSpendKey] = useState('');
  const [importSigningKeyInput, setImportSigningKeyInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedMeta, setCopiedMeta] = useState(false);
  const [copiedSigningKey, setCopiedSigningKey] = useState(false);
  const [isSigningKeyRevealed, setIsSigningKeyRevealed] = useState(false);

  const handleCloseModal = useCallback(() => {
    setShowModal(null);
    setImportViewKey('');
    setImportSpendKey('');
    setImportSigningKeyInput('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setIsLoading(false);
    setIsSigningKeyRevealed(false);
    setCopiedSigningKey(false);
  }, []);

  const saveKeysWithPassword = useCallback(
    async (keys: ReturnType<typeof deriveKeysFromSignature>, method: 'signature' | 'imported' | 'generated') => {
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
        await saveKeys(keys, method, password);
      } catch (err) {
        const message = toUserErrorMessage(err, 'Failed to save keys.');
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [password, confirmPassword, saveKeys],
  );

  const handleDerive = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    setError('');

    try {
      const signature = await signMessageAsync({ message: SIGNATURE_MESSAGE });
      const keys = deriveKeysFromSignature(signature);
      await saveKeysWithPassword(keys, 'signature');
      handleCloseModal();
    } catch (err) {
      const message = toUserErrorMessage(err, 'Failed to derive keys.');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [address, signMessageAsync, saveKeysWithPassword, handleCloseModal]);

  const handleImport = useCallback(async () => {
    setError('');

    const keys = importKeys(importViewKey, importSpendKey);
    if (!keys) {
      setError('Invalid private keys. Keys must be 66-character hex strings starting with 0x.');
      return;
    }

    await saveKeysWithPassword(keys, 'imported');
    handleCloseModal();
  }, [importViewKey, importSpendKey, saveKeysWithPassword, handleCloseModal]);

  const handleGenerate = useCallback(async () => {
    const keys = generateNewKeys();
    await saveKeysWithPassword(keys, 'generated');
    handleCloseModal();
  }, [saveKeysWithPassword, handleCloseModal]);

  const handleExport = useCallback(async () => {
    if (password.length < 1) {
      setError('Enter your password to export keys.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const bundle = await loadKeys(password);
      if (!bundle) {
        setError('Invalid password.');
        return;
      }

      const data = {
        viewPrivKey: bundle.viewPrivKey,
        spendPrivKey: bundle.spendPrivKey,
        signingPrivKey: bundle.signingPrivKey ?? null,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ephereum-keys-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      handleCloseModal();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to export keys.'));
    } finally {
      setIsLoading(false);
    }
  }, [password, handleCloseModal]);

  const handleClearKeys = useCallback(() => {
    setError('');
    setShowModal('clear-keys');
  }, []);

  const handleConfirmClearKeys = useCallback(() => {
    clearStoredKeys();
    handleCloseModal();
    onLock?.();
  }, [clearStoredKeys, handleCloseModal, onLock]);

  const handleLock = useCallback(() => {
    lockSession();
    onLock?.();
  }, [lockSession, onLock]);

  const handleGenerateSigningKey = useCallback(async () => {
    if (password.length < 1) {
      setError('Enter your password to save the signing key.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const signingKey = generateSigningKey();
      await saveSigningKey(signingKey, password);
      handleCloseModal();
    } catch (err) {
      const message = toUserErrorMessage(err, 'Failed to save signing key.');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [password, generateSigningKey, saveSigningKey, handleCloseModal]);

  const handleImportSigningKey = useCallback(async () => {
    if (password.length < 1) {
      setError('Enter your password to save the signing key.');
      return;
    }

    const signingKey = importSigningKey(importSigningKeyInput);
    if (!signingKey) {
      setError('Invalid private key. Must be a 66-character hex string starting with 0x.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await saveSigningKey(signingKey, password);
      handleCloseModal();
    } catch (err) {
      const message = toUserErrorMessage(err, 'Failed to save signing key.');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [password, importSigningKeyInput, importSigningKey, saveSigningKey, handleCloseModal]);

  const handleClearSigningKey = useCallback(() => {
    setError('');
    setShowModal('signing-remove');
  }, []);

  const handleConfirmClearSigningKey = useCallback(async () => {
    if (password.length < 1) {
      setError('Enter your password to remove the signing key.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await clearSigningKey(password);
      handleCloseModal();
    } catch (err) {
      const message = toUserErrorMessage(err, 'Failed to clear signing key.');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [password, clearSigningKey, handleCloseModal]);

  const handleRefreshBalance = useCallback(() => {
    void refreshSigningBalance();
  }, [refreshSigningBalance]);

  const handleCopyAddress = useCallback(() => {
    if (!signingAddress) return;
    void navigator.clipboard.writeText(signingAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [signingAddress]);

  const handleCopyMetaAddress = useCallback(() => {
    if (!metaAddress) return;
    void navigator.clipboard.writeText(metaAddress).then(() => {
      setCopiedMeta(true);
      setTimeout(() => setCopiedMeta(false), 1500);
    });
  }, [metaAddress]);

  const handleRevealSigningKey = useCallback(async () => {
    if (password.length < 1) {
      setError('Enter your password to reveal the signing key.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const bundle = await loadKeys(password);
      if (!bundle) {
        setError('Invalid password.');
        return;
      }
      if (!bundle.signingPrivKey) {
        setError('No signing key is stored.');
        return;
      }
      setIsSigningKeyRevealed(true);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to verify password.'));
    } finally {
      setIsLoading(false);
    }
  }, [password]);

  const handleCopySigningKey = useCallback(() => {
    if (!signingPrivKey || !isSigningKeyRevealed) return;
    void navigator.clipboard.writeText(signingPrivKey).then(() => {
      setCopiedSigningKey(true);
      setTimeout(() => setCopiedSigningKey(false), 1500);
    });
  }, [isSigningKeyRevealed, signingPrivKey]);

  const methodLabel = {
    signature: 'Derived from wallet signature',
    imported: 'Imported manually',
    generated: 'Randomly generated',
  };

  return (
    <section className='keys-panel'>
      <div className='keys-panel__header'>
        <h3>Stealth Keys</h3>
        <span className={`chip ${sessionReady ? 'chip--success' : 'chip--warning'}`}>
          {sessionReady ? 'Active' : 'Not Set'}
        </span>
      </div>

      {sessionReady ? (
        <div className='keys-panel__content'>
          <div className='keys-panel__meta'>
            <p className='keys-panel__label'>Meta-address</p>
            <p className='keys-panel__value keys-panel__value--mono keys-panel__value--copyable'>
              <span>{metaAddress ? truncateString(metaAddress, 40) : '—'}</span>
              {metaAddress && (
                <button
                  className='copy-icon-btn'
                  type='button'
                  onClick={handleCopyMetaAddress}
                  title='Copy meta-address'
                >
                  {copiedMeta ? <Check size={14} /> : <Copy size={14} />}
                </button>
              )}
            </p>
          </div>

          <div className='keys-panel__meta'>
            <p className='keys-panel__label'>Method</p>
            <p className='keys-panel__value'>{derivationMethod ? methodLabel[derivationMethod] : 'Unknown'}</p>
          </div>

          <div className='keys-panel__actions'>
            <button className='btn btn--ghost' type='button' onClick={handleLock}>
              Lock Session
            </button>
            <button className='btn btn--ghost' type='button' onClick={() => setShowModal('export')}>
              Export Keys
            </button>
            <button className='btn btn--danger-outline' type='button' onClick={handleClearKeys}>
              Clear Keys
            </button>
          </div>
        </div>
      ) : (
        <div className='keys-panel__setup'>
          <p>Set up your keys to start sending and receiving messages.</p>

          <div className='keys-panel__options'>
            <button
              className='keys-panel__option'
              type='button'
              onClick={() => setShowModal('derive')}
              disabled={!address}
            >
              <span className='keys-panel__option-title'>Derive from Wallet</span>
              <span className='keys-panel__option-desc'>Sign a message to generate keys</span>
            </button>

            <button className='keys-panel__option' type='button' onClick={() => setShowModal('generate')}>
              <span className='keys-panel__option-title'>Generate New Keys</span>
              <span className='keys-panel__option-desc'>Create random keys</span>
            </button>

            <button className='keys-panel__option' type='button' onClick={() => setShowModal('import')}>
              <span className='keys-panel__option-title'>Import Keys</span>
              <span className='keys-panel__option-desc'>Paste existing keys</span>
            </button>
          </div>
        </div>
      )}

      <div className='keys-panel__divider' />

      <div className='keys-panel__header'>
        <h3>Signing Key</h3>
        <span className={`chip ${hasSigningKey ? 'chip--success' : 'chip--warning'}`}>
          {hasSigningKey ? 'Active' : 'Not Set'}
        </span>
      </div>

      {hasSigningKey && signingAddress ? (
        <div className='keys-panel__content'>
          <div className='keys-panel__meta'>
            <p className='keys-panel__label'>Address</p>
            <p className='keys-panel__value keys-panel__value--mono keys-panel__value--copyable'>
              <span>{truncateString(signingAddress, 16)}</span>
              <button className='copy-icon-btn' type='button' onClick={handleCopyAddress} title='Copy address'>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </p>
          </div>

          <div className='keys-panel__meta'>
            <p className='keys-panel__label'>Balance</p>
            <p className='keys-panel__value keys-panel__value--copyable'>
              <span>{signingBalance !== null ? `${signingBalance} ETH` : 'Unknown'}</span>
              <button className='copy-icon-btn' type='button' onClick={handleRefreshBalance} title='Refresh balance'>
                <RefreshCw size={14} />
              </button>
            </p>
          </div>

          <div className='keys-panel__actions'>
            <button className='btn btn--ghost' type='button' onClick={() => setShowModal('signing-backup')}>
              Backup Signing Key
            </button>
            <button className='btn btn--danger-outline' type='button' onClick={handleClearSigningKey}>
              Remove Signing Key
            </button>
          </div>
        </div>
      ) : (
        <div className='keys-panel__setup'>
          <p>A signing key is required to send messages. Generate or import one below.</p>

          <div className='keys-panel__info'>
            <p className='keys-panel__info-title'>Why do I need a signing key?</p>
            <p>
              To send messages onchain, you need to pay gas fees. Your browser wallet cannot send blob transactions
              (EIP-4844), so a separate signing key is required. You&apos;ll need to fund it with ETH.
            </p>
            <p>
              <strong>Privacy tip:</strong> The signing key is derived from your meta-address, making it a stealth
              address. You can fund it privately via{' '}
              <a href='https://privacypools.com' target='_blank' rel='noopener noreferrer'>
                privacypools.com
              </a>{' '}
              so no third party can link it to your original address.
            </p>
          </div>

          <div className='keys-panel__options'>
            <button className='keys-panel__option' type='button' onClick={() => setShowModal('signing-generate')}>
              <span className='keys-panel__option-title'>Generate Signing Key</span>
              <span className='keys-panel__option-desc'>Create a new key for signing transactions</span>
            </button>

            <button className='keys-panel__option' type='button' onClick={() => setShowModal('signing-import')}>
              <span className='keys-panel__option-title'>Import Signing Key</span>
              <span className='keys-panel__option-desc'>Use an existing private key</span>
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className='keys-modal'>
          <div className='keys-modal__content'>
            <div className='keys-modal__header'>
              <h3>
                {showModal === 'derive' && 'Derive Keys from Wallet'}
                {showModal === 'import' && 'Import Keys'}
                {showModal === 'generate' && 'Generate New Keys'}
                {showModal === 'export' && 'Export Keys'}
                {showModal === 'clear-keys' && 'Clear All Keys'}
                {showModal === 'signing-generate' && 'Generate Signing Key'}
                {showModal === 'signing-import' && 'Import Signing Key'}
                {showModal === 'signing-backup' && 'Backup Signing Key'}
                {showModal === 'signing-remove' && 'Remove Signing Key'}
              </h3>
              <button className='keys-modal__close' type='button' onClick={handleCloseModal}>
                ×
              </button>
            </div>

            {error && <p className='keys-modal__error'>{error}</p>}

            {showModal === 'derive' && (
              <div className='keys-modal__body'>
                <p>Sign a message with your wallet to derive your keys deterministically.</p>
                <div className='keys-modal__actions'>
                  <button className='btn btn--primary' type='button' onClick={handleDerive} disabled={isLoading}>
                    {isLoading ? 'Signing...' : 'Sign & Derive'}
                  </button>
                </div>
              </div>
            )}

            {showModal === 'import' && (
              <div className='keys-modal__body'>
                <div className='field'>
                  <label className='field__label' htmlFor='import-view-key'>
                    View Private Key
                  </label>
                  <input
                    className='field__input'
                    id='import-view-key'
                    type='password'
                    placeholder='0x...'
                    value={importViewKey}
                    onChange={(e) => setImportViewKey(e.target.value)}
                    autoComplete='off'
                  />
                </div>

                <div className='field'>
                  <label className='field__label' htmlFor='import-spend-key'>
                    Spend Private Key
                  </label>
                  <input
                    className='field__input'
                    id='import-spend-key'
                    type='password'
                    placeholder='0x...'
                    value={importSpendKey}
                    onChange={(e) => setImportSpendKey(e.target.value)}
                    autoComplete='off'
                  />
                </div>

                <PasswordFields
                  password={password}
                  setPassword={setPassword}
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                />

                <div className='keys-modal__actions'>
                  <button className='btn btn--primary' type='button' onClick={handleImport} disabled={isLoading}>
                    {isLoading ? 'Importing...' : 'Import Keys'}
                  </button>
                </div>
              </div>
            )}

            {showModal === 'generate' && (
              <div className='keys-modal__body'>
                <p>Generate new random keys. Make sure to export and back them up!</p>

                <PasswordFields
                  password={password}
                  setPassword={setPassword}
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                />

                <div className='keys-modal__actions'>
                  <button className='btn btn--primary' type='button' onClick={handleGenerate} disabled={isLoading}>
                    {isLoading ? 'Generating...' : 'Generate & Save'}
                  </button>
                </div>
              </div>
            )}

            {showModal === 'export' && (
              <div className='keys-modal__body'>
                <p>Export your keys as a JSON file. Keep this file secure!</p>
                <p className='keys-modal__warning'>Warning: This file contains your private keys in plain text.</p>
                <div className='field'>
                  <label className='field__label' htmlFor='export-password'>
                    Password
                  </label>
                  <input
                    className='field__input'
                    id='export-password'
                    type='password'
                    placeholder='Enter your encryption password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete='off'
                  />
                </div>
                <div className='keys-modal__actions'>
                  <button className='btn btn--primary' type='button' onClick={handleExport} disabled={isLoading}>
                    {isLoading ? 'Verifying...' : 'Verify & Download JSON'}
                  </button>
                </div>
              </div>
            )}

            {showModal === 'clear-keys' && (
              <div className='keys-modal__body'>
                <p>Clear all locally stored keys and reset this device session?</p>
                <p className='keys-modal__warning'>Warning: This action cannot be undone.</p>
                <div className='keys-modal__actions'>
                  <button className='btn btn--danger-outline' type='button' onClick={handleConfirmClearKeys}>
                    Clear All Keys
                  </button>
                  <button className='btn btn--ghost' type='button' onClick={handleCloseModal}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {showModal === 'signing-generate' && (
              <div className='keys-modal__body'>
                <p>Generate a new signing key for sending messages. Enter your password to save it.</p>

                <div className='field'>
                  <label className='field__label' htmlFor='signing-password'>
                    Password
                  </label>
                  <input
                    className='field__input'
                    id='signing-password'
                    type='password'
                    placeholder='Your encryption password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete='off'
                  />
                </div>

                <div className='keys-modal__actions'>
                  <button
                    className='btn btn--primary'
                    type='button'
                    onClick={handleGenerateSigningKey}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Generating...' : 'Generate & Save'}
                  </button>
                </div>
              </div>
            )}

            {showModal === 'signing-import' && (
              <div className='keys-modal__body'>
                <p>Import an existing private key to use for signing transactions.</p>

                <div className='field'>
                  <label className='field__label' htmlFor='import-signing-key'>
                    Private Key
                  </label>
                  <input
                    className='field__input'
                    id='import-signing-key'
                    type='password'
                    placeholder='0x...'
                    value={importSigningKeyInput}
                    onChange={(e) => setImportSigningKeyInput(e.target.value)}
                    autoComplete='off'
                  />
                </div>

                <div className='field'>
                  <label className='field__label' htmlFor='signing-import-password'>
                    Password
                  </label>
                  <input
                    className='field__input'
                    id='signing-import-password'
                    type='password'
                    placeholder='Your encryption password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete='off'
                  />
                </div>

                <div className='keys-modal__actions'>
                  <button
                    className='btn btn--primary'
                    type='button'
                    onClick={handleImportSigningKey}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Importing...' : 'Import Key'}
                  </button>
                </div>
              </div>
            )}

            {showModal === 'signing-backup' && (
              <div className='keys-modal__body'>
                <p>Copy your signing private key. Keep it secure!</p>
                <p className='keys-modal__warning'>Warning: Anyone with this key can control your signing address.</p>

                <div className='field'>
                  <label className='field__label' htmlFor='backup-signing-password'>
                    Password
                  </label>
                  <input
                    className='field__input'
                    id='backup-signing-password'
                    type='password'
                    placeholder='Enter your encryption password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete='off'
                  />
                </div>

                <div className='field'>
                  <label className='field__label' htmlFor='backup-signing-key'>
                    Private Key
                  </label>
                  <div className='keys-modal__copy-field'>
                    <code className='keys-modal__code'>
                      {isSigningKeyRevealed ? signingPrivKey || '—' : maskPrivateKey(signingPrivKey)}
                    </code>
                    <button
                      className='btn btn--ghost'
                      type='button'
                      onClick={handleCopySigningKey}
                      disabled={!signingPrivKey || !isSigningKeyRevealed}
                    >
                      {copiedSigningKey ? <Check size={16} /> : <Copy size={16} />}
                      {copiedSigningKey ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className='keys-modal__actions'>
                  {!isSigningKeyRevealed && (
                    <button
                      className='btn btn--primary'
                      type='button'
                      onClick={handleRevealSigningKey}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Verifying...' : 'Verify & Reveal'}
                    </button>
                  )}
                  <button className='btn btn--primary' type='button' onClick={handleCloseModal}>
                    Done
                  </button>
                </div>
              </div>
            )}

            {showModal === 'signing-remove' && (
              <div className='keys-modal__body'>
                <p>Remove the signing key from encrypted local storage.</p>
                <p className='keys-modal__warning'>You must enter your password to confirm.</p>

                <div className='field'>
                  <label className='field__label' htmlFor='remove-signing-password'>
                    Password
                  </label>
                  <input
                    className='field__input'
                    id='remove-signing-password'
                    type='password'
                    placeholder='Enter your encryption password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete='off'
                  />
                </div>

                <div className='keys-modal__actions'>
                  <button
                    className='btn btn--danger-outline'
                    type='button'
                    onClick={handleConfirmClearSigningKey}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Removing...' : 'Remove Signing Key'}
                  </button>
                  <button className='btn btn--ghost' type='button' onClick={handleCloseModal}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function maskPrivateKey(privateKey: string | null) {
  if (!privateKey) return '—';
  const visiblePrefix = privateKey.slice(0, 6);
  const visibleSuffix = privateKey.slice(-4);
  return `${visiblePrefix}••••••••••••••••••••••••••••••••••${visibleSuffix}`;
}

function PasswordFields({
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
}: {
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
}) {
  return (
    <>
      <div className='field'>
        <label className='field__label' htmlFor='new-password'>
          Password
        </label>
        <input
          className='field__input'
          id='new-password'
          type='password'
          placeholder='At least 8 characters'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete='new-password'
        />
      </div>

      <div className='field'>
        <label className='field__label' htmlFor='confirm-password'>
          Confirm Password
        </label>
        <input
          className='field__input'
          id='confirm-password'
          type='password'
          placeholder='Confirm your password'
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete='new-password'
        />
      </div>
    </>
  );
}
