import type { Shape } from '../shape';
import type { legal as en } from '../en/legal';

export const legal: Shape<typeof en> = {
  links: {
    privacy: 'Datenschutz',
    imprint: 'Impressum',
  },
  updated: 'Stand: {date}',
  missingOperator: 'betreiberangaben fehlen — VITE_LEGAL_NAME, VITE_LEGAL_ADDRESS und VITE_LEGAL_EMAIL setzen',
  german: 'Maßgeblich ist die deutsche Fassung.',
  email: 'E-Mail',

  privacy: {
    title: 'Datenschutzerklärung',
    controller: {
      title: 'Verantwortlicher',
      body: 'Verantwortlich für die Verarbeitung personenbezogener Daten in dieser App (Art. 4 Nr. 7 DSGVO):',
    },
    overview: {
      title: 'Kurz gesagt',
      body: 'Compile Tracker ist eine kostenlose, nicht-kommerzielle Fan-App, um Partien des Kartenspiels Compile zu erfassen. Es gibt keine Werbung, es werden keine Daten verkauft und nichts über andere Websites hinweg verfolgt. Google Analytics läuft nur, wenn du es erlaubst.',
    },
    hosting: {
      title: 'Hosting und Server-Logs',
      body: 'Die App wird über Firebase Hosting der Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland, bereitgestellt. Beim Aufruf verarbeiten die Server technische Daten, die jeder Browser sendet: IP-Adresse, Zeitpunkt, aufgerufene Adresse, verweisende Seite, Browser und Betriebssystem. Das ist nötig, um die App auszuliefern und sicher zu betreiben (Art. 6 Abs. 1 lit. f DSGVO).\n\nGoogle kann Daten auch in den USA verarbeiten. Die Google LLC ist nach dem EU-US Data Privacy Framework zertifiziert, für das ein Angemessenheitsbeschluss der EU-Kommission besteht (Art. 45 DSGVO).',
    },
    account: {
      title: 'Anmeldung',
      body: 'Beim ersten Besuch erzeugt Firebase Authentication (Google) eine zufällige, anonyme Nutzer-ID und hält dich auf diesem Gerät angemeldet. Name oder E-Mail-Adresse sind dafür nicht nötig.\n\nWenn du in den Einstellungen ein Google-Konto verknüpfst, übermittelt Google deine Google-Konto-ID, E-Mail-Adresse, deinen Namen und dein Profilbild an Firebase Authentication. Wir nutzen das nur, um dich auf deinen Geräten anzumelden; es wird nicht in der Spieldatenbank gespeichert und anderen Nutzern nie angezeigt.\n\nErstellst du stattdessen ein Konto mit E-Mail und Passwort, speichert Firebase Authentication deine E-Mail-Adresse und einen gesalzenen Hash deines Passworts (nie das Passwort selbst). Firebase schickt nur dann E-Mails an diese Adresse, wenn du das Zurücksetzen des Passworts anforderst. Auch die E-Mail-Adresse wird nicht in der Spieldatenbank gespeichert und anderen Nutzern nie angezeigt.\n\nRechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung der von dir genutzten App).',
    },
    data: {
      title: 'Spiele, Spieler und Einstellungen',
      body: 'Die App speichert deine Eingaben in Cloud Firestore (Google) in der Region Frankfurt (europe-west3):\n• Spiele: Protokolle, welche Protokolle kompiliert wurden, Gewinner, Startspieler, Datum.\n• Spieler: die Namen, die du vergibst, sowie deine Einstellungen (aktive Sets, Standardspieler).\n\nSpielernamen und Einstellungen sind nur für dich sichtbar. Spiele sind für alle Nutzer sichtbar, damit die gemeinsame Statistik berechnet werden kann, aber ohne Namen: Andere sehen nur Alpha/Beta oder ein Pseudonym wie „P-3F9A“.\n\nRechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Die Daten bleiben gespeichert, bis du sie in der App löschst oder uns um Löschung bittest.',
    },
    friends: {
      title: 'Handles, Freunde und geteilte Spiele',
      body: 'Mit einem Konto (Google oder E-Mail) kannst du ein Handle wählen (z. B. „@ada“), über das Freunde dich hinzufügen können. Dein Handle ist für andere angemeldete Nutzer sichtbar, die danach suchen; es ist nicht mit deinem Namen oder deiner E-Mail-Adresse verbunden.\n\nWenn du einen Freund hinzufügst, speichert die App die Freundschaft in beiden Konten, zusammen mit dem Spieler, mit dem du den Freund verknüpft hast (nur für dich sichtbar). Spiele mit einem verknüpften Spieler werden diesem Freund angeboten: Das Angebot speichert, welche Seite des Spiels diese Person ist und ob sie es angenommen hat. Freundschaften und Angebote sehen nur du und dieser Freund. Entfernst du einen Freund, wird die Freundschaft auf beiden Seiten gelöscht.\n\nRechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (die von dir gewählte Freunde-Funktion).',
    },
    device: {
      title: 'Speicherung auf deinem Gerät',
      body: 'Damit die App funktioniert, auch offline, speichert sie auf deinem Gerät:\n• deine Anmeldesitzung und eine Offline-Kopie der Daten (IndexedDB),\n• deine Sprachwahl, deine Statistik-Entscheidung und einen unfertigen Spielentwurf (Local und Session Storage),\n• die App-Dateien für Offline-Nutzung und Installation (Service-Worker-Cache).\n\nDas ist für den von dir gewünschten Dienst unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG), eine Einwilligung ist dafür nicht nötig. Du kannst es jederzeit entfernen, indem du die Website-Daten in deinem Browser löschst. Anonyme Daten, die nicht mit einem Konto verknüpft sind, sind danach nicht mehr erreichbar.',
    },
    counters: {
      title: 'Anonyme Nutzungszählung',
      body: 'Um zu sehen, woher Nutzer kommen, erhöht die App bei diesen Ereignissen einen täglichen Zähler um 1: Besuch, neuer anonymer Nutzer, gespeichertes Spiel, neu erstelltes Konto (Google oder E-Mail). Gezählt wird je Quelle (z. B. Reddit, BoardGameGeek, installierte App, Suchmaschine); die Quelle stammt aus der Markierung im aufgerufenen Link oder aus der verweisenden Website. Mit den Zählern werden weder Nutzer-ID noch IP-Adresse noch Geräte-ID gespeichert.\n\nRechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse ist zu wissen, über welche Kanäle Spieler die App finden.',
    },
    cloudflare: {
      title: 'Cloudflare Web Analytics',
      body: 'Wir nutzen Cloudflare Web Analytics der Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA, um Seitenaufrufe zu zählen. Erfasst werden die Seite, die verweisende Website, Browser, Betriebssystem, Gerätetyp, Land und Ladezeiten. Laut Cloudflare werden dabei keine Cookies und kein lokaler Speicher verwendet und kein Fingerprinting betrieben. Deine IP-Adresse wird zur Bestimmung des Landes genutzt, aber nicht gespeichert.\n\nRechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse ist eine datensparsame Messung, wie viel die App genutzt wird. Die Cloudflare, Inc. ist nach dem EU-US Data Privacy Framework zertifiziert.',
    },
    ga: {
      title: 'Google Analytics (nur mit Einwilligung)',
      body: 'Wenn du es erlaubst, nutzt die App Google Analytics 4 der Google Ireland Limited, um zu verstehen, wie sie genutzt wird. Google Analytics setzt Cookies (_ga, _ga_…), die bis zu 2 Jahre gespeichert bleiben, und erfasst:\n• die aufgerufenen Seiten und die Herkunft deines Besuchs (Link-Markierungen, verweisende Website),\n• App-Ereignisse: Spiel gespeichert, Spieler angelegt, Konto erstellt (Google oder E-Mail), App installiert,\n• Gerät, Browser, Bildschirmgröße, Sprache und ungefähren Standort (aus der IP-Adresse abgeleitet; Google Analytics 4 speichert keine IP-Adressen).\n\nWerbefunktionen sind deaktiviert. Ereignisdaten werden spätestens nach 14 Monaten gelöscht. Daten können an die Google LLC in den USA übermittelt werden, die nach dem EU-US Data Privacy Framework zertifiziert ist.\n\nRechtsgrundlage: deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Du kannst sie jederzeit unter Einstellungen → Datenschutz mit Wirkung für die Zukunft widerrufen; die App löscht dann die Google-Analytics-Cookies.',
    },
    other: {
      title: 'Schriftarten und weitere Inhalte',
      body: 'Schriftarten und Symbole sind Teil der App. Außer den hier genannten Diensten werden keine externen Inhalte geladen.',
    },
    rights: {
      title: 'Deine Rechte',
      body: 'Du hast das Recht:\n• auf Auskunft über deine Daten (Art. 15 DSGVO),\n• auf Berichtigung (Art. 16) und Löschung (Art. 17),\n• auf Einschränkung der Verarbeitung (Art. 18),\n• auf Datenübertragbarkeit (Art. 20),\n• Verarbeitungen auf Grundlage berechtigter Interessen zu widersprechen (Art. 21),\n• deine Einwilligung jederzeit zu widerrufen (Art. 7 Abs. 3).\n\nSchreib uns dazu an die oben genannte E-Mail-Adresse. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO), zum Beispiel an deinem Wohnort.',
    },
    changes: {
      title: 'Änderungen',
      body: 'Wir passen diese Erklärung an, wenn sich die App ändert. Die aktuelle Fassung ist immer in der App abrufbar.',
    },
  },

  imprint: {
    title: 'Impressum',
    provider: {
      title: 'Anbieter',
      body: 'Angaben gemäß § 5 DDG:',
    },
    project: {
      title: 'Über dieses Projekt',
      body: 'Compile Tracker ist ein privates, nicht-kommerzielles Fan-Projekt. Compile ist ein Spiel von Michael Yang, verlegt von Greater Than Games. Diese App steht in keiner Verbindung zu ihnen und wird nicht von ihnen unterstützt; alle Marken gehören ihren Inhabern.',
    },
    liability: {
      title: 'Haftung',
      body: 'Die Inhalte dieser App wurden sorgfältig erstellt; für Richtigkeit, Vollständigkeit und Aktualität können wir jedoch keine Gewähr übernehmen. Statistiken werden aus den von Nutzern eingegebenen Spielen berechnet. Für die Inhalte verlinkter externer Websites sind ausschließlich deren Betreiber verantwortlich.',
    },
  },
};
