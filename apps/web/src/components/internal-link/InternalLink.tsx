import type { MouseEvent, ReactNode } from 'react';
import { useRouter } from '../../state/router-context';

type InternalLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export function InternalLink({ href, className, children }: InternalLinkProps) {
  const { navigate } = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    )
      return;

    if (href.startsWith('#') || href.startsWith('http')) return;

    event.preventDefault();
    navigate(href);
  }

  return (
    <a className={className} href={href} onClick={handleClick}>
      {children}
    </a>
  );
}
