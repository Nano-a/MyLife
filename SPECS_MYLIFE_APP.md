# 📋 MYLIFE APP — Spécifications Complètes pour Cursor IDE

> Application personnelle tout-en-un : habitudes, finances, sport, hydratation, agenda, objectifs.
> Fichier de référence à fournir directement à Cursor pour la génération du projet.

---

## 🧭 VUE D'ENSEMBLE

**Nom du projet :** MyLife (nom modifiable dans les paramètres)
**Langue :** Français uniquement
**Plateformes cibles :**
- Android (Xiaomi Poco F7 — Android natif)
- Web (navigateur, responsive desktop + mobile)
- Linux Kubuntu (via Electron ou PWA installable)
- Windows 11 x64 (via Electron ou PWA installable)

**Stack recommandée :**
- **Mobile :** React Native + Expo (Android)
- **Web/Desktop :** React (Next.js ou Vite) + Electron pour desktop
- **Backend & Auth :** Firebase (Firestore + Auth Google)
- **Sync :** Firebase Realtime Sync — offline-first avec synchronisation dès reconnexion
- **Notifications :** Expo Notifications (mobile) + Web Notifications API (web/desktop)
- **Exports :** react-pdf + xlsx (SheetJS)

---

## ⚡ CONTRAINTES TECHNIQUES ABSOLUES

- **Performance prioritaire** : aucun calcul lourd sur le thread principal — utiliser Web Workers ou background tasks pour tout calcul complexe
- **Complexité algorithmique** : O(n) maximum pour les affichages courants, jamais de O(n²) ou pire dans les boucles de rendu
- **RAM** : lazy loading de tous les modules — seul le module actif est chargé en mémoire
- **Stockage local** : SQLite (Expo SQLite) pour le mobile, IndexedDB pour le web — données en cache local pour le mode hors-ligne
- **Batterie** : intervalles de notification optimisés via job schedulers natifs (WorkManager Android), pas de polling continu
- **Sync** : sync Firebase uniquement sur changement de données (listeners delta), jamais de refresh complet

---

## 🔐 AUTHENTIFICATION & SYNC

- **Connexion :** Google Sign-In uniquement
- **Multi-appareils :** toutes les données synchronisées en temps réel via Firebase Firestore
- **Mode hors-ligne :** l'app fonctionne complètement sans connexion — toutes les données lues/écrites en local, sync automatique au retour de connexion
- **Sécurité :** verrouillage de l'app par code PIN à 4-6 chiffres OU Face ID / empreinte biométrique (selon disponibilité du matériel), configurable dans les paramètres

---

## 🏠 NAVIGATION GÉNÉRALE

- **Page d'accueil (Dashboard)** : résumé visuel de tous les modules du jour
  - Score de la journée (calculé dynamiquement)
  - Jauge d'hydratation animée
  - Prochaines tâches/alarmes
  - Streak d'habitudes
  - Solde financier rapide
  - Prochain événement agenda
- **Navigation par onglets en bas** (barre fixe) :
  - 🏠 Accueil
  - 📅 Agenda
  - 💧 Habitudes
  - 💪 Sport
  - 💰 Finances
  - 🎯 Objectifs
  - 📓 Notes
  - ⚙️ Paramètres

---

## 🎨 DESIGN & PERSONNALISATION

