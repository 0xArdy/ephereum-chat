import { useState } from 'react';
import { InternalLink } from '../../components/internal-link/InternalLink';
import { KeysPanel } from '../../components/keys-panel/KeysPanel';
import { PageHeader } from '../../components/page-header/PageHeader';
import { RegistryPanel } from '../../components/registry-panel/RegistryPanel';
import '../chat/chat-page.css';
import './settings-page.css';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'keys' | 'registry' | 'advanced'>('keys');

  return (
    <div className='chat-shell'>
      <PageHeader
        action={
          <InternalLink className='btn btn--ghost' href='/chat'>
            Back to chat
          </InternalLink>
        }
      />

      <div className='settings-page'>
        <header className='settings-page__header'>
          <div>
            <h1>Settings</h1>
            <p>Manage keys, signing, and optional wallet-based registry registration.</p>
          </div>
        </header>

        <div className='settings-tabs' role='tablist'>
          <button
            className={`settings-tabs__button ${activeTab === 'keys' ? 'settings-tabs__button--active' : ''}`}
            type='button'
            onClick={() => setActiveTab('keys')}
            aria-selected={activeTab === 'keys'}
            role='tab'
          >
            Keys
          </button>
          <button
            className={`settings-tabs__button ${activeTab === 'registry' ? 'settings-tabs__button--active' : ''}`}
            type='button'
            onClick={() => setActiveTab('registry')}
            aria-selected={activeTab === 'registry'}
            role='tab'
          >
            Registry (Optional)
          </button>
          <button
            className={`settings-tabs__button ${activeTab === 'advanced' ? 'settings-tabs__button--active' : ''}`}
            type='button'
            onClick={() => setActiveTab('advanced')}
            aria-selected={activeTab === 'advanced'}
            role='tab'
          >
            Advanced
          </button>
        </div>

        <div className='settings-page__content'>
          {activeTab === 'keys' && (
            <section className='settings-panel'>
              <KeysPanel />
            </section>
          )}

          {activeTab === 'registry' && (
            <section className='settings-panel'>
              <RegistryPanel />
            </section>
          )}

          {activeTab === 'advanced' && (
            <section className='settings-panel'>
              <h3>Advanced Settings</h3>
              <p>Fine-tune synchronization and network parameters.</p>

              <div className='settings-list'>
                <div className='settings-row'>
                  <div>
                    <p className='settings-row__label'>Network</p>
                    <p className='settings-row__value'>Sepolia testnet</p>
                  </div>
                  <span className='settings-row__tag'>Default</span>
                </div>

                <div className='settings-row'>
                  <div>
                    <p className='settings-row__label'>Blob retention</p>
                    <p className='settings-row__value'>~18 days</p>
                  </div>
                  <span className='settings-row__tag'>Ephemeral</span>
                </div>
              </div>

              <div className='settings-panel__section'>
                <h4>Security Info</h4>
                <div className='settings-list'>
                  <div className='settings-row'>
                    <div>
                      <p className='settings-row__label'>Key storage</p>
                      <p className='settings-row__value'>Encrypted in localStorage</p>
                    </div>
                    <span className='settings-row__tag'>AES-256-GCM</span>
                  </div>
                  <div className='settings-row'>
                    <div>
                      <p className='settings-row__label'>Content encryption</p>
                      <p className='settings-row__value'>secp256k1 ECDH + XChaCha20-Poly1305</p>
                    </div>
                    <span className='settings-row__tag'>E2E</span>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
