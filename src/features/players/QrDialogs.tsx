import { useEffect, useRef, useState } from 'react';
import { Button, Dialog, TerminalLine } from '@/components/ui';
import { useT } from '@/i18n';
import { friendLink, handleFromScan } from './friendLink';
import s from './FriendsSection.module.css';

export function ShowQrDialog({ open, onClose, handle }: { open: boolean; onClose: () => void; handle: string }) {
  const { t } = useT();
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    import('qrcode')
      .then((QR) => QR.toString(friendLink(handle), { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0d0a13', light: '#ffffff' } }))
      .then((out) => alive && setSvg(out))
      .catch(() => alive && setSvg(null));
    return () => {
      alive = false;
    };
  }, [open, handle]);

  return (
    <Dialog open={open} onClose={onClose} title={t('friends.qr.showTitle')} width={380}>
      <div className={s.qrWrap}>
        {/* Generated locally by the qrcode library from our own link. */}
        {svg ? <div className={s.qr} role="img" aria-label={t('friends.qr.alt', { handle })} dangerouslySetInnerHTML={{ __html: svg }} /> : <div className={s.qr} />}
        <span className={s.qrHandle}>@{handle}</span>
        <p className={s.muted}>{t('friends.qr.showHint')}</p>
      </div>
    </Dialog>
  );
}

export function ScanQrDialog({ open, onClose, onHandle }: { open: boolean; onClose: () => void; onHandle: (handle: string) => void }) {
  const { t } = useT();
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    setError(null);
    setInvalid(false);
  }
  const found = useRef(onHandle);
  useEffect(() => {
    found.current = onHandle;
  });

  useEffect(() => {
    if (!open) return;
    let scanner: { stop: () => void; destroy: () => void } | null = null;
    let alive = true;
    import('qr-scanner')
      .then(async ({ default: QrScanner }) => {
        if (!alive || !video.current) return;
        const sc = new QrScanner(
          video.current,
          (res) => {
            const handle = handleFromScan(res.data);
            if (!handle) {
              setInvalid(true);
              return;
            }
            sc.stop();
            found.current(handle);
          },
          { preferredCamera: 'environment', highlightScanRegion: true, returnDetailedScanResult: true },
        );
        scanner = sc;
        await sc.start();
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
      scanner?.stop();
      scanner?.destroy();
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('friends.qr.scanTitle')}
      width={420}
      footer={
        <Button variant="subtle" onClick={onClose}>
          {t('common.actions.cancel')}
        </Button>
      }
    >
      <div className={s.scanWrap}>
        {open ? <video ref={video} className={s.video} muted playsInline /> : null}
        {error ? (
          <TerminalLine tone="loss" prompt="✗">
            {t('friends.qr.cameraFailed', { error })}
          </TerminalLine>
        ) : invalid ? (
          <TerminalLine tone="warn" prompt="!">
            {t('friends.qr.notOurs')}
          </TerminalLine>
        ) : (
          <TerminalLine tone="muted">{t('friends.qr.scanHint')}</TerminalLine>
        )}
      </div>
    </Dialog>
  );
}
