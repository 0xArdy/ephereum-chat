import { useCallback, useState } from 'react';
import { PasswordField } from '../../components/password-field/PasswordField';
import { useSession } from '../../state/session-context';
import './unlock-page.css';

type UnlockPageProps = {
  onSuccess?: () => void;
  onForgot?: () => void;
};

export function UnlockPage({ onSuccess, onForgot }: UnlockPageProps) {
  const { unlockSession, clearStoredKeys } = useSession();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleUnlock = useCallback(async () => {
    if (!password) {
      setError('Enter your password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const success = await unlockSession(password);
      if (!success) {
        setError('Incorrect password');
      } else {
        onSuccess?.();
      }
    } catch {
      setError('Failed to unlock');
    } finally {
      setIsLoading(false);
    }
  }, [password, unlockSession, onSuccess]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        void handleUnlock();
      }
    },
    [handleUnlock],
  );

  const handleForgotPassword = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const handleConfirmClear = useCallback(() => {
    clearStoredKeys();
    onForgot?.();
  }, [clearStoredKeys, onForgot]);

  const handleCancel = useCallback(() => {
    setShowConfirm(false);
  }, []);

  return (
    <div className='unlock'>
      <div className='unlock__card'>
        <header className='unlock__header'>
          <h1>Ephereum Chat</h1>
          <p>Your keys are locked</p>
        </header>

        {showConfirm ? (
          <div className='unlock__content'>
            <p className='unlock__warning'>This will delete your stored keys. You will need to set up new keys.</p>
            <p className='unlock__hint'>Make sure you have a backup if you want to recover your messages.</p>
            <div className='unlock__actions'>
              <button className='btn btn--danger' type='button' onClick={handleConfirmClear}>
                Delete Keys
              </button>
              <button className='btn btn--ghost' type='button' onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className='unlock__content'>
            <p>Enter your password to unlock your keys.</p>

            <PasswordField
              value={password}
              onChange={setPassword}
              placeholder='Enter your password'
              onKeyDown={handleKeyDown}
              autoComplete='current-password'
            />

            {error && <p className='unlock__error'>{error}</p>}

            <button className='btn btn--primary' type='button' onClick={handleUnlock} disabled={isLoading}>
              {isLoading ? 'Unlocking...' : 'Unlock'}
            </button>

            <button className='btn btn--link' type='button' onClick={handleForgotPassword}>
              Forgot my password
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
