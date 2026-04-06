# Widgets Android / écran d’accueil

MyLife est une **PWA** (Progressive Web App). Sur Android, après « Ajouter à l’écran d’accueil », le raccourci ouvre l’app comme une activité plein écran, mais **il n’y a pas de widget natif** type calendrier ou compteur d’eau tant qu’une couche native (Expo / Kotlin) n’expose pas ces surfaces.

Recommandations :

- Utiliser les **notifications locales** (rappels agenda, habitudes) tant que l’utilisateur a accordé la permission et garde la PWA installée.
- Pour un **vrai widget** (affichage sans ouvrir l’app), prévoir un module **Android natif** ou une app **Expo** qui lit la même base ou une sync cloud.
