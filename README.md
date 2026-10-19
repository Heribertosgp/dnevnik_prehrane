# dnevnik_prehrane · Mesa / Stol

[Hrvatski](#hr) · [English](#en) · [Español](#es)

<a id="hr"></a>

## Hrvatski

Verzija 1.0.0. Osobni dnevnik prehrane s izvještajima na španjolskom i hrvatskom jeziku.

Ova verzija nudi sučelje dnevnika prehrane koje se može instalirati na poslužitelj. Sadrži model za prevođenje za izradu dvojezičnih izvještaja. Ne koristi bazu podataka i ne zahtijeva API ključ za prevođenje.

Upozorenje! Ovaj je model izrađen uz pomoć GPT6 pod mojim nadzorom. Instalacija i uporaba odgovornost su krajnjeg korisnika. Važno je pročitati licence i ne koristiti ga u komercijalne svrhe. Ovo je samo alat za praćenje unosa hrane. Važno je savjetovati se s liječnikom i/ili nutricionistom.

### Instalacija uz pomoć AI asistenta

Otvorite [prompt za instalaciju uz pomoć AI-ja](AI_INSTALLATION_PROMPT.md), kopirajte cijeli označeni blok u svoj AI asistent ili agentski sustav i navedite postavke svojeg poslužitelja. Zatražite odgovore na hrvatskom. Prompt vodi kroz provjeru poslužitelja, instalaciju, pristup, prevođenje i sigurnosne kopije. Za izvršavanje je potreban odobren pristup terminalu poslužitelja; bez njega asistent može davati upute. Lozinke i privatne SSH ključeve unosite samo sigurnim putem, nikad u razgovor.

### Što je uključeno

- Jedan korisnik, zaštićen lozinkom. Autentifikacija štiti stranicu i sve radnje čitanja, pisanja i prevođenja.
- Dnevnik u datoteci `/data/diary.json`, s atomskim zapisivanjem, kontrolom istodobnih promjena i posljednjih 50 verzija u `/data/history/`.
- Prevođenje modelom M2M100 418M na procesoru poslužitelja, u zasebnom procesu. Kvar prevoditelja ne sprječava spremanje nacrta. Napomena: aplikacija se može koristiti i bez prevoditelja.
- Uvoz sigurnosnih kopija u JSON formatu iz prethodne verzije; izvoz sigurnosnih kopija i dvojezičnih HTML/PDF izvještaja.
- Docker Compose, trajni volumen za unose, drugi za model i Caddy za HTTPS.
- Ovaj paket ne mijenja izvornu stranicu koja je prethodno bila objavljena.

### Zahtjevi

Paket je pripremljen za Linux s Docker Engineom, dodatkom Docker Compose i Pythonom 3. Za početak osigurajte 2 procesorske jezgre, 4 GB raspoložive radne memorije (po mogućnosti 8 GB) i 10 GB slobodnog prostora za slike spremnika, model i podatke. To je operativna procjena, a ne jamstvo performansi. GPU nije potreban. Prije uporabe provjerite rad na ARM poslužiteljima ili sustavima s vrlo malo memorije; testovi izvršavanja provedeni su na Linuxu x86_64.

Pri prvoj pripremi preuzima se približno 640 MB (611 MiB) modela, uz slike spremnika i ovisnosti. Trajanje svakog prijevoda ovisit će o procesoru i duljini teksta. Fiksirana verzija Transformers.js jest 3.8.1, a revizija modela fiksirana je u `server/model.mjs`. Instalacija koristi CPU i onemogućuje preuzimanje komponenti CUDA/TensorRT.

Provjerite alate:

```bash
docker version
docker compose version
python3 --version
```

Ako nemate Docker, slijedite službene upute za svoju distribuciju: https://docs.docker.com/engine/install/ i https://docs.docker.com/compose/install/linux/. Sljedeće naredbe pretpostavljaju da vaš korisnički račun može pokretati Docker. Nemojte dodavati servise ni mijenjati zauzete portove bez provjere postojeće konfiguracije poslužitelja.

### Instalacija s domenom i HTTPS-om

1. Izradite poddomenu, primjerice `diario.midominio.com`, koja upućuje na poslužitelj. DNS zapis A i, ako postoji, AAAA moraju upućivati na ispravne adrese. TCP portovi 80 i 443 moraju biti slobodni i dostupni. Ako već koristite Nginx, Apache, Traefik ili Caddy, slijedite odjeljak o postojećem HTTPS proxyju.

2. Klonirajte ovaj repozitorij na poslužitelj (potreban je Git) i postavite pristup:

```bash
git clone https://github.com/Heribertosgp/dnevnik_prehrane.git
cd dnevnik_prehrane
python3 scripts/configure.py
```

Čarobnjak traži domenu, korisničko ime i lozinku. Unesite lozinku s najmanje 16 znakova. Lozinka se ne prikazuje na zaslonu i ne sprema se kao običan tekst: vrijednost izvedena funkcijom scrypt sprema se u `secrets/owner.json`. Datoteka `.env` sadrži domenu i postavke modela. Čarobnjak odbija prepisati postojeće vjerodajnice.

3. Izgradite aplikaciju i pripremite model na poslužitelju:

```bash
docker compose build app
docker compose run --rm app npm run model:prepare
```

Pričekajte poruku `Model ready`. Naredba prikazuje dvije probne rečenice i njihove prijevode; ne koristi podatke iz vašeg dnevnika. Ako ne uspije, provjerite poruke i nemojte smatrati instalaciju prevoditelja dovršenom.

4. Nakon uspješne pripreme uredite `.env` i zamijenite `MODEL_OFFLINE=0` s `MODEL_OFFLINE=1`. Tako prevođenje koristi samo već preuzete datoteke. Ako kasnije ažurirate model, tijekom pripreme privremeno vratite vrijednost na `0`.

5. Pokrenite stranicu:

```bash
docker compose up -d
docker compose ps
docker compose logs --tail=60 app caddy
```

Otvorite `https://diario.midominio.com` (svoju stvarnu domenu). Caddy pribavlja i obnavlja HTTPS certifikat. Preglednik će zatražiti vjerodajnice iz 2. koraka; one pripadaju ovom dnevniku, a ne ChatGPT-u. Nemojte dijeliti tu lozinku sa svojom nutricionisticom.

Servis `app` ne izlaže svoj port izravno: samo je Caddy izložen internetu. Poslužitelj provjerava lozinku pri svakom zahtjevu te provjerava podrijetlo zahtjeva za promjene. Putanja `/healthz` samo pokazuje je li proces aktivan i ne prikazuje obroke ni konfiguraciju.

### Ako već imate HTTPS proxy

Nemojte pokretati servis Caddy iz ovog paketa. Najprije postavite domenu i korisnika pomoću `configure.py`, izgradite aplikaciju i pripremite model kako je opisano iznad. Zatim:

```bash
docker compose -f compose.yml -f compose.proxy.yml up -d app
```

Aplikacija je dostupna na `127.0.0.1:8080`, samo s poslužitelja. Postavite proxy tako da obrađuje HTTPS vezu i prosljeđuje zahtjeve na tu adresu. Mora sačuvati zaglavlje `Authorization`, dopuštati JSON tijela zahtjeva do 20 MB i vrijeme čekanja do 660 sekundi za pripremu/prevođenje. Varijabla `APP_ORIGIN` mora točno odgovarati HTTPS ishodištu kojem pristupate, bez završne kose crte ili podmape.

Nemojte instalirati dnevnik pod `/diario/`: ova verzija očekuje vlastitu domenu ili poddomenu i putanje od korijena `/`. Ako je proxy u drugom spremniku, morate prilagoditi njegovu Docker mrežu; `127.0.0.1` unutar tog spremnika ne označava glavno računalo.

### Privatno testiranje putem SSH-a, bez javne domene

Aplikaciju možete provjeriti prije postavljanja DNS-a. Pokrenite `configure.py` koristeći `diario.example.com` kao privremenu domenu i pripremite model. Zatim pokrenite samo aplikaciju:

```bash
docker compose -f compose.yml -f compose.local.yml up -d app
```

Na svojem računalu otvorite tunel, zamjenjujući `usuario` i `servidor` svojim korisničkim imenom i poslužiteljem:

```bash
ssh -L 8080:127.0.0.1:8080 usuario@servidor
```

Na svojem računalu otvorite točno `http://127.0.0.1:8080`. Veza s poslužiteljem prolazi kroz SSH. Nemojte promijeniti adresu izlaganja porta na `0.0.0.0:8080`: HTTP s lozinkom ovdje se koristi isključivo unutar tunela. Za prelazak u produkciju postavite stvarnu domenu i pokrenite HTTPS varijantu, ponovno stvarajući servis s novim postavkama.

### Vraćanje prethodnih unosa

1. Na prethodnoj stranici, u istom pregledniku i profilu u kojem ste pisali, otvorite **Copias de seguridad → Descargar copia JSON** (Sigurnosne kopije → Preuzmi JSON kopiju).
2. Na novoj stranici otvorite **Copias de seguridad → Seleccionar copia JSON** (Sigurnosne kopije → Odaberi JSON kopiju) i uvezite tu datoteku.
3. Provjerite nekoliko datuma i obje jezične verzije svakog unosa. Sačuvajte izvornu datoteku.

Uvoz dodaje unose i zadržava noviju verziju ako pronađe isti identifikator. Nepotpuni prijevodi ostaju nacrti. Ako su podaci starog preglednika već izbrisani i nema sigurnosne kopije, novi ih poslužitelj ne može vratiti. Ne može ni automatski čitati pohranu stare domene.

### Dijeljenje s nutricionisticom

Pišite na jednom od podržanih jezika, odaberite taj jezik i pritisnite **Traducir ES ↔ HR** (Prevedi ES ↔ HR). Pregledajte oba teksta, označite da su pregledani i spremite ih. Prevoditelj podržava unose na španjolskom, hrvatskom, engleskom, njemačkom, francuskom, talijanskom i portugalskom; izvještaj je uvijek na španjolskom i hrvatskom.

U odjeljku **Compartir informe** (Podijeli izvještaj) odaberite datume. Preuzmite HTML ili upotrijebite **Imprimir / PDF** (Ispis / PDF). Pošaljite tu datoteku svojoj nutricionistici. Ne sadrži uređivač, lozinku ni vezu s vašim dnevnikom. Kopija se ne ažurira automatski, a primatelj je može proslijediti. Ne postoji javna poveznica na dnevnik.

Ako prevođenje ne uspije, spremite nacrt i pokušajte ponovno kasnije. Uvijek provjerite količine, negacije i nazive namirnica. Model može pogriješiti.

### Provjera rada instalacije

1. Otvorite privatni prozor: stranica mora tražiti korisničko ime i lozinku. Pogrešna lozinka ne smije omogućiti pristup.
2. Spremite unos na španjolskom, prevedite ga i pregledajte hrvatski prijevod. Isprobajte i unos izvorno napisan na hrvatskom.
3. Ponovno pokrenite aplikaciju naredbom `docker compose restart app`. Provjerite je li unos još prisutan i vidljiv nakon prijave iz drugog preglednika.
4. Izvezite izvještaj i JSON kopiju. Provjerite ispis/PDF u pregledniku koji ćete koristiti.
5. Uvezite poznatu sigurnosnu kopiju i provjerite datume.

Paket sadrži automatizirane testove autentifikacije, odbijanja zapisivanja iz drugih ishodišta, trajnosti nakon ponovnog pokretanja, sukoba istodobnih promjena, sigurnog prekida rada s oštećenim datotekama, spremanja kada prevođenje ne uspije, provjere sigurnosnih kopija i dvojezičnog izvoza. Stvarni model pokrenut je na španjolskom i hrvatskom, uz preuzimanje i uz predmemoriju u načinu rada bez mreže. Izgradnja s Dockerom/Caddyjem nije se mogla provesti u pripremnom okruženju jer Docker nije bio dostupan; sučelje nije provjereno u grafičkom pregledniku. Dovršite te provjere na svojem poslužitelju.

### Sigurnosne kopije i vraćanje podataka

Volumeni `diary_data` i `model_cache` zadržavaju podatke nakon ponovnog pokretanja i ponovnog stvaranja spremnika. **Nemojte pokretati `docker compose down -v`**, jer ta naredba briše volumene, a s njima i dnevnik. Trajnost volumena ne štiti od kvara diska ili brisanja poslužitelja.

Osim preuzimanja iz sučelja, sigurnosnu kopiju možete izraditi i na glavnom računalu:

```bash
bash scripts/backup.sh
```

JSON datoteka nastaje u `backups/`, bez zaustavljanja servisa. Kopirajte te datoteke izvan poslužitelja sustavom sigurnosnog kopiranja koji koristite. Nemojte uključivati JSON datoteke u javni repozitorij. Konfiguraciju i `secrets/owner.json` također čuvajte u privatnoj sigurnosnoj kopiji. Model se može ponovno preuzeti.

Za svakodnevne sigurnosne kopije dodajte cron zapis na korisničkom računu koji ima dopuštenje za Docker, koristeći stvarnu putanju projekta:

```cron
15 3 * * * /bin/bash /ruta/mesa-stol-server/scripts/backup.sh >> /ruta/mesa-stol-server/backups.log 2>&1
```

Raspored koristi vremensku zonu poslužitelja. Skripta ne briše stare kopije; odredite pravila njihova zadržavanja i kopiranja izvan poslužitelja.

Za uobičajeno vraćanje podataka uvezite JSON kroz sučelje. U slučaju potpunog gubitka ponovno instalirajte paket, po potrebi izradite nove vjerodajnice i uvezite posljednju kopiju.

Ako se `diary.json` ošteti, aplikacija odbija pokretanje kako ga ne bi prepisala. Zaustavite servis prije intervencije. Administrator može priključiti `diary_data` privremenom spremniku i vratiti verziju iz `/data/history/`; prije zamjene sačuvajte oštećenu datoteku i kopiju volumena. Vraćanje se ne provodi bez obavijesti.

### Održavanje

- Održavajte samo jednu instancu servisa `app` koja zapisuje u ovaj volumen. Red za zapisivanje nije namijenjen za više istodobnih spremnika.
- Pri ažuriranju koda sačuvajte `.env`, `secrets/` i volumene; izradite sigurnosnu kopiju pa pokrenite `docker compose build app` i `docker compose up -d`.
- Za promjenu lozinke zaustavite `app`, premjestite `secrets/owner.json` u privatnu sigurnosnu kopiju, pokrenite `configure.py` i ponovno stvorite servis. Postojeća konfiguracija `.env` ostaje sačuvana. Ponovno pokrenite preglednik ako i dalje koristi staru lozinku.
- Sadržaj obroka ne zapisuje se u zapisnike. JSON kopija i disk poslužitelja ipak sadrže čitljiv tekst; zaštitite pristup glavnom računalu i sigurnosnim kopijama.
- Kod projekta koristi GNU GPL verziju 3 (`GPL-3.0-only`); datoteka `LICENSE` repozitorija ostaje sačuvana. M2M100 418M koristi MIT, a Transformers.js Apache-2.0. Ovisnosti i obavijesti nalaze se u `THIRD_PARTY_NOTICES.md` i `DEPENDENCIES.json`. Za prevođenje sadržaja ne koriste se usluge trećih strana.

### Česti problemi

| Simptom | Što provjeriti |
|---|---|
| «Origen no autorizado» (Nedopušteno ishodište) | `APP_ORIGIN` mora točno odgovarati shemi, domeni i portu koje koristite. Nemojte miješati `localhost` i `127.0.0.1`. Nakon promjene `.env` ponovno stvorite `app`. |
| HTTPS certifikat na čekanju | DNS A/AAAA, pristup TCP portovima 80/443, zauzete portove i Caddyjeve zapisnike. |
| «El motor se detuvo» (Mehanizam je zaustavljen) ili izlazni kod 137 | Raspoloživu memoriju. Povećajte RAM, smanjite `MODEL_THREADS` ili promijenite pristup ako poslužitelj nema dovoljno resursa. |
| Prevoditelj ne pronalazi datoteke | Pripremite model s `MODEL_OFFLINE=0`; pričekajte `Model ready` i vratite vrijednost na `1`. Sačuvajte volumen `model_cache`. |
| Odgovor 409 pri spremanju | Drugi je uređaj promijenio dnevnik. Sačuvajte svoj tekst i ponovno otvorite trenutačni unos prije primjene promjena. |
| Odgovor 429 pri prevođenju | Jedan je prijevod već u tijeku; pričekajte. Obrađuje se samo jedan prijevod odjednom. |
| Odgovor 429 pri prijavi | Dvadeset neuspjelih pokušaja unosa lozinke privremeno blokira autentifikaciju; pričekajte deset minuta. |
| Nema prostora na disku | Spremanje ne uspijeva i nema potvrde uspjeha. Oslobodite prostor i provjerite pravila zadržavanja sigurnosnih kopija. |

### Tehnički izvori

- Docker Engine: https://docs.docker.com/engine/install/
- Docker Compose: https://docs.docker.com/compose/install/linux/
- Caddy i HTTPS: https://caddyserver.com/docs/automatic-https
- Izvršavanje modela u Node.js-u: https://huggingface.co/docs/transformers.js/tutorials/node
- Model, datoteke i licenca: https://huggingface.co/Xenova/m2m100_418M

Službene upute omogućuju prilagodbu implementacije vašem operacijskom sustavu. Nemojte dijeliti lozinke, privatne SSH ključeve ni datoteke s vjerodajnicama u razgovoru radi dobivanja pomoći.

Ako nemate poslužitelj ili tehničko znanje za instalaciju, javite nam se pa ćemo zajedno pronaći rješenje (upotrijebite mogućnost slanja poruka ovdje na GitHubu ili bilo koji od mojih kontaktnih podataka objavljenih na ovom računu).

---

<a id="en"></a>

## English

Version 1.0.0. A personal food diary with reports in Spanish and Croatian.

This version provides a food diary interface that can be installed on a server. It includes a translation model for creating bilingual reports. It does not use a database or require a translation API key.

Warning! This model was created with GPT6 under my supervision. Installation and use are the responsibility of the end user. It is important to read the licenses and not use it for commercial purposes. This is only a tool for monitoring your food intake. It is important to consult your doctor and/or nutritionist.

### Installation with an AI assistant

Open the [AI installation prompt](AI_INSTALLATION_PROMPT.md), copy the entire marked block into your AI assistant or agent framework, and supply your server settings. Request replies in English. The prompt covers server checks, installation, access, translation and backups. Execution requires authorized access to a terminal on your server; without it, the assistant can provide instructions. Enter passwords and private SSH keys only through a secure mechanism, never in the conversation.

### What is included

- A single password-protected user. Authentication protects the page and all reading, writing and translation operations.
- A diary stored in `/data/diary.json`, with atomic writes, concurrent change control and the last 50 versions in `/data/history/`.
- M2M100 418M translation on the server CPU, in a separate process. A translator failure does not prevent drafts from being saved. Note: the application can be used without the translator.
- Import of JSON backups from the previous version; export of backups and bilingual HTML/PDF reports.
- Docker Compose, a persistent volume for entries, another for the model, and Caddy for HTTPS.
- This package does not modify the original, previously hosted site.

### Requirements

The package is prepared for Linux with Docker Engine, the Docker Compose plugin and Python 3. As a starting point, allocate 2 CPU cores, 4 GB of available RAM (preferably 8 GB) and 10 GB of free disk space for container images, the model and data. This is an operational estimate, not a performance guarantee. No GPU is required. Validate it first on ARM servers or systems with very little memory; execution tests were performed on Linux x86_64.

Initial preparation downloads approximately 640 MB (611 MiB) of model files, in addition to container images and dependencies. Translation time depends on the CPU and text length. Transformers.js is pinned to version 3.8.1, and the model revision is pinned in `server/model.mjs`. The installation uses the CPU runtime and disables CUDA/TensorRT downloads.

Check the tools:

```bash
docker version
docker compose version
python3 --version
```

If you do not have Docker, follow the official guide for your distribution: https://docs.docker.com/engine/install/ and https://docs.docker.com/compose/install/linux/. The following commands assume that your user account can run Docker. Do not add services or change occupied ports without reviewing your server's existing configuration.

### Installation with a domain and HTTPS

1. Create a subdomain, such as `diario.midominio.com`, pointing to the server. The A record and, if present, the AAAA record must point to the correct addresses. TCP ports 80 and 443 must be free and accessible. If you already use Nginx, Apache, Traefik or Caddy, follow the section on an existing HTTPS proxy.

2. Clone this repository onto the server (Git is required) and configure access:

```bash
git clone https://github.com/Heribertosgp/dnevnik_prehrane.git
cd dnevnik_prehrane
python3 scripts/configure.py
```

The setup wizard asks for a domain, username and password. Enter a password of at least 16 characters. The password is neither displayed nor stored as plain text: its scrypt-derived value is stored in `secrets/owner.json`. The `.env` file contains the domain and model settings. The wizard refuses to overwrite existing credentials.

3. Build the application and prepare the model on the server:

```bash
docker compose build app
docker compose run --rm app npm run model:prepare
```

Wait for the `Model ready` message. The command displays two sample sentences and their translations; it does not use diary data. If it fails, check the messages and do not consider the translator installation complete.

4. After successful preparation, edit `.env` and change `MODEL_OFFLINE=0` to `MODEL_OFFLINE=1`. Translation will then use only files that have already been downloaded. If you update the model later, temporarily switch back to `0` while preparing it.

5. Start the site:

```bash
docker compose up -d
docker compose ps
docker compose logs --tail=60 app caddy
```

Open `https://diario.midominio.com` (your actual domain). Caddy obtains and renews the HTTPS certificate. The browser will ask for the credentials from step 2; these belong to this diary, not to ChatGPT. Do not share this password with your nutritionist.

The `app` service does not expose its port directly: only Caddy is exposed to the Internet. The server checks the password on every request and also checks the origin of modification requests. `/healthz` only indicates whether the process is active and does not display meals or configuration.

### If you already have an HTTPS proxy

Do not start the Caddy service included in this package. First configure the domain and user with `configure.py`, build the application and prepare the model as described above. Then:

```bash
docker compose -f compose.yml -f compose.proxy.yml up -d app
```

The application is available at `127.0.0.1:8080`, accessible only from the server. Configure your proxy to terminate HTTPS and forward requests to that address. It must preserve the `Authorization` header, allow JSON request bodies of up to 20 MB and allow a timeout of up to 660 seconds for preparation/translation. The `APP_ORIGIN` variable must exactly match the HTTPS origin you visit, with no trailing slash or subdirectory.

Do not install this diary under `/diario/`: this version expects its own domain or subdomain and paths starting at `/`. If your proxy runs in another container, adjust its Docker network; `127.0.0.1` inside that container is not the host.

### Private testing over SSH, without a public domain

You can test the application before configuring DNS. Run `configure.py` using `diario.example.com` as a temporary domain and prepare the model. Then start only the application:

```bash
docker compose -f compose.yml -f compose.local.yml up -d app
```

From your computer, open a tunnel, replacing `usuario` and `servidor` with your username and server:

```bash
ssh -L 8080:127.0.0.1:8080 usuario@servidor
```

Open exactly `http://127.0.0.1:8080` on your computer. The connection to the server travels through SSH. Do not change the published address to `0.0.0.0:8080`: password-protected HTTP is used here only inside the tunnel. To move to production, configure your actual domain and start the HTTPS variant, recreating the service with its new settings.

### Recovering previous entries

1. On the previous site, using the same browser and profile in which you wrote your entries, open **Copias de seguridad → Descargar copia JSON** (Backups → Download JSON backup).
2. On the new site, open **Copias de seguridad → Seleccionar copia JSON** (Backups → Select JSON backup) and import that file.
3. Check several dates and both language versions of each entry. Keep the original file.

Import adds entries and keeps the newer version when it finds the same identifier. Incomplete translations remain drafts. If the old browser data has already been deleted and no backup exists, the new server cannot recover it. It also cannot automatically read storage from the old domain.

### Sharing with your nutritionist

Write in one of the supported languages, select that language and click **Traducir ES ↔ HR** (Translate ES ↔ HR). Review both texts, mark them as reviewed and save. The translator supports entries in Spanish, Croatian, English, German, French, Italian and Portuguese; the report always uses Spanish and Croatian.

In **Compartir informe** (Share report), select the dates. Download the HTML or use **Imprimir / PDF** (Print / PDF). Send that file to your nutritionist. It contains no editor, password or connection to your diary. The copy does not update automatically, and the recipient can forward it. There is no public link to the diary.

If translation fails, save a draft and try again later. Always review quantities, negations and food names. The model can make mistakes.

### Checking that the installation works

1. Open a private browser window: the site must ask for a username and password. An incorrect password must not grant access.
2. Save an entry in Spanish, translate it and review the Croatian text. Also test an entry originally written in Croatian.
3. Restart the application with `docker compose restart app`. Check that the entry is still there and can be seen after signing in from another browser.
4. Export a report and a JSON backup. Check printing/PDF in the browser you plan to use.
5. Import a known backup and confirm the dates.

The package includes automated tests for authentication, rejection of writes from other origins, persistence after restart, concurrent conflicts, safe failure with corrupted files, saving when translation fails, backup validation and bilingual export. The actual model was run in Spanish and Croatian, both with downloads and with the cache in offline mode. The Docker/Caddy build could not be run in the preparation environment because Docker was unavailable; the interface was not checked in a graphical browser. Complete these checks on your server.

### Backups and restoration

The `diary_data` and `model_cache` volumes retain data across container restarts and recreation. **Do not run `docker compose down -v`**, as it deletes the volumes and the diary with them. Volume persistence does not protect against disk failure or deletion of the server.

In addition to downloading from the interface, you can create a backup from the host:

```bash
bash scripts/backup.sh
```

A JSON file is created in `backups/` without stopping the service. Copy these files off the server using your backup system. Do not include the JSON files in a public repository. Also keep the configuration and `secrets/owner.json` in a private backup. The model can be downloaded again.

To schedule daily backups, add a cron entry under an account with Docker permissions, using the actual project path:

```cron
15 3 * * * /bin/bash /ruta/mesa-stol-server/scripts/backup.sh >> /ruta/mesa-stol-server/backups.log 2>&1
```

This schedule uses the server's time zone. The script does not delete old backups; define your retention and off-server backup policy.

For normal recovery, import the JSON through the interface. In the event of a complete loss, reinstall the package, create new credentials if necessary and import the latest backup.

If `diary.json` becomes corrupted, the application refuses to start so that it does not overwrite the file. Stop the service before intervening. An administrator can mount `diary_data` in a temporary container and recover a version from `/data/history/`; preserve the corrupted file and a copy of the volume before replacing it. No silent restoration is performed.

### Maintenance

- Keep only one instance of `app` writing to this volume. The write queue is not designed for multiple simultaneous containers.
- To update the code, preserve `.env`, `secrets/` and the volumes; make a backup, then run `docker compose build app` and `docker compose up -d`.
- To change the password, stop `app`, move `secrets/owner.json` to a private backup, run `configure.py` and recreate the service. The existing `.env` configuration is preserved. Restart the browser if it keeps using the previous password.
- Meal contents are not written to logs. However, the JSON backup and the server disk contain readable text; protect access to the host and your backups.
- The project code uses GNU GPL version 3 (`GPL-3.0-only`); the repository's `LICENSE` file is preserved. M2M100 418M uses MIT and Transformers.js uses Apache-2.0. See `THIRD_PARTY_NOTICES.md` and `DEPENDENCIES.json` for dependencies and notices. No third-party services are used to translate the content.

### Common problems

| Symptom | What to check |
|---|---|
| «Origen no autorizado» (Unauthorized origin) | `APP_ORIGIN` must exactly match the scheme, domain and port you use. Do not mix `localhost` and `127.0.0.1`. Recreate `app` after changing `.env`. |
| HTTPS certificate pending | DNS A/AAAA, access to TCP ports 80/443, occupied ports and Caddy logs. |
| «El motor se detuvo» (The engine stopped) or exit code 137 | Available memory. Increase RAM, reduce `MODEL_THREADS` or change your approach if the server is too small. |
| Translation cannot find files | Prepare the model with `MODEL_OFFLINE=0`; wait for `Model ready` and switch back to `1`. Preserve the `model_cache` volume. |
| Response 409 when saving | Another device changed the diary. Keep your text and reopen the current entry before applying your changes. |
| Response 429 when translating | A translation is already in progress; wait. Only one is processed at a time. |
| Response 429 when signing in | Twenty failed password attempts temporarily block authentication; wait ten minutes. |
| No disk space | Saving fails without a success confirmation. Free up space and review backup retention. |

### Technical sources

- Docker Engine: https://docs.docker.com/engine/install/
- Docker Compose: https://docs.docker.com/compose/install/linux/
- Caddy and HTTPS: https://caddyserver.com/docs/automatic-https
- Inference in Node.js: https://huggingface.co/docs/transformers.js/tutorials/node
- Model, files and license: https://huggingface.co/Xenova/m2m100_418M

The official guides let you adapt deployment to your operating system. Do not share passwords, private SSH keys or credential files in a chat to get help.

If you do not have a server or the technical skills to install the application, contact us and we will find a solution together (use the messaging function here on GitHub or any of my contact details published on this account).

---

<a id="es"></a>

## Español

Versión 1.0.0. Diario personal de comidas con informes en español y croata.

Esta versión presenta una interfaz de un diario de comidas que se puede instalar en un servidor. Contiene un modelo de traducción para crear informes bilingües. No utiliza base de datos ni necesita una clave de API de traducción.

Advertencia! Este modelo fue creado con GPT6 bajo mi supervisión. La instalación y el uso son responsabilidad del usuario final. Es importante que lea las licencias y no se use con fines comerciales. Esto sólo es un herramienta para monitorear sus ingestas. Es importante que consulte a su médico y/o nutricionista.

### Instalación con un asistente de IA

Abre el [prompt de instalación con IA](AI_INSTALLATION_PROMPT.md), copia el bloque marcado completo en tu asistente de IA o sistema de agentes e indica la configuración de tu servidor. Solicita las respuestas en español. El prompt guía la revisión del servidor, la instalación, el acceso, la traducción y las copias de seguridad. Para ejecutar los pasos necesita acceso autorizado a una terminal de tu servidor; sin él, puede darte instrucciones. Introduce contraseñas y claves SSH privadas únicamente mediante un mecanismo seguro, nunca en la conversación.

### Qué incluye

- Un único usuario, con contraseña. La autenticación protege la página y todas las operaciones de lectura, escritura y traducción.
- Diario en `/data/diary.json`, con escritura atómica, control de cambios concurrentes y las últimas 50 versiones en `/data/history/`.
- Traducción M2M100 418M en la CPU del servidor, en un proceso separado. Una avería del traductor no impide guardar borradores. Nota: La aplicación se puede usar sin el traductor.
- Importación de las copias JSON de la versión anterior; exportación de copias e informes bilingües HTML/PDF.
- Docker Compose, un volumen persistente para las entradas, otro para el modelo y Caddy para HTTPS.
- El sitio original alojado anteriormente no se modifica con este paquete.

### Requisitos

El paquete está preparado para Linux con Docker Engine, el complemento Docker Compose y Python 3. Como punto de partida, reserva 2 núcleos, 4 GB de RAM disponibles (preferiblemente 8 GB) y 10 GB libres para imágenes, modelo y datos. Es una estimación operativa, no una garantía de rendimiento. No necesita GPU. Valida primero en servidores ARM o con muy poca memoria; las pruebas de ejecución se hicieron en Linux x86_64.

La primera preparación descarga aproximadamente 640 MB (611 MiB) del modelo, además de las imágenes y dependencias. La duración de cada traducción dependerá de la CPU y la longitud del texto. La versión fija de Transformers.js es 3.8.1 y la revisión del modelo está fijada en `server/model.mjs`. La instalación usa el motor CPU y desactiva la descarga de CUDA/TensorRT.

Comprueba las herramientas:

```bash
docker version
docker compose version
python3 --version
```

Si no tienes Docker, sigue la guía oficial para tu distribución: https://docs.docker.com/engine/install/ y https://docs.docker.com/compose/install/linux/. Los comandos siguientes asumen que tu usuario puede ejecutar Docker. No añadas servicios ni cambies puertos ocupados sin revisar la configuración que ya tiene tu servidor.

### Instalación con dominio y HTTPS

1. Crea un subdominio, por ejemplo `diario.midominio.com`, que apunte al servidor. El registro A y, si existe, AAAA deben apuntar a direcciones correctas. Los puertos TCP 80 y 443 deben estar libres y ser accesibles. Si ya usas Nginx, Apache, Traefik o Caddy, sigue la sección de proxy existente.

2. Clona este repositorio en el servidor (necesitas Git) y configura el acceso:

```bash
git clone https://github.com/Heribertosgp/dnevnik_prehrane.git
cd dnevnik_prehrane
python3 scripts/configure.py
```

El asistente solicita dominio, usuario y contraseña. Introduce al menos 16 caracteres. La contraseña no aparece en pantalla ni se guarda en texto plano: se almacena su derivación scrypt en `secrets/owner.json`. `.env` contiene el dominio y los ajustes del modelo. El asistente se niega a sobrescribir credenciales existentes.

3. Construye la aplicación y prepara el modelo en el servidor:

```bash
docker compose build app
docker compose run --rm app npm run model:prepare
```

Espera el mensaje `Model ready`. La orden muestra dos frases de prueba y sus traducciones; no utiliza datos de tu diario. Si falla, consulta los mensajes y no des por terminada la instalación del traductor.

4. Tras una preparación correcta, edita `.env` y cambia `MODEL_OFFLINE=0` por `MODEL_OFFLINE=1`. De este modo la traducción sólo utiliza los archivos ya descargados. Si actualizas el modelo más adelante, vuelve temporalmente a `0` durante su preparación.

5. Arranca el sitio:

```bash
docker compose up -d
docker compose ps
docker compose logs --tail=60 app caddy
```

Abre `https://diario.midominio.com` (tu dominio real). Caddy solicita y renueva el certificado HTTPS. El navegador te pedirá las credenciales del paso 2; son las de este diario, no las de ChatGPT. No compartas esa contraseña con tu nutrióloga.

El servicio `app` no publica su puerto directamente: sólo Caddy se expone a Internet. El servidor comprueba la contraseña en cada petición, además de verificar el origen de las modificaciones. `/healthz` únicamente indica si el proceso está activo y no muestra comidas ni configuración.

### Si ya tienes un proxy HTTPS

No arranques el servicio Caddy de este paquete. Configura primero el dominio y usuario con `configure.py`, construye y prepara el modelo como arriba. Después:

```bash
docker compose -f compose.yml -f compose.proxy.yml up -d app
```

La aplicación queda en `127.0.0.1:8080`, sólo accesible desde el servidor. Haz que tu proxy termine HTTPS y reenvíe a esa dirección. Debe conservar el encabezado `Authorization`, permitir cuerpos JSON de hasta 20 MB y una espera de hasta 660 segundos para la preparación/traducción. La variable `APP_ORIGIN` debe coincidir exactamente con el origen HTTPS visitado, sin barra final ni subcarpeta.

No instales este diario bajo `/diario/`: esta versión espera un dominio o subdominio propio y rutas desde `/`. Si tu proxy está en otro contenedor, debes ajustar su red de Docker; `127.0.0.1` dentro de ese contenedor no es el host.

### Prueba privada por SSH, sin dominio público

Puedes comprobarlo antes de configurar DNS. Ejecuta `configure.py` usando `diario.example.com` como dominio provisional y prepara el modelo. Luego inicia solamente la aplicación:

```bash
docker compose -f compose.yml -f compose.local.yml up -d app
```

Desde tu ordenador abre un túnel, sustituyendo usuario y servidor:

```bash
ssh -L 8080:127.0.0.1:8080 usuario@servidor
```

Abre exactamente `http://127.0.0.1:8080` en tu ordenador. La conexión al servidor viaja por SSH. No cambies la publicación a `0.0.0.0:8080`: HTTP con contraseña sólo se utiliza aquí dentro del túnel. Para pasar a producción, configura tu dominio real y arranca la variante HTTPS, recreando el servicio con sus nuevos ajustes.

### Recuperar las entradas anteriores

1. En el sitio anterior, usando el mismo navegador y perfil donde escribiste, abre **Copias de seguridad → Descargar copia JSON**.
2. En el nuevo sitio, abre **Copias de seguridad → Seleccionar copia JSON** e importa ese archivo.
3. Comprueba varias fechas y las dos versiones de cada entrada. Conserva el archivo original.

La importación añade entradas y conserva la versión más reciente si encuentra el mismo identificador. Las traducciones incompletas siguen siendo borradores. Si los datos del navegador antiguo ya se borraron y no existe copia, el servidor nuevo no puede recuperarlos. Tampoco puede leer automáticamente el almacenamiento del dominio antiguo.

### Compartir con tu nutrióloga

Escribe en uno de los idiomas admitidos, selecciona ese idioma y pulsa **Traducir ES ↔ HR**. Revisa ambos textos, marca la revisión y guarda. El traductor admite entradas en español, croata, inglés, alemán, francés, italiano y portugués; el informe siempre utiliza español y croata.

En **Compartir informe**, elige fechas. Descarga el HTML o usa **Imprimir / PDF**. Envía ese archivo a tu nutrióloga. No incluye editor, contraseña ni conexión con tu diario. La copia no se actualiza automáticamente y quien la recibe puede reenviarla. No hay enlace público al diario.

Si la traducción falla, guarda un borrador y reintenta más tarde. Siempre revisa cantidades, negaciones y nombres de alimentos. El modelo puede equivocarse.

### Comprobar que la instalación funciona

1. Abre una ventana privada: el sitio debe solicitar usuario y contraseña. Una contraseña incorrecta no debe permitir entrar.
2. Guarda una entrada en español, tradúcela y revisa el croata. Haz también una prueba con una entrada original croata.
3. Reinicia la aplicación con `docker compose restart app`. Comprueba que la entrada sigue allí y se ve desde otro navegador al iniciar sesión.
4. Exporta un informe y una copia JSON. Comprueba la impresión/PDF en el navegador que vayas a usar.
5. Importa una copia conocida y confirma las fechas.

El paquete tiene pruebas automatizadas de autenticación, rechazo de escrituras desde otros orígenes, persistencia tras reiniciar, conflictos concurrentes, fallo seguro con archivos dañados, guardado cuando falla la traducción, validación de copias y exportación bilingüe. Se ejecutó el modelo real en español y croata, tanto con descarga como con caché en modo sin red. La construcción Docker/Caddy no pudo ejecutarse en el entorno de preparación porque no había Docker; la interfaz no se verificó en un navegador gráfico. Completa estas comprobaciones en tu servidor.

### Copias de seguridad y restauración

Los volúmenes `diary_data` y `model_cache` sobreviven al reinicio y a la recreación de contenedores. **No ejecutes `docker compose down -v`**, ya que elimina los volúmenes y con ellos el diario. La supervivencia de un volumen no protege de un fallo del disco o de la eliminación del servidor.

Además de la descarga desde la interfaz, puedes crear una copia desde el host:

```bash
bash scripts/backup.sh
```

Se crea un JSON en `backups/`, sin detener el servicio. Copia estos archivos fuera del servidor con el sistema de respaldo que uses. No incluyas los JSON en un repositorio público. Guarda también la configuración y `secrets/owner.json` en un respaldo privado. El modelo se puede volver a descargar.

Para programar copias diarias, instala una entrada de cron en la cuenta con permiso de Docker, usando la ruta real del proyecto:

```cron
15 3 * * * /bin/bash /ruta/mesa-stol-server/scripts/backup.sh >> /ruta/mesa-stol-server/backups.log 2>&1
```

Este horario usa la zona horaria del servidor. El script no borra copias antiguas; define tu política de retención y copia externa.

Para una recuperación normal, importa el JSON desde la interfaz. Para una pérdida completa, reinstala el paquete, crea nuevas credenciales si es necesario e importa la última copia.

Si `diary.json` se daña, la aplicación se niega a arrancar para no sobrescribirlo. Detén el servicio antes de intervenir. Un administrador puede montar `diary_data` en un contenedor temporal y recuperar una versión de `/data/history/`; conserva el archivo dañado y una copia del volumen antes de reemplazarlo. No se hace una restauración silenciosa.

### Mantenimiento

- Mantén una única instancia de `app` escribiendo en este volumen. La cola de escritura no está diseñada para varios contenedores simultáneos.
- Para actualizar el código, conserva `.env`, `secrets/` y los volúmenes; haz una copia y ejecuta `docker compose build app` y `docker compose up -d`.
- Para cambiar la contraseña, detén `app`, mueve `secrets/owner.json` a un respaldo privado, ejecuta `configure.py` y recrea el servicio. La configuración `.env` existente se conserva. Reinicia el navegador si sigue usando la contraseña anterior.
- No se registra el contenido de las comidas en los logs. La copia JSON y el disco del servidor sí contienen texto legible; protege el acceso al host y tus respaldos.
- El código del proyecto usa GNU GPL versión 3 (`GPL-3.0-only`); se conserva el archivo `LICENSE` del repositorio. M2M100 418M usa MIT y Transformers.js usa Apache-2.0. Consulta `THIRD_PARTY_NOTICES.md` y `DEPENDENCIES.json` para las dependencias y los avisos. No incluye servicios de terceros para traducir el contenido.

### Problemas frecuentes

| Síntoma | Qué revisar |
|---|---|
| «Origen no autorizado» | `APP_ORIGIN` debe ser exactamente el esquema, dominio y puerto que usas. No mezcles `localhost` y `127.0.0.1`. Recrea `app` al cambiar `.env`. |
| Certificado HTTPS pendiente | DNS A/AAAA, acceso a TCP 80/443, puertos ocupados y logs de Caddy. |
| «El motor se detuvo» o salida 137 | Memoria disponible. Aumenta RAM, reduce `MODEL_THREADS` o cambia de estrategia si el servidor es demasiado pequeño. |
| Traducción no encuentra archivos | Prepara el modelo con `MODEL_OFFLINE=0`; espera `Model ready` y vuelve a `1`. Conserva el volumen `model_cache`. |
| Respuesta 409 al guardar | Otro dispositivo cambió el diario. Conserva tu texto y vuelve a abrir la entrada actual antes de aplicar tus cambios. |
| Respuesta 429 al traducir | Ya hay una traducción en curso; espera. Sólo se procesa una cada vez. |
| Respuesta 429 al entrar | Veinte intentos de contraseña fallidos bloquean temporalmente la autenticación; espera diez minutos. |
| Sin espacio en disco | El guardado falla sin confirmación de éxito. Libera espacio y revisa la retención de respaldos. |

### Fuentes técnicas

- Docker Engine: https://docs.docker.com/engine/install/
- Docker Compose: https://docs.docker.com/compose/install/linux/
- Caddy y HTTPS: https://caddyserver.com/docs/automatic-https
- Inferencia en Node.js: https://huggingface.co/docs/transformers.js/tutorials/node
- Modelo, archivos y licencia: https://huggingface.co/Xenova/m2m100_418M

Las guías oficiales permiten adaptar el despliegue a tu sistema operativo. No entregues contraseñas, claves privadas SSH ni archivos de credenciales en un chat para obtener ayuda.
Si no tienes un servidor o no tienes la habilidad técnica para hacer la instalación ponte en contacto con nosotros y encontraremos juntos una solución (utiliza la función de mensaje aquí en github o cualquiera de mis datos de contacto publicados en esta cuenta).
