# 🚴 ERP Magasin de Vélo - Django + React + PostgreSQL (Supabase)

## 📋 Description

ERP complet pour la gestion d'un magasin de vélo avec deux emplacements (Ville d'Avray et Garches).

### ✨ Fonctionnalités principales

- **Authentification complète** : Email/mot de passe, Google OAuth, récupération de mot de passe
- **Dashboard analytique** : KPIs, graphiques, alertes stock
- **Gestion produits** : Vue grille/liste, scanner code-barres, recherche avancée
- **Gestion clients** : Profils détaillés, historique d'achats
- **Point de vente** : Panier, sélection magasin, génération de factures PDF
- **Factures automatiques** : Génération et stockage PDF sur Render

---

## 🏗️ Architecture

```
bike-erp/
├── backend/              # Django REST API
│   ├── accounts/         # Authentification
│   ├── products/         # Gestion produits
│   ├── clients/          # Gestion clients
│   ├── orders/           # Commandes
│   ├── invoices/         # Factures PDF
│   └── analytics/        # Analyses et statistiques
│
├── frontend/             # React Application
│   ├── src/
│   │   ├── components/   # Composants réutilisables
│   │   ├── pages/        # Pages principales
│   │   ├── services/     # API services
│   │   └── store/        # État global (Zustand)
│   └── public/
│
└── docs/
    └── maquette-interactive.html
```

---

## 🚀 Installation

### Backend (Django)

```bash
cd backend

# Créer environnement virtuel
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Installer dépendances
pip install -r requirements.txt

# Créer fichier .env
cp .env.example .env
# Configurer DATABASE_URL avec vos identifiants Supabase

# Migrations
python manage.py makemigrations
python manage.py migrate

# Créer superuser
python manage.py createsuperuser

# Lancer serveur
python manage.py runserver
```

### Frontend (React)

```bash
cd frontend

# Installer dépendances
npm install

# Créer fichier .env
echo "REACT_APP_API_URL=http://localhost:8000/api" > .env
echo "REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id" >> .env

# Lancer application
npm start
```

---

## 🗄️ Configuration Supabase

1. Créer un projet sur [Supabase](https://supabase.com)
2. Récupérer l'URL de connexion PostgreSQL :
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
   ```
3. Ajouter dans `.env` :
   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
   ```

---

## 📦 Déploiement sur Render

### Backend Django

1. Créer nouveau **Web Service** sur Render
2. Connecter le repo GitHub
3. Configuration :
   - **Build Command** : `pip install -r requirements.txt`
   - **Start Command** : `gunicorn bike_erp.wsgi:application`
4. Variables d'environnement :
   ```
   DATABASE_URL=votre-url-supabase
   SECRET_KEY=votre-secret-key
   DEBUG=False
   ALLOWED_HOSTS=.onrender.com
   ```

### Frontend React

1. Créer nouveau **Static Site** sur Render
2. Configuration :
   - **Build Command** : `npm install && npm run build`
   - **Publish Directory** : `build`
3. Variables d'environnement :
   ```
   REACT_APP_API_URL=https://votre-backend.onrender.com/api
   ```

---

## 📊 Modèles de données

### User (CustomUser)
- Email, mot de passe
- Rôle : admin, manager, vendeur
- Avatar, téléphone

### Product
- Référence, nom, description
- Type : vélo, accessoire, pièce, service
- Prix HT/TTC, TVA
- Stock Ville d'Avray / Garches
- Code-barres, image
- Visible/masqué

### Client
- Nom, prénom, email, téléphone
- Adresse complète
- Total achats, nombre de visites
- Notes

### Order
- Numéro commande auto-généré
- Client, vendeur, magasin
- Statut, méthode paiement
- Montants HT/TTC/TVA
- Remises

### Invoice
- Numéro facture auto-généré
- Commande liée
- PDF généré automatiquement
- Stocké sur Render

---

## 🎨 Design System

### Couleurs
- **Primary** : `#2563eb` (Blue 600)
- **Success** : `#10b981` (Green 500)
- **Warning** : `#f59e0b` (Amber 500)
- **Danger** : `#ef4444` (Red 500)

### Composants
- Tailwind CSS pour le styling
- Design moderne et épuré
- Responsive mobile-first
- Animations subtiles

---

## 🔐 Sécurité

- JWT Authentication
- CORS configuré
- Validation des données
- Permissions par rôle
- HTTPS en production
- Variables d'environnement sécurisées

---

## 📱 Fonctionnalités détaillées

### Page Connexion
- Connexion email/password
- Google OAuth 2.0
- Mot de passe oublié
- Inscription nouveau utilisateur

### Dashboard
- 4 KPIs principaux
- Graphique ventes mensuelles
- Top 5 produits
- Répartition par magasin
- Alertes stock faible
- Dernières commandes

### Page Produits
- Vue grille avec images
- Vue liste tableau
- Recherche multi-critères
- Scanner code-barres
- Filtres catégories
- Afficher/masquer produits
- Indicateur stock faible

### Page Clients
- Liste complète
- Recherche rapide
- Détails profil
- Historique achats
- Statistiques client

### Page Vente
- Sélection magasin
- Ajout produits au panier
- Sélection client
- Calcul automatique HT/TTC/TVA
- Génération facture PDF
- Téléchargement facture

---

## 🛠️ Technologies utilisées

### Backend
- Django 4.2
- Django REST Framework
- PostgreSQL (Supabase)
- JWT Authentication
- ReportLab (PDF)
- Celery + Redis (optionnel)

### Frontend
- React 18
- React Router v6
- Zustand (state)
- Axios
- Tailwind CSS
- Chart.js
- React Hot Toast
- Google OAuth

---

## 📝 TODO / Améliorations futures

- [ ] Module de gestion des fournisseurs
- [ ] Système de réservation en ligne
- [ ] Notifications email automatiques
- [ ] Export Excel des données
- [ ] Application mobile (React Native)
- [ ] Système de fidélité clients
- [ ] Module de SAV / réparations
- [ ] Intégration paiement en ligne
- [ ] Multi-devises
- [ ] Rapports comptables avancés

---

## 📄 Licence

Projet privé - Tous droits réservés

---

## 👥 Support

Pour toute question ou support, contactez l'équipe de développement.
