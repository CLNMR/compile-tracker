import { Link } from 'react-router';
import { useT } from '@/i18n';
import s from './LegalLinks.module.css';

/** Small footer with the two legal links, shown under every page. */
export function LegalLinks() {
  const { t } = useT();
  return (
    <nav className={s.links} aria-label={`${t('legal.links.privacy')} · ${t('legal.links.imprint')}`}>
      <Link to="/privacy">{t('legal.links.privacy')}</Link>
      <span aria-hidden="true"> · </span>
      <Link to="/imprint">{t('legal.links.imprint')}</Link>
    </nav>
  );
}
