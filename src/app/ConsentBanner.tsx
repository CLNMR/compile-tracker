import { GA_CONFIGURED, useConsentStore } from '@/analytics';
import { Link } from 'react-router';
import { Button } from '@/components/ui';
import { useT } from '@/i18n';
import styles from './ConsentBanner.module.css';

/** Asks once per device whether Google Analytics may run. Both answers are equally prominent. */
export function ConsentBanner() {
  const { t } = useT();
  const choice = useConsentStore((s) => s.choice);
  const grant = useConsentStore((s) => s.grant);
  const deny = useConsentStore((s) => s.deny);

  if (!GA_CONFIGURED || choice !== null) return null;

  return (
    <section className={styles.wrap} role="dialog" aria-modal="false" aria-labelledby="consent-title">
      <h2 id="consent-title" className={styles.title}>
        {t('privacy.banner.title')}
      </h2>
      <p className={styles.body}>
        {t('privacy.banner.body')} <Link to="/privacy">{t('legal.links.privacy')}</Link>
      </p>
      <div className={styles.actions}>
        <Button size="sm" variant="ghost" onClick={deny}>
          {t('privacy.banner.decline')}
        </Button>
        <Button size="sm" variant="ghost" onClick={grant}>
          {t('privacy.banner.accept')}
        </Button>
      </div>
    </section>
  );
}
