# 🪟 Guide d'Installation Windows - ERP Vélo

## ✅ Ce ZIP contient TOUS les fichiers nécessaires

Tous les fichiers Python, les URLs, admin, serializers, views sont maintenant inclus !

## 📋 Étape par Étape

### 1️⃣ Extraire le ZIP

Extrayez le dossier `bike-erp-complet` sur votre bureau ou dans `C:\Users\LENOVO\Downloads\`

### 2️⃣ Backend Django

**Ouvrir PowerShell ou CMD dans le dossier backend :**

```cmd
cd C:\Users\LENOVO\Downloads\bike-erp-complet\backend

:: Créer environnement virtuel
python -m venv venv

:: Activer l'environnement (CMD)
venv\Scripts\activate.bat

:: OU pour PowerShell (si autorisé)
.\venv\Scripts\Activate.ps1

:: Mettre à jour pip
python -m pip install --upgrade pip

:: Installer les dépendances
pip install -r requirements.txt
```

**Créer le fichier .env :**

```cmd
notepad .env
```

Copiez ce contenu :
```
SECRET_KEY=django-insecure-change-this-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,.onrender.com
DATABASE_URL=postgresql://postgres.osiuwhudhfsbcpcrukzc:TestErp123__@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
CORS_ALLOWED_ORIGINS=http://localhost:3000
EMAIL_HOST_USER=votre-email@gmail.com
EMAIL_HOST_PASSWORD=votre-app-password
FRONTEND_URL=http://localhost:3000
GOOGLE_OAUTH2_KEY=
GOOGLE_OAUTH2_SECRET=
REDIS_URL=redis://localhost:6379/0
```

**Lancer Django :**

```cmd
:: Créer les tables dans Supabase
python manage.py makemigrations
python manage.py migrate

:: Créer un super-utilisateur
python manage.py createsuperuser

:: Lancer le serveur
python manage.py runserver
```

✅ Le backend tourne sur **http://localhost:8000**

---

### 3️⃣ Frontend React

**Ouvrir un NOUVEAU terminal (CMD ou PowerShell) :**

```cmd
cd C:\Users\LENOVO\Downloads\bike-erp-complet\frontend

:: Installer les dépendances
npm install

:: Créer le fichier .env
notepad .env
```

Copiez :
```
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_GOOGLE_CLIENT_ID=
```

**Lancer React :**

```cmd
npm start
```

✅ Le frontend s'ouvre automatiquement sur **http://localhost:3000**

---

## 🎯 Résumé

| Terminal | Commande | URL |
|----------|----------|-----|
| Terminal 1 | `cd backend && venv\Scripts\activate && python manage.py runserver` | http://localhost:8000 |
| Terminal 2 | `cd frontend && npm start` | http://localhost:3000 |

---

## 🔧 Si PowerShell bloque les scripts

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Ou utilisez simplement **CMD** au lieu de PowerShell !

---

## 📱 Accès à l'application

1. Ouvrez http://localhost:3000
2. Créez un compte ou connectez-vous
3. Explorez le Dashboard, Produits, Clients, Vente

---

## 🎨 Voir la Maquette (sans installer)

Ouvrez `docs/maquette-interactive.html` dans votre navigateur pour voir toutes les pages !

---

## ✅ Tous les fichiers sont maintenant inclus

- ✅ manage.py
- ✅ Tous les __init__.py
- ✅ Tous les urls.py
- ✅ Tous les admin.py
- ✅ Tous les serializers.py
- ✅ Tous les views.py
- ✅ Tous les apps.py
- ✅ Toutes les migrations/

**Ce ZIP est 100% complet et fonctionnel !** 🎉
