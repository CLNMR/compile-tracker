import { app } from './app';
import { auth } from './auth';
import { common } from './common';
import { dev } from './dev';
import { games } from './games';
import { home } from './home';
import { legal } from './legal';
import { players } from './players';
import { privacy } from './privacy';
import { protocol } from './protocol';
import { settings } from './settings';
import { stats } from './stats';
import { ui } from './ui';

export const en = { common, app, auth, ui, protocol, home, players, games, stats, settings, privacy, legal, dev } as const;
