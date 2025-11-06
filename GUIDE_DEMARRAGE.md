# 🚀 Guide de Démarrage Rapide - ERP Vélo

## 📦 Fichiers du Projet

Votre projet ERP complet est prêt avec :

### Backend Django
- ✅ Configuration Supabase PostgreSQL
- ✅ Modèles : User, Product, Client, Order, Invoice
- ✅ API REST complète avec JWT
- ✅ Génération PDF de factures
- ✅ Google OAuth2
- ✅ Authentification complète

### Frontend React
- ✅ Pages : Login, Dashboard, Produits, Clients, Vente
- ✅ Design moderne avec Tailwind CSS
- ✅ Gestion d'état avec Zustand
- ✅ Scanner code-barres
- ✅ Graphiques Chart.js
- ✅ Vue grille/liste produits

### Documentation
- ✅ README complet
- ✅ Maquette interactive HTML
- ✅ Variables d'environnement
- ✅ Guide de déploiement

---

## 🎯 Étapes pour lancer le projet

### 1️⃣ Backend Django (Terminal 1)

```bash
# Aller dans le dossier backend
cd backend

# Créer environnement virtuel
python3 -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Configurer Supabase
# 1. Aller sur https://supabase.com
# 2. Créer un nouveau projet
# 3. Récupérer l'URL PostgreSQL dans Settings > Database
# 4. Créer le fichier .env

cat > .env << EOL
SECRET_KEY=django-insecure-CHANGEZ-MOI-en-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,.onrender.com
DATABASE_URL=postgresql://postgres:VOTRE_MOT_DE_PASSE@db.VOTRE_PROJET.supabase.co:5432/postgres
CORS_ALLOWED_ORIGINS=http://localhost:3000
EMAIL_HOST_USER=votre-email@gmail.com
EMAIL_HOST_PASSWORD=votre-app-password
FRONTEND_URL=http://localhost:3000
GOOGLE_OAUTH2_KEY=votre-google-client-id
GOOGLE_OAUTH2_SECRET=votre-google-client-secret
EOL

# Créer les tables dans Supabase
python manage.py makemigrations
python manage.py migrate

# Créer un super-utilisateur
python manage.py createsuperuser

# Lancer le serveur
python manage.py runserver
```

Le backend sera accessible sur : **http://localhost:8000**

---

### 2️⃣ Frontend React (Terminal 2)

```bash
# Aller dans le dossier frontend
cd frontend

# Installer les dépendances
npm install

# Configurer l'API
cat > .env << EOL
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_GOOGLE_CLIENT_ID=votre-google-client-id
EOL

# Lancer l'application
npm start
```

Le frontend sera accessible sur : **http://localhost:3000**

---

## 🔑 Configuration Google OAuth (Optionnel)

1. Aller sur [Google Cloud Console](https://console.cloud.google.com)
2. Créer un nouveau projet
3. Activer "Google+ API"
4. Créer des identifiants OAuth 2.0
5. Ajouter les URIs autorisés :
   - `http://localhost:8000/api/social-auth/complete/google-oauth2/`
   - `http://localhost:3000`
6. Copier le Client ID et Client Secret dans `.env`

---

## 🎨 Voir la Maquette Interactive

Ouvrir dans votre navigateur :
```
docs/maquette-interactive.html
```

Cette maquette interactive vous permet de visualiser toutes les pages de l'ERP avant même de lancer le code !

---

## 📊 Structure du Projet

```
bike-erp/
│
├── backend/                    # Django API
│   ├── accounts/              # Authentification (Google OAuth, JWT)
│   ├── products/              # Gestion produits + scanner
│   ├── clients/               # Gestion clients
│   ├── orders/                # Commandes
│   ├── invoices/              # Factures PDF
│   ├── bike_erp/              # Configuration Django
│   ├── requirements.txt       # Dépendances Python
│   └── .env.example           # Template environnement
│
├── frontend/                   # React Application
│   ├── src/
│   │   ├── pages/            # Login, Dashboard, Products, Clients, Cart
│   │   ├── components/       # Layout, Navigation
│   │   ├── services/         # API Axios
│   │   ├── store/            # State Zustand
│   │   └── App.js            # Routing
│   ├── package.json           # Dépendances Node
│   └── tailwind.config.js     # Configuration Tailwind
│
├── docs/
│   └── maquette-interactive.html  # Prototype visuel
│
└── README.md                   # Documentation complète
```

---

## 🚢 Déploiement sur Render

### Backend

1. Créer un **Web Service** sur [Render](https://render.com)
2. Connecter votre repo Git
3. Configuration :
   - **Build Command** : `pip install -r requirements.txt`
   - **Start Command** : `gunicorn bike_erp.wsgi:application`
4. Variables d'environnement (à configurer dans Render) :
   ```
   DATABASE_URL=votre-url-supabase
   SECRET_KEY=générez-une-clé-secrète
   DEBUG=False
   ALLOWED_HOSTS=votre-app.onrender.com
   ```

### Frontend

1. Créer un **Static Site** sur Render
2. Configuration :
   - **Build Command** : `cd frontend && npm install && npm run build`
   - **Publish Directory** : `frontend/build`
3. Variable d'environnement :
   ```
   REACT_APP_API_URL=https://votre-backend.onrender.com/api
   ```

---

## ✅ Checklist de Vérification

Avant de commencer le développement, vérifiez :

- [ ] Supabase configuré et URL récupérée
- [ ] Backend Django lance sans erreur
- [ ] Migrations effectuées (tables créées dans Supabase)
- [ ] Super-utilisateur créé
- [ ] Frontend React lance sans erreur
- [ ] API accessible depuis le frontend
- [ ] Maquette interactive ouverte et visualisée

---

## 🎯 Prochaines Étapes

1. **Tester l'authentification** : Créer un compte et se connecter
2. **Ajouter des produits** : Aller dans la page Produits
3. **Créer des clients** : Aller dans la page Clients
4. **Faire une vente** : Tester le panier et la génération de facture
5. **Visualiser le dashboard** : Voir les statistiques

---

## 💡 Astuces

- **Scanner de code-barres** : Utilise votre douchette directement dans la page Produits
- **Changement de vue** : Toggle grille/liste pour les produits
- **Multi-magasins** : Sélectionner Ville d'Avray ou Garches lors de la vente
- **Factures PDF** : Téléchargées automatiquement après validation

---

## 🐛 Problèmes Courants

### "Connection to database failed"
→ Vérifiez l'URL Supabase dans `.env`

### "CORS error"
→ Vérifiez que le backend tourne et que CORS_ALLOWED_ORIGINS contient http://localhost:3000

### "Module not found"
→ Vérifiez que toutes les dépendances sont installées (`pip install -r requirements.txt` et `npm install`)

---

## 📞 Support

Pour toute question, référez-vous au README.md complet ou consultez la documentation Django/React.

**Bon développement ! 🚴‍♂️**
