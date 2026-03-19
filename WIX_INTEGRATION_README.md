# Intégration Wix Bookings dans l'ERP Michel De Vélo

## 🎯 Objectif

Intégrer les bookings de votre site Wix dans votre ERP pour une gestion centralisée des rendez-vous.

## 📋 Prérequis

1. **Compte Wix Developer** avec une application créée
2. **Wix Bookings** installé sur votre site Wix
3. **Accès API** avec les identifiants OAuth

## 🔧 Configuration

### 1. Variables d'environnement

Ajoutez ces variables dans votre fichier `.env` du backend :

```bash
# Wix Bookings Integration
WIX_APP_ID=votre_app_id
WIX_APP_SECRET=votre_app_secret_key
WIX_INSTANCE_ID=11614d80-9da3-4322-af3c-459f2906449b
WIX_ACCOUNT_ID=votre_account_id
```

### 2. Obtenir les identifiants Wix

#### Étape 1: Créer une application Wix
1. Allez sur [Wix Dev Center](https://dev.wix.com/)
2. Créez une nouvelle application
3. Notez l'**App ID** et l'**App Secret Key**

#### Étape 2: Configurer les permissions
Dans votre application Wix, ajoutez les permissions suivantes :
- `WIX_BOOKINGS` (Accès aux bookings)
- `WIX_BOOKINGS_READ` (Lecture des bookings)
- `WIX_BOOKINGS_WRITE` (Écriture des bookings)

#### Étape 3: Obtenir l'Account ID
1. Connectez-vous à votre compte Wix
2. Allez dans les paramètres de votre compte
3. Récupérez votre Account ID

## 🚀 Utilisation

### Backend

#### 1. Appliquer les migrations
```bash
cd backend
python manage.py migrate
```

#### 2. Démarrer le serveur
```bash
python manage.py runserver
```

#### 3. Tester l'API
```bash
python test_wix_api.py
```

### Frontend

#### 1. Installer les dépendances
```bash
cd frontend
npm install
```

#### 2. Démarrer l'application
```bash
npm start
```

#### 3. Accéder à la page Appointments
Allez sur `http://localhost:3000/appointments`

## 📊 Fonctionnalités

### ✅ Disponibles

1. **Synchronisation manuelle** : Bouton "Synchroniser Wix"
2. **Synchronisation automatique** : Toutes les heures (via Celery)
3. **Filtrage par source** : Local / Wix / Tous
4. **Mapping intelligent** des statuts et types
5. **Création automatique** des clients Wix dans l'ERP
6. **Logs de synchronisation** détaillés
7. **Interface moderne** avec indicateurs visuels

### 🔄 Processus de synchronisation

1. **Authentification OAuth** avec Wix
2. **Récupération** des bookings (30 jours passés + 90 jours futurs)
3. **Transformation** des données Wix vers le format ERP
4. **Déduplication** basée sur le Wix Booking ID
5. **Création/Mise à jour** des rendez-vous
6. **Logging** des opérations

## 📝 Mapping des données

### Statuts Wix → ERP
| Wix | ERP |
|-----|-----|
| CONFIRMED | confirmed |
| PENDING | scheduled |
| CANCELED | cancelled |
| COMPLETED | completed |
| NOSHOW | no_show |

### Types de services
| Service Wix | Type ERP |
|-------------|----------|
| Contient "réparation" | repair |
| Contient "entretien" | maintenance |
| Contient "personnalisation" | customization |
| Contient "livraison" | delivery |
| Autre | consultation |

## 🔍 API Endpoints

### Synchronisation
- `POST /api/appointments/sync-wix/` - Synchronisation manuelle
- `GET /api/appointments/sync-status/` - Statut de la dernière sync
- `POST /api/appointments/force-sync/` - Synchronisation forcée
- `GET /api/appointments/wix-stats/` - Statistiques Wix

### Rendez-vous
- `GET /api/appointments/?source=wix` - Filtrer les bookings Wix
- `GET /api/appments/?status=confirmed` - Filtrer par statut

## 🐛 Dépannage

### Erreurs courantes

#### 1. "Variables d'environnement Wix manquantes"
**Solution** : Configurez les variables dans `.env`

#### 2. "Erreur d'authentification Wix"
**Solution** : Vérifiez App ID et App Secret

#### 3. "Permission refusée"
**Solution** : Ajoutez les permissions WIX_BOOKINGS dans votre app Wix

#### 4. "Aucun booking récupéré"
**Solution** : Vérifiez que Wix Bookings est installé et actif

### Logs de synchronisation

Les logs sont stockés dans la table `wix_sync_logs` :
- `sync_date` : Date de la synchronisation
- `status` : success / error / partial
- `bookings_processed` : Nombre de bookings traités
- `bookings_created` : Nombre de nouveaux bookings
- `bookings_updated` : Nombre de bookings mis à jour
- `error_message` : Message d'erreur si applicable

## 📈 Monitoring

### Dans l'interface
- **Indicateur de statut** de synchronisation
- **Date de dernière sync** affichée en permanence
- **Filtres** par source (Local/Wix)
- **Badge "Wix"** sur les bookings provenant de Wix

### Dans l'admin Django
- **Logs de synchronisation** consultables
- **Statistiques** détaillées
- **Gestion** des erreurs

## 🔄 Mises à jour futures

1. **Synchronisation en temps réel** via Webhooks Wix
2. **Synchronisation bidirectionnelle** (ERP → Wix)
3. **Gestion des conflits** avancée
4. **Export/Import** en masse
5. **Notifications** automatiques

## 📞 Support

Pour toute question sur l'intégration Wix :
1. Vérifiez les logs dans l'admin Django
2. Testez avec `python test_wix_api.py`
3. Consultez la documentation Wix : https://dev.wix.com/docs/api-reference/business-solutions/bookings

---

**Note** : Cette intégration nécessite un plan Wix Premium pour accéder aux API Bookings.
