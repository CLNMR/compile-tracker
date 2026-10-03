import { Fragment } from 'react';
import { Panel, SectionHeader, TerminalLine } from '@/components/ui';
import { useT, type TKey } from '@/i18n';
import { LEGAL_UPDATED, OPERATOR, OPERATOR_COMPLETE } from './operator';
import s from './LegalPage.module.css';

type Kind = 'privacy' | 'imprint';

const SECTIONS: Record<Kind, readonly string[]> = {
  privacy: ['controller', 'overview', 'hosting', 'account', 'data', 'friends', 'device', 'counters', 'cloudflare', 'ga', 'other', 'rights', 'changes'],
  imprint: ['provider', 'project', 'liability'],
};
/** Sections followed by the operator's name, address and email. */
const WITH_OPERATOR = new Set(['controller', 'provider']);

/** Blank line = paragraph, "• " lines = list items. */
function Body({ text }: { text: string }) {
  return (
    <>
      {text.split('\n\n').map((block, i) => {
        const lines = block.split('\n');
        const items = lines.filter((l) => l.startsWith('• '));
        const prose = lines.filter((l) => !l.startsWith('• '));
        return (
          <Fragment key={i}>
            {prose.length ? <p>{prose.join(' ')}</p> : null}
            {items.length ? (
              <ul>
                {items.map((l, j) => (
                  <li key={j}>{l.slice(2)}</li>
                ))}
              </ul>
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
}

function OperatorBlock() {
  const { t } = useT();
  if (!OPERATOR_COMPLETE) {
    return (
      <TerminalLine tone="warn" prompt="!">
        {t('legal.missingOperator')}
      </TerminalLine>
    );
  }
  return (
    <address className={s.operator}>
      <strong>{OPERATOR.name}</strong>
      {OPERATOR.address.map((l) => (
        <span key={l}>{l}</span>
      ))}
      <span>
        {t('legal.email')}: <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
      </span>
    </address>
  );
}

/** /privacy and /imprint (also reachable as /datenschutz and /impressum). */
export default function LegalPage({ kind }: { kind: Kind }) {
  const { t, locale, date } = useT();
  return (
    <article className={s.page}>
      <div className={s.head}>
        <SectionHeader as="h1">{t(`legal.${kind}.title`)}</SectionHeader>
        <TerminalLine tone="muted">
          {t('legal.updated', { date: date(Date.parse(`${LEGAL_UPDATED}T12:00:00Z`), { dateStyle: 'long' }) })}
          {locale !== 'de' ? ` · ${t('legal.german')}` : ''}
        </TerminalLine>
      </div>
      {SECTIONS[kind].map((id) => (
        <Panel key={id} title={t(`legal.${kind}.${id}.title` as TKey)}>
          <div className={s.body}>
            <Body text={t(`legal.${kind}.${id}.body` as TKey)} />
            {WITH_OPERATOR.has(id) ? <OperatorBlock /> : null}
          </div>
        </Panel>
      ))}
    </article>
  );
}
