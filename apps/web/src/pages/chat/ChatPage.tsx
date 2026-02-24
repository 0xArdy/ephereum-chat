import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { createWalletClient, http, isAddress, parseGwei, toBlobs, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { useAccount } from 'wagmi';
import { InternalLink } from '../../components/internal-link/InternalLink';
import { PageHeader } from '../../components/page-header/PageHeader';
import { useChatSync } from '../../hooks';
import { getKzg } from '../../modules/blob/kzg';
import { encodeBlobPayload, getBlobPayloadHash } from '../../modules/blob/payload';
import { encodeAnnouncementMetadata } from '../../modules/messages/metadata';
import { buildMessagePayload, encryptMessagePayload } from '../../modules/messages/payload';
import { announcerConfig, encodeAnnouncementCalldata } from '../../modules/stealth/announcer';
import { isValidMetaAddress, normalizeMetaAddress, parseMetaAddress } from '../../modules/stealth/meta-address';
import { getLatestMetaAddressFromLogs, getStealthMetaAddress } from '../../modules/stealth/registry';
import { getSenderStealthAddress } from '../../modules/stealth/stealth';
import { useSession } from '../../state/session-context';
import {
  compareChatMessagesByChainAsc,
  compareChatMessagesByChainDesc,
  formatTxHash,
  truncateAddress,
  formatAddress,
  isLikelyAddress,
  formatRelativeTime,
  formatShortTime,
  formatTimestamp,
  getExplorerTxUrl,
  getSentMessagesFromLogs,
  toUserErrorMessage,
  type ChatMessage,
} from '../../utils';
import { RPC_URL } from '../../wagmi';
import './chat-page.css';

const MIN_SIGNING_BALANCE = 0.001;

export function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [recipient, setRecipient] = useState('');
  const [threadLabel, setThreadLabel] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sendError, setSendError] = useState('');
  const [composerStatus, setComposerStatus] = useState('');
  const [composerTxHash, setComposerTxHash] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sentLogMessages, setSentLogMessages] = useState<ChatMessage[]>([]);
  const [sentLogError, setSentLogError] = useState<string | null>(null);
  const [isSentLogLoading, setIsSentLogLoading] = useState(false);
  const sentLogFetchInFlightRef = useRef(false);
  const lastSentSyncedBlockRef = useRef<bigint | null>(null);

  const { address } = useAccount();
  const {
    viewPrivKey,
    spendPrivKey,
    viewPubKey,
    spendPubKey,
    schemeId,
    sessionReady,
    signingPrivKey,
    signingAddress,
    signingBalance,
    hasSigningKey,
    refreshSigningBalance,
  } = useSession();
  const signingAccount = useMemo(() => getSigningAccount(signingPrivKey), [signingPrivKey]);

  const {
    messages: inboundMessages,
    status: syncStatus,
    syncNow,
  } = useChatSync({
    viewPrivKey: viewPrivKey as `0x${string}`,
    spendPrivKey: spendPrivKey as `0x${string}`,
    viewPubKey,
    spendPubKey,
    enabled: sessionReady,
    onSyncComplete: refreshSigningBalance,
  });

  const [outboundMessages, setOutboundMessages] = useState<ChatMessage[]>([]);
  const messages = useMemo(
    () => mergeMessages(outboundMessages, sentLogMessages, inboundMessages),
    [inboundMessages, outboundMessages, sentLogMessages],
  );
  const sortedMessages = useMemo(() => [...messages].sort(compareChatMessagesByChainDesc), [messages]);
  const selectedMessage = useMemo(() => {
    if (!sortedMessages.length) return null;
    return sortedMessages.find((message) => message.id === selectedMessageId) ?? sortedMessages[0];
  }, [selectedMessageId, sortedMessages]);

  useEffect(() => {
    if (!sortedMessages.length) {
      setSelectedMessageId(null);
      return;
    }

    if (!selectedMessageId || !sortedMessages.some((message) => message.id === selectedMessageId)) {
      setSelectedMessageId(sortedMessages[0].id);
    }
  }, [selectedMessageId, sortedMessages]);

  const senderAddresses = useMemo(() => {
    const list: Address[] = [];
    if (address) list.push(address);
    if (signingAddress && (!address || signingAddress.toLowerCase() !== address.toLowerCase())) {
      list.push(signingAddress);
    }
    return list;
  }, [address, signingAddress]);

  const fetchSentMessages = useCallback(
    async ({
      senderAddresses: addresses,
      resetCheckpoint = false,
    }: {
      senderAddresses: Address[];
      resetCheckpoint?: boolean;
    }) => {
      if (!addresses.length) return;
      if (sentLogFetchInFlightRef.current) return;

      sentLogFetchInFlightRef.current = true;
      setIsSentLogLoading(true);
      setSentLogError(null);

      if (resetCheckpoint) {
        lastSentSyncedBlockRef.current = null;
      }

      const fromBlock = lastSentSyncedBlockRef.current !== null ? lastSentSyncedBlockRef.current + 1n : 0n;

      try {
        const { messages: messagesFromLogs, latestBlock } = await getSentMessagesFromLogs({
          senderAddresses: addresses,
          fromBlock,
        });

        setSentLogMessages((prev) => mergeMessages(prev, messagesFromLogs));

        if (latestBlock !== null) {
          const current = lastSentSyncedBlockRef.current;
          lastSentSyncedBlockRef.current = current === null || latestBlock > current ? latestBlock : current;
        }

        if (messagesFromLogs.length) {
          const payloadHashes = new Set(
            messagesFromLogs.map((message) => message.payloadHash).filter(Boolean) as string[],
          );
          const txHashes = new Set(messagesFromLogs.map((message) => message.transactionHash));
          setOutboundMessages((prev) =>
            prev.filter((message) => {
              if (message.payloadHash && payloadHashes.has(message.payloadHash)) return false;
              return !txHashes.has(message.transactionHash);
            }),
          );
        }
      } catch (error: unknown) {
        const message = toUserErrorMessage(error, 'Failed to load sent messages.');
        setSentLogError(message);
      } finally {
        sentLogFetchInFlightRef.current = false;
        setIsSentLogLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!senderAddresses.length) {
      setSentLogMessages([]);
      setSentLogError(null);
      setIsSentLogLoading(false);
      lastSentSyncedBlockRef.current = null;
      return;
    }

    setSentLogMessages([]);
    void fetchSentMessages({ senderAddresses, resetCheckpoint: true });
  }, [fetchSentMessages, senderAddresses]);

  async function handleSend() {
    if (!recipient.trim()) {
      setSendError('Add a recipient meta-address or wallet address.');
      return;
    }
    if (!messageText.trim()) {
      setSendError('Write a message to send.');
      return;
    }

    if (!hasSigningKey || !signingAccount) {
      setSendError('No signing key configured. Go to Settings → Keys to set one up.');
      return;
    }

    setIsSending(true);
    setSendError('');
    setComposerStatus('');
    setComposerTxHash(null);

    try {
      const resolvedMetaAddress = await resolveRecipientMetaAddress({
        raw: recipient.trim(),
        schemeId: schemeId.trim(),
      });
      const parsedMeta = parseMetaAddress({ raw: resolvedMetaAddress });
      const threadId = threadLabel.trim() || 'No subject';
      const payload = buildMessagePayload({
        content: messageText.trim(),
        threadId,
      });

      const stealth = await getSenderStealthAddress({ metaAddress: resolvedMetaAddress });
      const encrypted = await encryptMessagePayload({
        ephemPrivKey: stealth.ephemPrivKey,
        viewPubKey: parsedMeta.viewPubKey as `0x${string}`,
        payload,
      });
      const blobHex = encodeBlobPayload({ nonce: encrypted.nonce, ciphertext: encrypted.ciphertext });
      const payloadHash = getBlobPayloadHash({ hex: blobHex });
      const metadataThreadId = payloadHash ? `enc:${payloadHash}` : 'enc';
      const metadata = encodeAnnouncementMetadata({
        metadata: {
          version: 'v1',
          payloadHash,
        },
      });
      const calldata = encodeAnnouncementCalldata({
        stealthAddress: stealth.stealthAddress,
        ephemPubKey: stealth.ephemPubKey,
        viewTag: stealth.viewTag,
        metadata,
      });

      const kzg = await getKzg();
      const blobs = toBlobs({ data: blobHex as `0x${string}` });

      const client = createWalletClient({
        account: signingAccount,
        chain: sepolia,
        transport: http(RPC_URL),
      });
      const txHash = await client.sendTransaction({
        account: signingAccount,
        to: announcerConfig.address,
        data: calldata as `0x${string}`,
        blobs,
        kzg,
        maxFeePerBlobGas: parseGwei('30'),
      });

      const outboundId = payloadHash ?? `${txHash}-sent`;
      const outbound: ChatMessage = {
        id: outboundId,
        threadId: metadataThreadId,
        content: 'Loading encrypted payload...',
        createdAt: Date.now(),
        direction: 'outbound',
        transactionHash: txHash,
        recipient: resolvedMetaAddress,
        sender: signingAccount.address,
        contentAvailable: false,
        payloadHash,
      };

      setOutboundMessages((prev) => mergeMessages([outbound], prev));
      setSelectedMessageId(outbound.id);
      setComposerStatus('Message sent');
      setComposerTxHash(txHash);
      setMessageText('');
      setThreadLabel('');
      void fetchSentMessages({ senderAddresses });
    } catch (error) {
      const fallback =
        error instanceof Error && error.message.trim().length > 0 ? error.message : 'Failed to send message.';
      const message = toUserErrorMessage(error, fallback);
      setSendError(message);
    } finally {
      setIsSending(false);
    }
  }

  const syncDetail = syncStatus.lastSyncedAt
    ? `Last sync ${formatRelativeTime(syncStatus.lastSyncedAt)}`
    : 'Not synced';
  const canSend = Boolean(recipient.trim()) && Boolean(messageText.trim()) && hasSigningKey && Boolean(signingAccount);
  const hasLowBalance = signingBalance !== null && parseFloat(signingBalance) < MIN_SIGNING_BALANCE;

  function handleRefresh() {
    void syncNow();
    void fetchSentMessages({ senderAddresses });
  }

  return (
    <div className='chat-shell'>
      <PageHeader
        menuButton={
          <button className='chat-shell__toggle' type='button' onClick={() => setIsSidebarOpen(true)}>
            Menu
          </button>
        }
        action={
          <InternalLink className='btn btn--ghost' href='/settings'>
            Settings
          </InternalLink>
        }
      />

      <div className='chat-shell__body'>
        <aside className={`chat-sidebar ${isSidebarOpen ? 'chat-sidebar--open' : ''}`}>
          <div className='chat-sidebar__content'>
            <div className='chat-sidebar__section'>
              <div className='chat-sidebar__heading'>
                <h3>Inbox</h3>
                <span className='chip chip--neutral'>{sortedMessages.length}</span>
              </div>
              {sentLogError && <p className='field__error'>{sentLogError}</p>}
              {isSentLogLoading && !sortedMessages.length && <p className='chat-sidebar__empty'>Loading messages…</p>}
              {sortedMessages.length === 0 ? (
                <p className='chat-sidebar__empty'>No messages yet.</p>
              ) : (
                <div className='message-list'>
                  {sortedMessages.map((message) => {
                    const isActive = selectedMessage?.id === message.id;
                    return (
                      <button
                        className={`message-row ${isActive ? 'message-row--active' : ''}`}
                        key={message.id}
                        type='button'
                        onClick={() => setSelectedMessageId(message.id)}
                      >
                        <div className='message-row__header'>
                          <div className='message-row__subject'>
                            <p className='message-row__title'>{formatMessageTitle(message)}</p>
                            <span className={`message-row__badge message-row__badge--${message.direction}`}>
                              {message.direction === 'outbound' ? 'Sent' : 'Inbox'}
                            </span>
                          </div>
                          <p className='message-row__time'>{formatShortTime(message.createdAt)}</p>
                        </div>
                        <p className='message-row__subtitle'>{formatMessageRoute(message)}</p>
                        <p className='message-row__preview'>{formatPreview(message)}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <footer className='chat-sidebar__footer'>
            <div className='sync-status'>
              <span className={`sync-status__dot sync-status__dot--${syncStatus.state}`} />
              <span className='sync-status__text'>{syncStatus.state === 'syncing' ? 'Syncing...' : syncDetail}</span>
            </div>
            <button
              className='sync-status__refresh'
              type='button'
              onClick={handleRefresh}
              disabled={syncStatus.state === 'syncing'}
              title='Refresh'
            >
              <RefreshCw size={16} />
            </button>
          </footer>
        </aside>

        {isSidebarOpen && <button className='chat-overlay' type='button' onClick={() => setIsSidebarOpen(false)} />}

        <section className='chat-window'>
          <div className='chat-window__body'>
            {selectedMessage ? (
              <article className='message-detail'>
                <div className='message-detail__header'>
                  <div>
                    <p className='message-detail__eyebrow'>
                      {selectedMessage.direction === 'outbound' ? 'Sent message' : 'Incoming message'}
                    </p>
                    <h3 className='message-detail__subject'>{formatMessageTitle(selectedMessage)}</h3>
                    <MessageRoute message={selectedMessage} />
                  </div>
                  <div className='message-detail__meta'>
                    <span>{formatTimestamp(selectedMessage.createdAt)}</span>
                    <div className='message-detail__footer'>
                      <a
                        className='field__link'
                        href={getExplorerTxUrl(selectedMessage.transactionHash)}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        Transaction details
                      </a>
                    </div>
                  </div>
                </div>
                <div className='message-detail__content'>
                  <p>{selectedMessage.content}</p>
                </div>
              </article>
            ) : (
              <div className='chat-window__empty'>
                <p>Select a message to read it.</p>
                <p>Sent messages appear here with the recipient address.</p>
              </div>
            )}
          </div>

          <footer className='composer'>
            {!hasSigningKey && (
              <div className='composer__warning'>
                <p>No signing key configured.</p>
                <InternalLink className='btn btn--ghost' href='/settings'>
                  Set up in Settings
                </InternalLink>
              </div>
            )}
            {hasSigningKey && hasLowBalance && (
              <div className='composer__warning'>
                <p>Low balance: {signingBalance} ETH. Fund your signing key to send messages.</p>
                <a
                  className='btn btn--ghost'
                  href='https://sepoliafaucet.com/'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  Get Sepolia ETH
                </a>
              </div>
            )}
            <div className='composer__row composer__row--top'>
              <div className='field'>
                <label className='field__label' htmlFor='recipient'>
                  To
                </label>
                <input
                  className='field__input'
                  id='recipient'
                  placeholder='Meta-address (preferred) or wallet address'
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                  disabled={!hasSigningKey}
                />
              </div>
              <div className='field'>
                <label className='field__label' htmlFor='thread'>
                  Subject (optional)
                </label>
                <input
                  className='field__input'
                  id='thread'
                  placeholder='Optional subject'
                  value={threadLabel}
                  onChange={(event) => setThreadLabel(event.target.value)}
                  disabled={!hasSigningKey}
                />
              </div>
            </div>
            <div className='composer__row composer__row--message'>
              <textarea
                className='field__input field__input--area'
                rows={3}
                placeholder='Write a message…'
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                disabled={!hasSigningKey}
              />
            </div>
            <div className='composer__bar'>
              <div className='composer__bar-left'>
                <span className='composer__summary'>TTL ~18d</span>
                {signingAddress && <span className='composer__summary'>From: {truncateAddress(signingAddress)}</span>}
              </div>
              <div className='composer__actions'>
                <button
                  className='btn btn--primary'
                  type='button'
                  onClick={handleSend}
                  disabled={!canSend || isSending}
                >
                  {isSending ? 'Sending…' : 'Send message'}
                </button>
                {sendError && <p className='field__error'>{sendError}</p>}
                {composerTxHash && (
                  <a
                    className='field__link'
                    href={getExplorerTxUrl(composerTxHash)}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    View tx: {formatTxHash(composerTxHash)}
                  </a>
                )}
                {composerStatus && <p className='field__hint'>{composerStatus}</p>}
              </div>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}

function MessageRoute({ message }: { message: ChatMessage }) {
  if (message.direction === 'outbound') {
    const recipient = message.recipient ?? 'Unknown recipient';
    const isLongAddress = recipient.startsWith('0x') && recipient.length > 14;
    const addressType = recipient.startsWith('0x') ? (recipient.length > 42 ? 'meta' : 'stealth') : '';
    return (
      <div className='message-detail__routes'>
        {message.sender && (
          <p className='message-detail__route'>
            From: <CopyAddress value={message.sender} />
          </p>
        )}
        <p className='message-detail__route'>
          To: {isLongAddress ? <CopyAddress value={recipient} /> : recipient}
          {addressType && <span className='message-detail__route-hint'> ({addressType})</span>}
        </p>
      </div>
    );
  }

  const sender = message.sender;
  return (
    <div className='message-detail__routes'>
      <p className='message-detail__route'>From: {sender ? <CopyAddress value={sender} /> : 'Unknown sender'}</p>
      <p className='message-detail__route'>To: You</p>
    </div>
  );
}

function CopyAddress({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const truncated = label ?? truncateAddress(value);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [value]);

  return (
    <span className='copy-address'>
      <span className='copy-address__text' title={value}>
        {truncated}
      </span>
      <button className='copy-address__btn' type='button' onClick={handleCopy} title='Copy full address'>
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </span>
  );
}

function mergeMessages(...groups: ChatMessage[][]) {
  const map = new Map<string, ChatMessage>();
  for (const group of groups) {
    for (const message of group) {
      map.set(message.id, message);
    }
  }
  return Array.from(map.values()).sort(compareChatMessagesByChainAsc);
}

function formatMessageTitle(message: ChatMessage) {
  const subject = message.threadId?.trim();
  if (!subject) return 'Untitled';
  if (subject.startsWith('enc:')) return 'Encrypted subject';
  if (message.recipient && subject === message.recipient) return 'No subject';
  if (isLikelyAddress(subject)) {
    return `st:${truncateAddress(subject)}`;
  }
  return formatThreadTitle(subject);
}

function formatMessageRoute(message: ChatMessage) {
  if (message.direction === 'outbound') {
    const recipient = message.recipient ?? 'Unknown recipient';
    const addressType = recipient.startsWith('0x') ? (recipient.length > 42 ? 'meta' : 'stealth') : '';
    const suffix = addressType ? ` (${addressType})` : '';
    return `To: ${truncateAddress(recipient)}${suffix}`;
  }

  if (message.sender) {
    return `From: ${truncateAddress(message.sender)}`;
  }

  return 'From: Unknown sender';
}

function formatPreview(message: ChatMessage) {
  if (message.contentAvailable === false) {
    if (message.content.toLowerCase().startsWith('loading')) return 'Loading...';
    return 'Encrypted';
  }
  const trimmed = message.content.replace(/\s+/g, ' ').trim();
  if (!trimmed) return 'No content';
  if (trimmed.length <= 90) return trimmed;
  return `${trimmed.slice(0, 90)}…`;
}

async function resolveRecipientMetaAddress({ raw, schemeId }: { raw: string; schemeId: string }): Promise<string> {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('Recipient is required');

  const normalized = normalizeMetaAddress(trimmed);
  if (isValidMetaAddress(normalized)) return normalized;

  if (!isAddress(trimmed)) throw new Error('Recipient must be a meta-address or wallet address');

  try {
    const latest = await getLatestMetaAddressFromLogs({
      registrant: trimmed as Address,
    });
    if (latest?.metaAddress) return latest.metaAddress;
  } catch {
    // Ignore and fall back to direct registry lookup
  }

  const parsedScheme = Number.parseInt(schemeId, 10);
  if (!Number.isFinite(parsedScheme)) throw new Error('Scheme id must be a number');

  const registryMeta = await getStealthMetaAddress({
    registrant: trimmed as Address,
    schemeId: BigInt(parsedScheme),
  });

  if (typeof registryMeta !== 'string' || registryMeta === '0x')
    throw new Error('No meta-address found for this wallet. Ask for a meta-address directly.');

  const normalizedRegistry = normalizeMetaAddress(registryMeta);
  if (!isValidMetaAddress(normalizedRegistry)) throw new Error('Invalid meta-address in registry');

  return normalizedRegistry;
}

function formatThreadTitle(value: string) {
  if (!value.trim()) return 'Untitled';
  if (value.startsWith('enc:')) return 'Encrypted subject';
  if (isAddress(value)) return formatAddress(value);
  if (value.startsWith('0x') && value.length > 18) return `${value.slice(0, 6)}…${value.slice(-4)}`;
  return value;
}

function getSigningAccount(privateKey: string | null) {
  if (!privateKey) return null;
  const normalized = privateKey.trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) return null;

  try {
    return privateKeyToAccount(normalized as `0x${string}`);
  } catch {
    return null;
  }
}
