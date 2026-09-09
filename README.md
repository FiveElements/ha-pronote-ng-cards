Pronote NG Cards — Cartes Lovelace pour Home Assistant
<p align="center"> <strong>Les cartes Lovelace pour afficher PRONOTE dans Home Assistant</strong> </p> <p align="center"> <a href="https://github.com/FiveElements/ha-pronote-ng-cards"> <img src="https://img.shields.io/github/v/release/FiveElements/ha-pronote-ng-cards?style=flat-square&label=version" alt="Version"> </a> <a href="https://github.com/FiveElements/ha-pronote-ng-cards/actions"> <img src="https://img.shields.io/github/actions/workflow/status/FiveElements/ha-pronote-ng-cards/validate.yml?branch=main&style=flat-square&label=validate" alt="Validate"> </a> <img src="https://img.shields.io/badge/Home%20Assistant-2026.9.0%2B-41BDF5?style=flat-square&logo=homeassistant&logoColor=white" alt="Home Assistant 2026.9.0 minimum"> <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License"> </p> <p align="center"> <a href="https://fiveelements.github.io/ha-pronote-ng-cards/">📖 Documentation</a> · <a href="https://github.com/FiveElements/ha-pronote-ng">🔌 Pronote NG</a> · <a href="https://github.com/FiveElements/ha-pronote-ng-cards/issues">🐛 Signaler un problème</a> </p>
📚 À propos

Pronote NG Cards est un ensemble de cartes Lovelace personnalisées pour Home Assistant, conçu pour afficher de manière claire et moderne les données scolaires fournies par l'intégration Pronote NG.

Les cartes permettent de transformer les données PRONOTE en un véritable tableau de bord scolaire dans Home Assistant.

Vous pouvez notamment afficher :

📅 l'emploi du temps
🕐 le prochain cours
📝 les devoirs
📊 les notes
🎯 les évaluations
🍽️ le menu de cantine
🏫 la vie scolaire
👨‍🎓 les informations de l'élève
🚦 le budget de requêtes PRONOTE

Pronote NG Cards nécessite l'intégration Pronote NG.

✨ Les 10 cartes
👨‍🎓 Élève

Une carte de synthèse permettant d'afficher les principales informations concernant l'élève.

🕐 Prochain cours

Affiche rapidement le prochain cours :

matière
horaire
salle
enseignant
informations complémentaires

Idéal pour avoir une vue immédiate de ce qui arrive ensuite.

📅 Vue journée

Une représentation graphique de la journée avec :

horaires
matières
salles
enseignants
couleurs par matière
zone repas

Cette carte est particulièrement adaptée à un tableau de bord principal.

🗓️ Emploi du temps

Affiche l'emploi du temps PRONOTE dans Home Assistant.

La carte permet de visualiser les cours à venir et leur contexte directement depuis le tableau de bord.

📝 Devoirs

Affiche les devoirs récupérés depuis PRONOTE.

Les informations peuvent notamment inclure :

matière
description
date
échéance
état du devoir
📊 Notes

Affiche les notes et informations associées dans une présentation adaptée à Home Assistant.

🎯 Évaluations

Permet d'afficher les évaluations et les informations de compétences fournies par PRONOTE.

🍽️ Cantine

Affiche les menus de cantine directement dans le tableau de bord Home Assistant.

🏫 Vie scolaire

Permet de visualiser les informations liées à la vie scolaire, notamment les absences et autres événements disponibles dans PRONOTE.

🚦 Limiteur

Affiche l'état du limiteur de requêtes de Pronote NG.

Cette carte permet notamment de suivre :

le budget d'appels
l'utilisation actuelle
l'état du limiteur
le rafraîchissement des données

Elle est particulièrement utile pour comprendre l'activité de l'intégration PRONOTE.

🖼️ Aperçu

Les cartes sont conçues pour être utilisées ensemble afin de créer un tableau de bord scolaire complet.

📸 Les captures d'écran de démonstration ne contiennent aucune donnée scolaire réelle.

🚀 Installation
Avec HACS

Pronote NG Cards peut être installé directement depuis HACS en tant que dépôt personnalisé.

Ouvrez HACS
Allez dans Frontend
Ouvrez le menu ⋮
Sélectionnez Dépôts personnalisés
Ajoutez :
https://github.com/FiveElements/ha-pronote-ng-cards

Sélectionnez la catégorie Lovelace
Cliquez sur Ajouter
Installez Pronote NG Cards
Rechargez le frontend Home Assistant

