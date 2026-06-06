# Onze d'Or — Design

> Jeu de draft football inspiré d'Onze de Rêve, avec des notes de joueurs plus justes
> (modes Prime / Saison) et de la profondeur post-partie (carrière, défi quotidien,
> objectifs, collection). PWA mobile + desktop.

Date : 2026-06-06
Statut : design validé en brainstorming, à relire avant plan d'implémentation.

---

## 1. Vision

Recréer l'expérience d'Onze de Rêve — composer son XI par draft puis simuler une
saison/coupe — en corrigeant ses deux faiblesses ressenties :

1. **La justesse des notes.** Notes dérivées de stats réelles, avec deux modes :
   - **Prime** : la meilleure saison de chaque joueur.
   - **Saison** : la note de la saison précise représentée par la carte.
2. **Le manque de profondeur.** Après une partie, on n'est plus dans un cul-de-sac
   "rejouer" : carrière multi-saisons, défi quotidien classé, objectifs/contraintes,
   collection, et classements de fin de saison (championnat, buteurs, passeurs,
   meilleur gardien, meilleure note).

Périmètre : **Ligue 1 + Ligue 2, 2000–2026**.

---

## 2. Le modèle de note (cœur du projet)

C'est la pièce maîtresse et la plus risquée. Tout en dépend.

### 2.1 Granularité

Une note par **(joueur, saison)**. La note est sur une échelle **0–99** (style FUT),
**comparable entre postes** grâce à une normalisation par poste.

### 2.2 Notation par poste

On ne note pas un gardien comme un attaquant. Chaque poste a une formule pondérée
sur les métriques pertinentes :

- **Gardien** : clean sheets, % arrêts, buts encaissés / 90, (post-2017 : PSxG−GA).
- **Défenseur** : tacles + interceptions, duels gagnés, % passes, clean sheets équipe,
  buts/passes déc. (bonus).
- **Milieu** : % passes, passes progressives, passes déc./xA, récupérations, buts.
- **Attaquant** : buts, xG, passes déc./xA, minutes, ratio buts/match.

Les valeurs brutes sont normalisées (percentile) **par poste et par saison**, puis
ramenées sur l'échelle 0–99. Une star ressort en tête de sa saison ; un MVP de
sanity-check (les joueurs attendus doivent dominer) valide la calibration.

### 2.3 Modèle à deux niveaux (selon données disponibles)

| Tier | Période / source | Données | Fiabilité affichée |
|------|------------------|---------|--------------------|
| **Riche** | ≈2017→2026 (L1) | Stats avancées FBref/StatsBomb : xG, xA, actions déf., passes prog., % passes | ●●●● fiable |
| **Base** | 2000→2017, L2 ancienne | Buts, passes déc., minutes, matchs, cartons **+ valeur marchande Transfermarkt** (proxy de niveau) | ◐ estimée |

La **valeur marchande Transfermarkt** (disponible dès 2000) sert d'ancrage pour les
saisons sans stats avancées, pour éviter qu'un grand joueur d'avant 2017 soit
sous-noté.

Chaque carte affiche un **indicateur de fiabilité** (4 crans : `●●●●` → `○`) pour être
transparent sur la qualité de la note. C'est un élément d'UI assumé, pas caché.

### 2.4 Prime vs Saison

- **Saison** : le draft propose des cartes `(joueur, saison)` ; la note est celle de
  cette saison.
- **Prime** : chaque joueur est proposé à sa **meilleure saison** (note max sur la
  période). `prime_season_id` est pré-calculé par joueur.

### 2.5 Override admin (édition manuelle des notes)

La note calculée n'est jamais parfaite, surtout sur le tier base. Un **back-office admin**
permet de **corriger une note à la main**, qui devient prioritaire sur la note calculée.

