import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Button, Panel, TerminalLine } from '@/components/ui';
import { useT } from '@/i18n';

export function RouteError() {
  const { t } = useT();
  const err = useRouteError();
  const message = isRouteErrorResponse(err)
    ? `${err.status} ${err.statusText}`
    : err instanceof Error
      ? err.message
      : t('app.error.unknown');
  return (
    <div style={{ padding: 24, maxWidth: 560, margin: '0 auto' }}>
      <Panel title={t('app.error.title')}>
        <TerminalLine tone="loss">{message}</TerminalLine>
        <TerminalLine tone="muted">{t('app.error.void')}</TerminalLine>
        <div style={{ marginTop: 16 }}>
          <Button to="/" variant="primary">
            {t('app.error.home')}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