💡 Après l'installation, les ressources JavaScript nécessaires aux cartes sont automatiquement gérées par HACS.

🔌 Prérequis

Pronote NG Cards est une extension d'affichage.

Vous devez donc avoir installé et configuré :

Pronote NG — Intégration PRONOTE pour Home Assistant

L'intégration Pronote NG fournit les données PRONOTE.

Pronote NG Cards se charge ensuite de les présenter dans votre interface Lovelace.

PRONOTE
   │
   ▼
Pronote NG
   │
   ├── Sensors
   ├── Events
   ├── Calendar
   ├── Todo
   └── autres entités
          │
          ▼
   Pronote NG Cards
          │
          ▼
   Tableau de bord Home Assistant

🧩 Utilisation

Après installation, ajoutez une carte depuis l'éditeur de tableau de bord Home Assistant.

Les cartes Pronote NG sont disponibles comme cartes Lovelace personnalisées.

Pour chaque carte, la documentation fournit :

les propriétés disponibles
les paramètres obligatoires
les paramètres optionnels
des exemples YAML
les entités nécessaires
les possibilités de personnalisation

👉 Consulter la documentation complète

📖 Documentation

La documentation complète est disponible ici :

📖 Documentation Pronote NG Cards

Vous y trouverez notamment :

Guide d'installation
Guide de configuration
Documentation de chaque carte
Exemples YAML
Personnalisation
Architecture
Limites connues
Guide pour les contributeurs
⚙️ Architecture

Pronote NG Cards est volontairement séparé de l'intégration PRONOTE.

Cela permet de garder deux responsabilités distinctes :

Pronote NG

Récupère et expose les données PRONOTE dans Home Assistant.

Pronote NG Cards

Présente ces données dans l'interface Lovelace.

Cette séparation permet d'utiliser Pronote NG sans installer les cartes personnalisées.

Inversement, les cartes peuvent évoluer indépendamment de la récupération des données PRONOTE.

🔒 Données personnelles

Les captures et illustrations du projet sont conçues pour ne pas contenir de données scolaires réelles.

Lorsque vous partagez une capture d'écran ou un exemple de configuration, veillez toutefois à ne jamais publier :

nom ou prénom d'un élève
identifiant PRONOTE
établissement
adresse
informations personnelles d'un enseignant
données scolaires privées
⚠️ Limites

Ces cartes sont uniquement une interface d'affichage.

Elles ne remplacent pas l'intégration Pronote NG et ne communiquent pas directement avec PRONOTE.

Les limitations liées à la récupération des données, au protocole PRONOTE ou au rate limiting sont donc principalement gérées par Pronote NG.

👉 Consultez la page Limites pour connaître précisément le comportement des cartes.

🧑‍💻 Développement

Le projet est développé avec :

TypeScript
Vite
Home Assistant Lovelace
Web Components

Le dépôt contient également des tests et des contrôles de qualité automatisés.

Pour contribuer au projet :

npm install
npm run build
npm test


Consultez également :

CONTRIBUTING.md

🤝 Contribuer

Les contributions sont les bienvenues.

Vous pouvez contribuer en :

🐛 signalant un bug
💡 proposant une amélioration
🎨 améliorant l'interface
📖 améliorant la documentation
🧪 ajoutant des tests
💻 proposant une Pull Request

👉 Voir les issues

Lorsque vous signalez un problème, indiquez si possible :

version de Pronote NG
version de Pronote NG Cards
version de Home Assistant
carte concernée
configuration YAML utilisée
capture d'écran anonymisée
⚠️ Important

Pronote NG Cards n'est pas développé, maintenu ou officiellement supporté par Index Éducation / PRONOTE.

PRONOTE est un service tiers.

Le fonctionnement des cartes dépend des données exposées par l'intégration Pronote NG et peut évoluer lorsque PRONOTE ou Home Assistant évoluent.

📄 Licence

Pronote NG Cards est distribué sous licence MIT.

⭐ Le projet vous est utile ?

Si Pronote NG Cards vous permet de construire votre tableau de bord scolaire dans Home Assistant :

⭐ ajoutez une étoile au projet
🐛 signalez les problèmes
💡 proposez des améliorations
📖 contribuez à la documentation
📣 partagez le projet avec d'autres utilisateurs de Home Assistant

Chaque étoile et chaque contribution aide d'autres utilisateurs à découvrir les cartes Lovelace PRONOTE pour Home Assistant.
