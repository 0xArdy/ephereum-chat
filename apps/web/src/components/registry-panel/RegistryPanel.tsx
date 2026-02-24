import { useAccount, useConnect, useDisconnect, useWriteContract } from 'wagmi';
import { useRegistry } from '../../hooks/useRegistry';
import { ERC6538_REGISTRY_ABI, ERC6538_REGISTRY_ADDRESS } from '../../modules/stealth/registry';
import { useSession } from '../../state/session-context';
import { formatTxHash, truncateString, formatAddress } from '../../utils';
import './registry-panel.css';

export function RegistryPanel() {
  const { metaAddress } = useSession();
  const { address, chain } = useAccount();
  const { connect, connectors, error: walletError, isPending: isWalletPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContract, data: registerHash, error: registerError, isPending: isRegistering } = useWriteContract();

  const {
    registryMetaAddress,
    latestRegistryEntry,
    isRegistryLoading,
    registryError,
    registryMatch,
    registryMismatch,
    registryStatus,
    refreshRegistry,
  } = useRegistry();

  function handleRegister() {
    if (!metaAddress) return;
    if (!address) return;

    writeContract({
      address: ERC6538_REGISTRY_ADDRESS,
      abi: ERC6538_REGISTRY_ABI,
      functionName: 'registerKeys',
      args: [BigInt(1), metaAddress as `0x${string}`],
    });
  }

  return (
    <section className='registry-panel'>
      <div className='registry-panel__header'>
        <h3>Registry (Optional)</h3>
        {address && (
          <span className={`chip ${registryMatch ? 'chip--success' : 'chip--neutral'}`}>
            {registryMatch ? 'Registered' : 'Not Registered'}
          </span>
        )}
      </div>

      <div className='registry-panel__content'>
        <p className='registry-panel__hint'>
          Register only if you want people to resolve your meta-address from your wallet address. Core messaging works
          without this.
        </p>

        <div className='registry-panel__wallet'>
          <p className='registry-panel__label'>Wallet (for registry writes)</p>
          {address ? (
            <div className='registry-panel__wallet-row'>
              <div>
                <p className='registry-panel__value'>{formatAddress(address)}</p>
                <p className='registry-panel__hint'>{chain?.name ?? 'Unknown network'}</p>
              </div>
              <button className='btn btn--ghost' type='button' onClick={() => disconnect()}>
                Disconnect
              </button>
            </div>
          ) : (
            <div className='registry-panel__connect'>
              {connectors.map((connector) => (
                <button
                  className='btn btn--ghost'
                  key={connector.uid}
                  type='button'
                  onClick={() => connect({ connector })}
                  disabled={isWalletPending}
                >
                  {isWalletPending ? `Connecting...` : `Connect ${connector.name}`}
                </button>
              ))}
            </div>
          )}
          {walletError && <p className='registry-panel__error'>{walletError.message}</p>}
        </div>

        {metaAddress && (
          <div className='registry-panel__meta'>
            <p className='registry-panel__label'>Your Meta-address</p>
            <p className='registry-panel__value registry-panel__value--mono'>{truncateString(metaAddress, 50)}</p>
          </div>
        )}

        {registryMetaAddress && (
          <div className='registry-panel__meta'>
            <p className='registry-panel__label'>
              {latestRegistryEntry ? 'Latest Registry Entry' : 'Registry Meta-address'}
            </p>
            <p className='registry-panel__value registry-panel__value--mono'>
              {truncateString(registryMetaAddress, 50)}
            </p>
          </div>
        )}

        <div className='registry-panel__actions'>
          <button
            className='btn btn--primary'
            type='button'
            onClick={handleRegister}
            disabled={!metaAddress || !address || isRegistering || registryMatch}
          >
            {isRegistering ? 'Registering...' : registryMatch ? 'Already Registered' : 'Register Meta-address'}
          </button>
          <button className='btn btn--ghost' type='button' onClick={refreshRegistry} disabled={isRegistryLoading}>
            {isRegistryLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {registerHash && (
          <a
            className='registry-panel__link'
            href={`https://sepolia.etherscan.io/tx/${registerHash}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            View transaction: {formatTxHash(registerHash)}
          </a>
        )}

        {registerError && <p className='registry-panel__error'>{registerError.message}</p>}
        {registryStatus && (
          <p className={registryMismatch || registryError ? 'registry-panel__error' : 'registry-panel__hint'}>
            {registryStatus}
          </p>
        )}
      </div>
    </section>
  );
}