- On conserve toujours la **note calculée** ET la **note override** séparément (jamais
  d'écrasement destructif) ; la note effective = override si présent, sinon calculée.
- Une carte ajustée manuellement porte un repère « ajustée » côté données (l'indicateur
  de fiabilité peut alors passer au cran « validée à la main »).
- Accès **réservé à un rôle admin**. Fonctions : rechercher un joueur, lister ses
  saisons + notes, éditer une note (avec note d'origine visible), réinitialiser à la
  note calculée. Édition en masse simple (filtrer par poste/saison/tier).
- Réservé à toi : pas exposé aux joueurs.

---

## 3. Pipeline d'ingestion des données

**Hors-ligne**, séparé de l'app. L'app ne fait que **lire** des données déjà calculées.

- Étapes : récupération sources → normalisation → calcul des notes (par poste, par
  tier) → calcul des `prime_season` → écriture en base.
- Sources : FBref/StatsBomb (stats), Transfermarkt (valeur marchande, proxy).
- Récupération **respectueuse** : rate-limiting, cache local des pages/CSV, ré-exécution
  idempotente. Privilégier les exports CSV / datasets quand ils existent plutôt que le
  scraping page par page.
- Langage : **TypeScript** (un seul langage avec l'app). Repli Python possible si une
  lib de scraping s'avère nettement plus simple — décision au moment du plan Phase 0.
- Le pipeline produit un jeu de données versionné rechargeable (re-run reproductible).

> Risque principal du projet : qualité/disponibilité des données pré-2017 et L2. Mitigé
> par le modèle à deux niveaux + l'indicateur de fiabilité. À valider **en premier**.

---

## 4. Boucle de jeu (cœur)

1. **Choix du mode** : Prime ou Saison (sur l'accueil).
2. **Draft** : pour chaque poste de la formation (11 postes), on propose **N candidats**
   (≈3) tirés du pool selon le poste + les contraintes actives. Le joueur en choisit un.
3. **Note d'équipe** : moyenne (pondérée par ligne si besoin) des notes des 11 joueurs.
4. **Simulation** : génère une saison plausible (voir §5).
5. **Écran de fin** : note d'équipe, résultat, classements, puis carrefour de profondeur
   (carrière / partage / collection / objectifs) — jamais un simple "rejouer".

Formation : un set de formations classiques (4-3-3, 4-4-2, 3-5-2…), choisie au départ.

---

## 5. Simulation de saison

Modèle **probabiliste léger et déterministe** (seedé pour reproductibilité et tests) —
pas de moteur de match lourd.

- La force d'équipe (et par ligne) → buts attendus par match → résultats via loi de
  Poisson contre des adversaires générés.
- Génère un **classement de championnat** crédible (ton équipe surlignée).
- Répartit les buts/passes entre tes joueurs selon leurs notes offensives → alimente les
  **classements individuels**.

Classements de fin de saison produits :
- **Championnat** (ton équipe surlignée, champion / relégables colorés).
- **Buteurs**, **passeurs**, **meilleur gardien** (clean sheets), **meilleure note** du
  championnat — tes joueurs apparaissent dedans, trophées (Soulier d'Or…) déblocables.

Objectif ultime conservé : la **saison invincible**.

---

## 6. Piliers de profondeur

Tous retenus, livrés par phases (voir §9).

- **Carrière multi-saisons** : on garde son XI sur plusieurs saisons ; résultats,
  classement, montée/descente, recrutement entre saisons, évolution de la valeur des
  joueurs. Donne un fil conducteur.
- **Défi du jour + classement** : un draft contraint commun à tous chaque jour (mêmes
  candidats proposés), score comparé à la communauté, partage du résultat (effet Wordle).
- **Objectifs & contraintes de draft** : budget, quotas (1 joueur/club, X français, une
  époque…), défis thématiques, système de points. Forte rejouabilité sans nouveau contenu.
- **Palmarès & collection** : cartes Prime débloquées et collectionnées, trophées
  persistants, galerie, statistiques de parties.

---

## 7. Architecture & technologies

- **Next.js (App Router) + TypeScript**, full-stack (UI + routes API), un seul codebase.
- **PWA** installable mobile + desktop (manifest + service worker).
- **PostgreSQL** (Neon), ORM **Prisma** (maturité/maintenabilité ; Drizzle en alternative
  plus légère — tranché au plan).
- **Auth légère** pour la persistance (carrière, collection, classement) : anonyme par
  device d'abord, puis magic link. Introduite en phase de persistance, pas avant.
- **Pipeline d'ingestion** : scripts séparés (§3), exécutés hors-ligne.
- **Déploiement** : Vercel + Neon.
- **UI** : direction visuelle « gaming / cartes » sombre & dorée (validée en maquette),
  responsive mobile-first puis desktop.

### Découpage en unités

- `ratings/` — calcul des notes (pur, testable, sans I/O).
- `ingestion/` — scripts de récupération + écriture base (hors app runtime).
- `simulation/` — moteur probabiliste seedé (pur, testable).
- `draft/` — règles de tirage des candidats + contraintes/objectifs.
- `admin/` — back-office d'édition des notes (override), réservé au rôle admin.
- `app/` — UI Next.js (écrans : accueil, draft, fin, carrière, collection, défi).
- `db/` — schéma + accès données.

Chaque unité a un rôle clair, une interface définie, et est testable isolément.

---

## 8. Modèle de données (tables clés, esquisse)

- `clubs` — clubs.
- `players` — identité joueur, `prime_season_id`.
- `player_seasons` — `(player, season)` : stats brutes, **note calculée**
  (`rating_computed`), **note override admin** (`rating_override`, nullable), **tier de
  fiabilité**, poste, valeur marchande. Note effective = override si présent, sinon
  calculée.
- `users` — comptes (device anonyme puis email) + **rôle** (`player` / `admin`).
- `games` — parties (mode Prime/Saison, formation, contraintes, note finale, résultat).
- `game_picks` — joueurs draftés d'une partie.
- `careers` / `career_seasons` — fil de carrière, classements par saison.
- `standings` — classements simulés (championnat + individuels) par saison jouée.
- `collection_cards` — cartes débloquées par utilisateur.
- `daily_challenges` / `challenge_entries` — défi du jour + scores communautaires.
- `objectives` — objectifs et leur statut.

---

## 9. Feuille de route en phases

Chaque phase = son propre cycle spec → plan → implémentation. Ce document couvre la
vision ; le prochain plan portera sur les **Phases 0 et 1**.

- **Phase 0 — Fondations data & note** *(risque max, à valider en premier)*
  Pipeline d'ingestion, modèle de note à deux niveaux par poste, base `player_seasons`
  validée (sanity-checks). Livrable : un dataset crédible et interrogeable.

- **Phase 1 — Cœur jouable + admin notes**
  Draft Prime/Saison, note d'équipe, simulation de saison + classements (championnat,
  buteurs, passeurs, gardien, meilleure note), écran de fin. UI direction A, PWA.
  Inclut le **back-office admin d'édition des notes** (override), pour corriger le
  dataset dès qu'on joue avec. Livrable : une partie complète jouable sur mobile et
  desktop, notes ajustables par l'admin.

- **Phase 2 — Objectifs & contraintes de draft**
  Défis thématiques, contraintes (budget, quotas), système de points. Sans backend lourd.

- **Phase 3 — Persistance & méta**
  Comptes, mode Carrière multi-saisons (recrutement, montée/descente, évolution des
  valeurs), Collection de cartes, Palmarès.

- **Phase 4 — Social**
  Défi du jour partagé + classement communautaire + partage de score.

---

## 10. Tests & validation

- **Notes** : tests unitaires par poste, cas tier riche vs tier base, normalisation ;
  sanity-check dataset (les grandes stars doivent dominer leur saison/poste).
- **Simulation** : déterministe (même seed → mêmes résultats), cohérence
  buteurs/classement, distributions plausibles.
- **Draft** : respect des contraintes/objectifs, tirage des candidats par poste.
- **Admin** : override prioritaire sur la note calculée, reset, accès refusé hors rôle admin.
- **UI** : rendu mobile + desktop, parcours complet accueil → draft → fin.

---

## 11. Hors-scope (YAGNI au départ)

- Multijoueur temps réel.
- Mercato/transferts réels en direct.
- Autres championnats (archi extensible, mais hors périmètre initial).
- Application native (la PWA couvre mobile + desktop).
