# IPTV Stalker Player (StreamPulse) 🚀📺

Un lecteur IPTV moderne, fluide et élégant conçu avec **React**, **Vite** et un serveur proxy autonome **Node.js** pour la prise en charge complète des protocoles **Stalker Portal (Adresse MAC)** et **Xtream Codes**.

![Aperçu](https://img.shields.io/badge/Interface-Glassmorphism%20Dark-8b5cf6?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646cff?style=for-the-badge&logo=vite)
![HLS](https://img.shields.io/badge/HLS.js-1.5-ff007f?style=for-the-badge)

---

## ✨ Fonctionnalités Principales

- 📡 **Support Stalker Portal (Ministra / MAG250)** : Authentification par adresse MAC avec handshake automatique, token et résolution des flux `cmd`.
- 🔑 **Support Xtream Codes & Listes M3U** : Connexion via nom d'utilisateur et mot de passe, ou import d'URLs M3U.
- ⚡ **Proxy IPTV Anti-CORS & User-Agent Spoofing** : Serveur proxy intégré contournant les restrictions de domaine et simulant une Set-Top Box STB MAG.
- 🎬 **Catalogue VOD & Séries Style Netflix** :
  - Jaquettes et affiches cinématiques grand format.
  - Sélecteur de saisons et épisodes.
  - Filtres par catégories dédiées dans la barre latérale.
- 📺 **Navigation & Zapping Ultra-Rapide** :
  - Changement de chaîne instantané avec les **Flèches Gauche (◄) / Droite (►)** du clavier.
  - Vue grille et vue liste avec logos et badges de qualité (4K, FHD, HD, HEVC).
  - Mode favoris (étoile) et recherche en temps réel.
- 💾 **Gestionnaire de Profils Multi-Abonnements** :
  - Sauvegarde locale sécurisée de vos différents comptes Stalker et Xtream.
  - Détection automatique et actualisation de la **date d'expiration** de votre abonnement.
  - Boutons de copie en 1 clic dans le presse-papier pour l'URL DNS et l'adresse MAC.
- 🎛️ **Contrôles Vidéo Avancés** :
  - Mode Plein écran, Picture-in-Picture (PiP), ratio d'affichage (16:9, 4:3, Cover, Contain).
  - Possibilité de masquer le panneau inférieur des chaînes pour une immersion maximale.

---

## 🛠️ Installation & Démarrage

### Prérequis
- [Node.js](https://nodejs.org/) (version 18 ou supérieure)

### 1. Cloner le dépôt
```bash
git clone https://github.com/<votre-nom-d-utilisateur>/IPTV-Stalker-Player.git
cd IPTV-Stalker-Player
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Compiler le projet
```bash
npm run build
```

### 4. Lancer le lecteur IPTV
```bash
node standalone_server.cjs
```
Ouvrez ensuite votre navigateur sur **http://localhost:8080**.

---

## 📁 Architecture du Projet

```
iptv-stalker-player/
├── src/
│   ├── components/
│   │   ├── VideoPlayer.jsx      # Lecteur HLS & MPEG-TS avec OSD
│   │   ├── ChannelGrid.jsx      # Grille et liste des chaînes
│   │   ├── VodGrid.jsx          # Section VOD films & séries (style Netflix)
│   │   ├── Sidebar.jsx          # Navigation catégories et modes
│   │   ├── Header.jsx           # Barre supérieure avec recherche et profil
│   │   └── LoginModal.jsx       # Modal de connexion & gestion des profils
│   ├── services/
│   │   ├── stalker.js           # API client Stalker (Handshake, Token, VOD, ITV)
│   │   ├── xtream.js            # API client Xtream Codes
│   │   ├── storage.js           # Persistance locale des profils
│   │   └── proxy.js             # Client de redirection vers le proxy local
│   ├── App.jsx                  # Composant racine
│   └── index.css                # Design system & Glassmorphism
├── standalone_server.cjs        # Serveur HTTP + Proxy streaming Node.js
└── package.json
```

---

## 📜 Licence
Projet sous licence MIT.