- **Thème** : choix dans les paramètres entre :
  - Dark (sombre & élégant — défaut)
  - Light (propre & minimaliste)
  - AMOLED (noir pur pour économie batterie)
  - Custom (couleur d'accent personnalisable)
- **Couleur d'accent** : picker de couleur libre dans les paramètres
- **Police** : choix entre 3-4 familles dans les paramètres
- **Taille du texte** : petit / normal / grand
- **Icônes de l'app** : plusieurs variantes proposées
- **Widget écran d'accueil** (Android) : widget compact affichant hydratation du jour + prochaine tâche + streak

---

## 📅 MODULE AGENDA & PLANNING

### Vues disponibles
- Vue **Journalière** : timeline heure par heure
- Vue **Hebdomadaire** : grille 7 jours
- Vue **Mensuelle** : calendrier classique
- Vue **Annuelle** : aperçu compressé
- Navigation par onglets entre les vues + bouton flottant pour switcher rapidement

### Création d'événements — Types de récurrence
- **Date précise** : une seule occurrence
- **Récurrent** : tous les jours / semaines / mois / ans
- **Plage de dates** : du [date] au [date]
- **Jours spécifiques** : ex. chaque lundi et mercredi
- **Toujours** (sans fin) : permanent dans le planning

### Propriétés d'un événement
- Titre, description, lieu
- Heure de début & fin (ou journée entière)
- Couleur de l'événement
- Catégorie (cours, travail, sport, perso, prière, autre)
- Rappel : X minutes/heures avant (configurable)
- Type de notification : supprimable OU persistante (voir section Notifications)

### Notifications d'événement (persistantes)
- Pour les événements "en cours" (ex : séance de sport, cours) :
  - Notification **persistante non-supprimable** dans la barre de statut
  - Style "chargement en cours" avec barre de progression animée
  - Au clic → écran détail avec :
    - Nom de l'événement
    - ✅ Temps écoulé depuis le début
    - ⏳ Temps restant
    - 🕐 Heure de fin prévue
    - 📊 Pourcentage de complétion (barre animée)
    - Bouton "Terminer maintenant" ou "Prolonger"
- Pour les rappels simples : notification **supprimable** standard

### Export
- Bouton export dans l'agenda
- Choix de période : jour / semaine / mois / trimestre / semestre / année
- Format : PDF (mise en page lisible) ou Excel (.xlsx)

---

## 💧 MODULE HYDRATATION

### Calcul du besoin journalier
Basé sur les données du profil utilisateur :
- Sexe, poids (kg), taille (cm), âge
- Niveau d'activité physique du jour (sédentaire / modéré / intense)
- Heures de sommeil (plage horaire "ne pas déranger")
- Sport enregistré ce jour-là (ajoute un surplus calculé)

**Formule de base (recommandation médicale OMS/EFSA) :**
- Homme : 35 ml/kg/jour
- Femme : 31 ml/kg/jour
- +500 ml par heure de sport modéré, +750 ml par heure de sport intense
- Réparti en intervalles réguliers sur les heures d'éveil uniquement

### Interface visuelle
- **Bouteille / verre animé** : se remplit progressivement à chaque validation de prise d'eau — animation fluide CSS/SVG
- **Corps humain stylisé** : indicateur de long terme (hydratation accumulée sur plusieurs jours/semaines). Démarre à 0% à la première utilisation, évolue selon la régularité. Basé sur le principe physiologique médical : le corps met plusieurs semaines à se réhydrater cellulaire complet
- Affichage : quantité bue / objectif du jour en ml, en % et en nombre de verres
- Historique graphique (courbe journalière + objectif idéal superposé)

### Notifications hydratation
- Rappels programmés uniquement dans la plage d'éveil (configurable dans profil)
- Son : goutte d'eau (fichier audio natif)
- Chaque notification indique : "Bois X ml maintenant pour rester sur la bonne trajectoire"
- Bouton "J'ai bu" directement depuis la notification → met à jour la jauge sans ouvrir l'app
- Fréquence auto-calculée pour atteindre l'objectif en fin de journée

---

## 💪 MODULE SPORT

### Enregistrement d'une séance
- Type : cardio (course, vélo, natation, marche...) / musculation / sport de combat (Taekwondo...) / saisie manuelle libre
- Durée, intensité (faible / modérée / intense), calories (optionnel), notes
- Heure de début et fin
- Équipement utilisé (optionnel)

### Calcul récupération & charge (comme hydratation)
Basé sur le profil :
- Âge, poids, niveau général d'activité
- Type et intensité de la séance
- Calcul du temps de récupération recommandé (basé sur guidelines sportives médicales : ACSM, WHO)
- Affichage : "Tu devrais être récupéré à 100% dans X heures" avec jauge animée
- Même logique visuelle que l'hydratation : jauge de récupération musculaire qui monte

### Historique & graphes
- Courbe de fréquence hebdomadaire/mensuelle
- Progression (durée, intensité) vs objectif idéal superposé
- Volume total par catégorie

### Notification séance en cours
- Notification persistante pendant une séance active (même système que l'agenda)
- Au clic : temps écoulé, temps restant, % complétion, calories estimées brûlées

---

## ✅ MODULE HABITUDES

### Création d'une habitude
- Nom, icône, couleur
- Type :
  - **Oui/Non** : cocher chaque jour
  - **Quantité** : saisir une valeur (ex: 30 min de lecture, 10 pages...)
- Fréquence : quotidien / jours spécifiques
- Heure de rappel (notification supprimable)
- Catégorie (santé, sport, perso, études, spiritualité...)

### Suivi
- Streak (jours consécutifs) avec flamme animée
- Score journalier (% d'habitudes complétées ce jour)
- Calendrier de complétion (heatmap type GitHub)

### Graphes
- Courbe de performance réelle vs courbe idéale (100% tous les jours)
- Vue hebdomadaire et mensuelle
- Comparaison visuelle motivante (écart entre réel et parfait)

---

## 📓 MODULE BLOC-NOTE

- Éditeur de texte riche (rich text) :
  - **Gras**, *italique*, souligné, ~~barré~~
  - Surlignage (plusieurs couleurs)
  - Listes à puces et numérotées
  - Titres H1/H2/H3
  - Insertion d'images (depuis galerie ou caméra)
  - Insertion de liens
- Organisation : dossiers / tags libres
- Recherche plein texte
- Notes épinglées
- Tri par date ou alphabétique

---

## 💰 MODULE FINANCES

### Types de transactions
À la création, l'utilisateur choisit le type :
- 💸 **Dépense** (avec catégorie : alimentation, loisirs, transport, abonnement, autre)
- 💰 **Revenu / Salaire**
- 🔄 **Abonnement récurrent** (date de prélèvement, fréquence, montant, catégorie)
- 📈 **Gain ponctuel**
- 🏦 **Épargne / virement**
- Commentaire libre sur chaque transaction (pour se rappeler à quoi ça correspond)

### Solde & comparaison
- Saisie manuelle du solde actuel (mis à jour à tout moment, enregistré dans le temps)
- **Double courbe** :
  - Ligne bleue : solde réel (mis à jour manuellement)
  - Ligne verte pointillée : solde "parfait" (ce que j'aurais si aucune dépense superflue)
- Le solde "parfait" est calculé à partir des revenus uniquement (sans les dépenses catégorisées comme "superflues")
- L'utilisateur peut marquer une dépense comme "superflue" ou "nécessaire"

### Abonnements
- Liste avec : nom, montant, fréquence (mensuel/annuel), date prochaine échéance, catégorie (streaming, sport, outils, autre)
- Alerte configurable : X jours avant le prélèvement
- Total mensuel et annuel affiché en haut du module
- Code couleur selon catégorie

### Historique
- Liste chronologique de toutes les transactions
- Filtres : par type, catégorie, date, montant
- Graphe barres : dépenses vs revenus par mois

### Fonctionnalités suggérées (ajout intelligent)
- **Budget mensuel** : définir un plafond par catégorie, alerte si dépassement
- **Projection** : estimation du solde dans 30/90 jours selon les habitudes actuelles
- **Rapport mensuel** : résumé automatique exportable PDF/Excel

---

## 🎯 MODULE OBJECTIFS

### Création d'un objectif
- Titre, description, catégorie (perso, études, sport, finance, spiritualité...)
- Deadline (date limite)
- Sous-objectifs (étapes) : liste de tâches à cocher une par une
- Pourcentage de progression (calculé automatiquement depuis les sous-objectifs, ou saisie manuelle)
- Priorité : haute / normale / faible

### Suivi
- Barre de progression animée
- Badge / récompense visuelle à 100% (animation de célébration)
- Vue "Mes réussites" : objectifs atteints avec date de complétion
- Vue "Mes échecs" : objectifs abandonnés ou expirés avec note personnelle
- Graphe : objectifs complétés vs abandonnés par mois

---

## ⚙️ MODULE PARAMÈTRES

### Profil personnel
- Prénom, photo de profil
- Sexe, âge, poids (kg), taille (cm)
- Niveau d'activité habituel
- Heure de lever / coucher (pour le calcul des notifs)

### Personnalisation visuelle
- Thème (Dark / Light / AMOLED / Custom)
- Couleur d'accent (picker)
- Police (choix parmi 3-4 familles)
- Taille du texte

### Notifications
- Activer/désactiver chaque type de notification individuellement :
  - Hydratation
  - Habitudes
  - Agenda (rappels)
  - Séances sport
  - Finances (prélèvements)
  - Objectifs (rappels deadline)
- Plage "Ne pas déranger" : heures de silence total
- Son des notifications : choix parmi plusieurs sons

### Sécurité
- Activer verrouillage PIN (4 ou 6 chiffres)
- Activer biométrie (Face ID / empreinte)
- Délai de verrouillage automatique (immédiat / 1 min / 5 min)

### Données
- Export général (PDF ou Excel) par module et période
- Sauvegarde manuelle vers Google Drive
- Supprimer toutes les données (avec confirmation)
- Déconnexion du compte Google

---

## 📲 NOTIFICATIONS — RÉCAPITULATIF COMPLET

| Type | Supprimable | Son | Action directe |
|------|------------|-----|---------------|
| Hydratation | Oui | Goutte d'eau | "J'ai bu" depuis la notif |
| Rappel habitude | Oui | Défaut | Ouvre le module |
| Rappel agenda | Oui | Configurable | Ouvre l'événement |
| Événement EN COURS | ❌ Non | Silencieux | Ouvre le détail avec progression |
| Séance sport EN COURS | ❌ Non | Silencieux | Ouvre le détail avec progression |
| Prélèvement abonnement | Oui | Défaut | Ouvre les finances |
| Deadline objectif | Oui | Défaut | Ouvre l'objectif |

---

## 📦 STRUCTURE DU PROJET (recommandée pour Cursor)

```
mylife-app/
├── apps/
│   ├── mobile/          # React Native + Expo
│   └── web/             # Next.js (web + desktop via Electron)
├── packages/
│   ├── core/            # Logique métier partagée (calculs, types)
│   ├── ui/              # Composants UI partagés
│   └── firebase/        # Config Firebase partagée
├── electron/            # Wrapper Electron pour Linux/Windows
└── docs/
    └── SPECS.md         # Ce fichier
```

**Monorepo** avec Turborepo ou nx pour partager le maximum de code entre mobile et web.

---

## 🔥 FIREBASE — STRUCTURE FIRESTORE

```
users/{userId}/
  profile/              # Données personnelles + préférences
  habits/{habitId}/     # Habitudes + historique
  agenda/{eventId}/     # Événements agenda
  sport/{sessionId}/    # Séances sport
  hydration/{date}/     # Données hydratation par jour
  finances/{txId}/      # Transactions financières
  objectives/{objId}/   # Objectifs + sous-objectifs
  notes/{noteId}/       # Notes riches
```

---

## ✅ CHECKLIST CURSOR — PAR OÙ COMMENCER

1. [ ] Setup monorepo (Turborepo)
2. [ ] Config Firebase (Auth Google + Firestore + offline persistence)
3. [ ] Module Authentification (Google Sign-In + écran de verrouillage PIN/bio)
4. [ ] Navigation principale (onglets + dashboard)
5. [ ] Module Profil + Paramètres (base pour les calculs)
6. [ ] Module Hydratation (calculs + animations + notifications)
7. [ ] Module Agenda (vues + notifications persistantes)
8. [ ] Module Habitudes (streak + graphes)
9. [ ] Module Sport (séances + récupération)
10. [ ] Module Finances (transactions + graphes double courbe)
11. [ ] Module Objectifs (sous-objectifs + badges)
12. [ ] Module Notes (éditeur riche)
13. [ ] Exports PDF/Excel
14. [ ] Widget Android
15. [ ] Build Electron (Linux + Windows)

---

*Généré le 04/04/2026 — Version 1.0*
