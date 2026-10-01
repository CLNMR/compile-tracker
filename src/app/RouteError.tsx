import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Button, Panel, TerminalLine } from '@/components/ui';

export function RouteError() {
  const err = useRouteError();
  const message = isRouteErrorResponse(err)
    ? `${err.status} ${err.statusText}`
    : err instanceof Error
      ? err.message
      : 'unknown error';
  return (
    <div style={{ padding: 24, maxWidth: 560, margin: '0 auto' }}>
      <Panel title="Segfault">
        <TerminalLine tone="loss">{message}</TerminalLine>
        <TerminalLine tone="muted">the void stretches out in front, behind, under, above.</TerminalLine>
        <div style={{ marginTop: 16 }}>
          <Button to="/" variant="primary">
            Return home
          </Button>
        </div>
      </Panel>
    </div>
  );
}
