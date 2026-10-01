import { useId, useState, type FormEvent } from 'react';
import type { PlayerDoc } from '@/types';
import { Button, Dialog, TextField, useToast } from '@/components/ui';
import { useUid } from '@/hooks/useAuth';
import { usePlayers } from '@/hooks/usePlayers';
import { createPlayer, normalizePlayerName, renamePlayer } from '@/repo/players';

export interface PlayerDialogProps {
  open: boolean;
  onClose: () => void;
  /** When given, the dialog renames this player; otherwise it creates a new one. */
  player?: PlayerDoc;
  /** Called with the player id after a successful create/rename. */
  onSaved?: (id: string) => void;
}

/** Create or rename a player. Enter submits. */
export function PlayerDialog({ open, onClose, player, onSaved }: PlayerDialogProps) {
  const uid = useUid();
  const toast = useToast();
  const { players } = usePlayers();
  const formId = useId();
  const [name, setName] = useState(player?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the field whenever the dialog (re)opens or targets another player.
  const resetKey = `${open ? 1 : 0}:${player?.id ?? ''}`;
  const [prevKey, setPrevKey] = useState(resetKey);
  if (resetKey !== prevKey) {
    setPrevKey(resetKey);
    setName(player?.name ?? '');
    setError(null);
    setBusy(false);
  }

  const clean = normalizePlayerName(name);
  const duplicate = players.find((p) => p.id !== player?.id && p.name.toLowerCase() === clean.toLowerCase());
  const unchanged = !!player && clean === player.name;
  const canSave = clean.length > 0 && !duplicate && !unchanged && !busy;

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!clean) {
      setError('A name is required.');
      return;
    }
    if (duplicate) {
      setError('A player with this name already exists.');
      return;
    }
    if (unchanged) {
      onClose();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let id: string;
      if (player) {
        await renamePlayer(uid, player.id, clean);
        id = player.id;
        toast.push({ title: 'Player renamed', description: `${player.name} → ${clean}` });
      } else {
        id = await createPlayer(uid, clean);
        toast.push({ title: 'Player created', description: clean, tone: 'win' });
      }
      onSaved?.(id);
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Could not save player.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => (busy ? undefined : onClose())}
      title={player ? 'Rename player' : 'New player'}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={!canSave} loading={busy}>
            {player ? 'Rename' : 'Create'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit}>
        <TextField
          label="Name"
          placeholder="e.g. Ada"
          value={name}
          onChange={(v) => {
            setName(v);
            if (error) setError(null);
          }}
          error={error ?? (duplicate ? 'A player with this name already exists.' : undefined)}
          hint="Only you can see names. Others see a pseudonym."
          required
          inputProps={{ autoFocus: true, autoComplete: 'off', maxLength: 40, enterKeyHint: 'done' }}
        />
      </form>
    </Dialog>
  );
}
