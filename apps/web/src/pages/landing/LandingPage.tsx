import './landing-page.css';

type LandingPageProps = {
  onEnterApp: () => void;
};

export function LandingPage({ onEnterApp }: LandingPageProps) {
  return (
    <div className='landing'>
      <header className='landing-hero'>
        <div className='landing-hero__nav'>
          <div>
            <p className='landing-hero__eyebrow'>Ephereum Chat</p>
            <p className='landing-hero__tagline'>Private, ephemeral messaging on Ethereum.</p>
          </div>
          <button className='btn btn--primary' type='button' onClick={onEnterApp}>
            Open Chat
          </button>
        </div>

        <div className='landing-hero__content'>
          <div className='landing-hero__text'>
            <h1>Send private messages that disappear with the chain.</h1>
            <p>
              Ephereum Chat encrypts your message content in the browser, stores it as an EIP-4844 blob, and notifies
              the recipient with a stealth announcement. No servers. No permanent history.
            </p>
            <div className='landing-hero__actions'>
              <button className='btn btn--primary' type='button' onClick={onEnterApp}>
                Start chatting
              </button>
              <a className='btn btn--ghost' href='#how-it-works'>
                How it works
              </a>
            </div>
            <div className='landing-hero__note'>
              <span>Sepolia testnet</span>
              <span>•</span>
              <span>No wallet required for core chat</span>
              <span>•</span>
              <span>Ephemeral by design (~18 days)</span>
            </div>
          </div>

          <div className='landing-hero__card'>
            <div className='landing-hero__card-header'>
              <p>Workflow</p>
              <span className='chip chip--success'>Encrypted</span>
            </div>
            <ol className='landing-hero__steps'>
              <li>Generate or import stealth keys</li>
              <li>Encrypt message in your browser</li>
              <li>Send blob + announcement on-chain</li>
              <li>Recipient scans + decrypts</li>
              <li>Blob expires automatically</li>
            </ol>
          </div>
        </div>
      </header>

      <section className='landing-section' id='how-it-works'>
        <div className='landing-section__header'>
          <h2>How it works</h2>
          <p>Stealth messaging with on-chain delivery and zero server trust.</p>
        </div>
        <div className='landing-grid'>
          <article className='landing-card'>
            <h3>Stealth identity</h3>
            <p>Share your meta-address directly, or register it optionally for wallet-address discovery.</p>
          </article>
          <article className='landing-card'>
            <h3>Client-side encryption</h3>
            <p>Your message is encrypted using ECDH before it ever leaves the browser.</p>
          </article>
          <article className='landing-card'>
            <h3>Ephemeral storage</h3>
            <p>Messages live inside EIP-4844 blobs and expire automatically after the blob window.</p>
          </article>
          <article className='landing-card'>
            <h3>Stealth announcements</h3>
            <p>Recipients scan announcements and only their keys can decrypt the payload.</p>
          </article>
        </div>
      </section>

      <section className='landing-section'>
        <div className='landing-section__header'>
          <h2>Why it matters</h2>
          <p>Designed for privacy, speed, and minimal operational overhead.</p>
        </div>
        <div className='landing-grid landing-grid--benefits'>
          <article className='landing-card'>
            <h3>No central server</h3>
            <p>Everything is on-chain. There is no backend to trust or compromise.</p>
          </article>
          <article className='landing-card'>
            <h3>Short-lived by default</h3>
            <p>Messages disappear with blob expiry — no indefinite archives.</p>
          </article>
          <article className='landing-card'>
            <h3>Recipient-only content</h3>
            <p>Only the recipient&apos;s view key can decrypt the message content.</p>
          </article>
          <article className='landing-card'>
            <h3>Minimal UX overhead</h3>
            <p>Login once, sync your inbox, and send in a single flow.</p>
          </article>
        </div>
      </section>

      <section className='landing-section landing-cta'>
        <div>
          <h2>Ready to try Ephereum Chat?</h2>
          <p>Open the inbox to send and receive ephemeral encrypted messages.</p>
        </div>
        <button className='btn btn--primary' type='button' onClick={onEnterApp}>
          Launch Chat
        </button>
      </section>
    </div>
  );
}
