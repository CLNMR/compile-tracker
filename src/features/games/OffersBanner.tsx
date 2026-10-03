import { Link } from 'react-router';
import { TerminalLine } from '@/components/ui';
import { useT } from '@/i18n';
import { usePendingOfferCount } from '@/hooks/useOffers';
import s from './OffersPage.module.css';

/** "3 games offered by friends — review" while there are pending offers. */
export function OffersBanner() {
  const { t } = useT();
  const count = usePendingOfferCount();
  if (count === 0) return null;
  return (
    <TerminalLine tone="warn" prompt="!">
      {t('friends.offers.banner', { count })}{' '}
      <Link to="/games/offers" className={s.bannerLink}>
        {t('friends.offers.review')}
      </Link>
    </TerminalLine>
  );
}
