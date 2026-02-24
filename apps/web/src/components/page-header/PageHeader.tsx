import type { ReactNode } from 'react';

type PageHeaderProps = {
  menuButton?: ReactNode;
  action?: ReactNode;
};

export function PageHeader({ menuButton, action }: PageHeaderProps) {
  return (
    <header className='chat-shell__header'>
      <div className='chat-shell__brand'>
        {menuButton}
        <div>
          <p className='chat-shell__title'>Ephereum Chat</p>
          <p className='chat-shell__subtitle'>Ephemeral messages secured by EIP-4844 blobs.</p>
        </div>
      </div>
      <div className='chat-shell__actions'>{action}</div>
    </header>
  );
}
