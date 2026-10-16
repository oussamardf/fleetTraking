# 📅 Configuration Google Calendar — Rappels automatiques (Étape 4)

## Objectif

Lors de l'ajout d'un **véhicule** dans l'espace admin, l'application crée
automatiquement **un événement « Journée entière » par document** (Assurance,
Visite Technique, Vignette) dans un agenda Google, à la date
`date_notification` (**J-4** avant l'expiration). L'ID Google de chaque
événement est stocké dans `documents_vehicule.calendar_event_id`.

```
Server Action (src/actions/vehicules.ts)
        │
        ├──▶ Supabase : insert vehicule + 3 documents
        │
        └──▶ src/lib/google-calendar.ts ──▶ Google Calendar API
                                    │            (Service Account)
                                    └────────────▶ event_id → calendar_event_id
```

> ℹ️ L'authentification utilise un **Service Account** (compte de service),
> pas d'OAuth utilisateur. Aucun écran de consentement n'est nécessaire.
> Le code se trouve dans `src/lib/google-calendar.ts`.

---

## Prérequis

- Un projet **Google Cloud**.
- Un agenda **Google Agenda** auquel vous avez accès (personnel ou Google Workspace).
- Le package `googleapis` (déjà présent dans `package.json`).

---

## Étape 1 — Activer l'API Google Calendar

1. Ouvrez la [Console Google Cloud](https://console.cloud.google.com/).
2. Sélectionnez (ou créez) votre projet.
3. Allez dans **APIs & Services → Library**.
4. Recherchez **Google Calendar API** → **Enable**.

---

## Étape 2 — Créer le Service Account et sa clé

1. Allez dans **IAM & Admin → Service Accounts** → **Create Service Account**.
2. Nom : `Fleet Tracking Calendar Bot` (peu importe).
3. Cliquez sur **Create and continue**, puis **Done** (aucun rôle IAM sur le
   projet n'est nécessaire : l'accès se fait au niveau de l'agenda, cf. étape 4).
4. Ouvrez le Service Account créé → onglet **Keys** →
   **Add key → Create new key → JSON**.
5. Un fichier `.json` est téléchargé. **Notez** les deux champs :
   - `client_email` → c'est la valeur de `GOOGLE_CLIENT_EMAIL`
   - `private_key` → c'est la valeur de `GOOGLE_PRIVATE_KEY`

Exemple de fichier JSON :

```json
{
  "type": "service_account",
  "project_id": "mon-projet",
  "private_key_id": "…",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE…\n-----END PRIVATE KEY-----\n",
  "client_email": "fleet-tracking-bot@mon-projet.iam.gserviceaccount.com",
  "client_id": "…"
}
```

---

## Étape 3 — Créer / choisir l'agenda et récupérer son ID

1. Ouvrez [Google Agenda](https://calendar.google.com/).
2. Créez un agenda dédié, par exemple **« Alertes échéances véhicules »**
   (**Autres agendas → + → Créer un agenda**).
3. Après création, ouvrez **Paramètres et partage** de cet agenda.
4. Descendez jusqu'à la section **Intégrer l'agenda** : l'**ID de l'agenda**
   ressemble à :

   ```
   xxxxxxxxxxxxxxxxxxxxxxxx@group.calendar.google.com
   ```

   (Pour un agenda personnel, l'ID est généralement votre adresse e-mail,
   mais un agenda dédié est fortement recommandé.)
5. Copiez cette valeur → ce sera `GOOGLE_CALENDAR_ID`.

---

## Étape 4 — Partager l'agenda avec le Service Account ⚠️

C'est **l'étape la plus souvent oubliée**. Sans ce partage, l'API renvoie
`403 Forbidden` ou `404 Not Found`.

1. Toujours dans **Paramètres et partage** de l'agenda (étape 3).
2. Section **Partager avec des personnes ou des groupes spécifiques** →
   **Ajouter des personnes**.
3. Collez l'adresse `client_email` du Service Account
   (`fleet-tracking-bot@mon-projet.iam.gserviceaccount.com`).
4. Choisissez l'autorisation **« Apporter des modifications aux événements »**
   (*Make changes to events*). Le rôle **Propriétaire** fonctionne aussi mais
   n'est pas nécessaire.
5. Cliquez sur **Envoyer** / **Enregistrer**.
6. Selon les paramètres de votre organisation, vous devrez peut-être cocher
   **« Rendre disponible pour les personnes extérieures à l'organisation »**
   (ou vérifier que le partage externe est autorisé par votre domaine).

---

## Étape 5 — Renseigner `.env.local`

Ajoutez ces trois variables dans `.env.local` (voir le modèle
`.env.local.example`) :

```bash
# ── Google Calendar (Service Account) ────────────────────────────────────────
GOOGLE_CLIENT_EMAIL=fleet-tracking-bot@mon-projet.iam.gserviceaccount.com

# La clé privée DOIT rester entre guillemets et conserver les \n littéraux ;
# le module les convertit en vrais retours à la ligne (normaliserClePrivee()).
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

GOOGLE_CALENDAR_ID=xxxxxxxxxxxxxxxxxxxxxxxx@group.calendar.google.com
```

### Format de `GOOGLE_PRIVATE_KEY`

- ✅ **Recommandé** : copiez tel quel le champ `private_key` du JSON, entre
  guillemets doubles, en gardant les `\n`. Le code fait
  `privateKey.replace(/\\n/g, '\n')`.
- ✅ Vous pouvez aussi coller un vrai PEM multi-ligne entre guillemets — le code
  gère les deux cas.
- ❌ N'enlevez **pas** les en-têtes `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----`.
- ❌ Ne supprimez pas les `\n` (sinon la clé devient invalide).

> 🔐 Ces valeurs sont **secrètes**. Ne les committez jamais : `.env.local` doit
> rester ignoré par Git (c'est le cas par défaut).

---

## Étape 6 — Migration base de données (si nécessaire)

La table `documents_vehicule` doit comporter les colonnes
`date_notification (date)` et `calendar_event_id (text)`. Si elles n'existent
pas, exécutez le script fourni dans l'éditeur SQL Supabase :

```
sql/003_documents_vehicule_calendar.sql
```

Il est **idempotent** (`ADD COLUMN IF NOT EXISTS`), vous pouvez le relancer
sans risque.

---

## Vérifier la configuration

1. Lancez le serveur : `npm run dev`.
2. Ajoutez un véhicule via **/admin**.
3. Regardez les logs du terminal :
   - ✅ `[ajouterVehicule] Google Calendar : 3/3 événement(s) créé(s)…`
   - ⚠️ `[google-calendar] Variables manquantes …` → une variable `.env.local`
     est absente (redémarrez le serveur après modification du `.env.local`).
   - ⚠️ `[ajouterVehicule] Calendar non créé pour ASSURANCE …` → erreur API
     (voir le tableau de dépannage).
4. Ouvrez l'agenda cible : les 3 événements doivent apparaître à la date
   d'expiration − 4 jours, avec un titre du type :

   ```
   ⚠️ Alerte échéance : Assurance - Camion 07 — AB-123-CD
   ```

> 💡 Un échec Google Calendar **n'empêche jamais** l'ajout du véhicule : les
> documents sont enregistrés avec `calendar_event_id = null` et l'erreur est
> simplement journalisée.

---

## Dépannage

| Erreur Google | Cause probable | Solution |
|---------------|----------------|----------|
| `403 Forbidden` / `404 Not Found` | Agenda non partagé avec le Service Account | Étape 4 : partager l'agenda avec `client_email` |
| `403` après partage | Mauvais `GOOGLE_CALENDAR_ID` | Vérifier l'ID dans **Intégrer l'agenda** |
| `invalid_grant` / `Invalid JWT` | Clé privée mal collée | Garder les `\n`, ne pas retirer les en-têtes PEM |
| `decoder error` | `GOOGLE_PRIVATE_KEY` sans les `\n` | Recopier le JSON d'origine (Étape 2) |
| `Google Calendar non configuré` | Variable(s) `.env.local` manquante(s) | Renseigner les 3 variables puis redémarrer `npm run dev` |
| `Calendar API has not been used…` | API désactivée | Étape 1 |

Commandes utiles (Google Cloud CLI) :

```bash
gcloud iam service-accounts list
gcloud services enable calendar-json.googleapis.com --project mon-projet
```

---

## Déploiement (Vercel / production)

Ajoutez les mêmes trois variables dans **Project → Settings → Environment
Variables**, puis redéployez. En production, collez la clé avec les `\n`
littéraux : les champs de formulaire Vercel conservent la chaîne telle quelle.

---

## Références

- [Google Calendar API — Events.insert](https://developers.google.com/calendar/api/v3/reference/events/insert)
- [Service Account — concepts](https://cloud.google.com/iam/docs/service-account-overview)
- [Événements « journée entière »](https://developers.google.com/calendar/api/v3/reference/events#start.end)
