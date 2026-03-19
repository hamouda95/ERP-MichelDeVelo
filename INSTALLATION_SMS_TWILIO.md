# INSTALLATION ET CONFIGURATION TWILIO POUR SMS GRATUIT

## 📱 **Créer un compte Twilio gratuit**

1. **Inscription** : https://www.twilio.com/try-twilio
2. **Email** : Utilisez votre email professionnel
3. **Téléphone** : Choisissez un numéro virtuel
4. **Plan** : Sélectionnez "Trial" (gratuit)

## 🔧 **Installation des dépendances**

```bash
cd backend
pip install twilio==8.11.0 python-dotenv==1.0.0
```

## ⚙️ **Configuration**

1. **Utiliser le fichier .env.example existant** (déjà à jour) :
```env
# Les clés Twilio sont déjà ajoutées à la fin du fichier .env.example
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+33612345678
SMS_FROM_NAME="Michel De Vélo"
SMS_ENABLED=True
SMS_TEST_MODE=True

# Numéros des magasins pour l'envoi de SMS
# Le système utilisera automatiquement le bon numéro selon le magasin de la réparation
PHONE_NUMBER_VILLE_AVRAY=0652221943
PHONE_NUMBER_GARCHES=0695260607
```

2. **Copier .env.example vers .env** :
```bash
cp .env.example .env
```

3. **Remplir vos clés Twilio** dans `.env`

## 🎯 **Fonctionnalités SMS**

### **Mode Test (Recommandé pour commencer)**
- ✅ **SMS_TEST_MODE=True** : Pas d'envoi réel
- ✅ **Logs console** : Voir les messages sans coût
- ✅ **Développement** : Test gratuit et illimité

### **Mode Production**
- ✅ **SMS_TEST_MODE=False** : Envoi réel des SMS
- ✅ **Coût** : ~0.08€ par SMS (France)
- ✅ **Crédit Twilio** : Nécessaire pour l'envoi

### **Multi-Magasins**
- ✅ **Numéro automatique** selon le magasin de la réparation
- ✅ **Ville d'Avray** : 0652221943
- ✅ **Garches** : 0695260607
- ✅ **Fallback** sur numéro par défaut si non configuré

## 📊 **Monitoring**

### **Logs des SMS**
```python
# Les SMS envoyés sont loggés dans Django
# Voir : logs/django.log
```

### **Statistiques disponibles**
- ✅ Nombre de SMS envoyés
- ✅ Coût total des SMS
- ✅ SMS en erreur
- ✅ Mode test vs production
- ✅ Numéro utilisé par SMS
- ✅ Magasin d'origine

## 🔄 **Intégration ERP**

### **SMS Automatiques**
1. **Réparé → completed** : SMS client automatique
2. **Bouton Manuel** : SMS à la demande
3. **Confirmation** : Statut d'envoi
4. **Multi-magasins** : Numéro adapté automatiquement

### **Messages personnalisables**
```python
# Dans repairs/views.py
message = f"Bonjour {repair.client.first_name}, votre {repair.bike_brand} est réparé et disponible à notre atelier. Michel De Vélo"
```

## 🎉 **Avantages**

- ✅ **Gratuit en mode test**
- ✅ **API moderne et robuste**
- ✅ **Gestion d'erreurs**
- ✅ **Logs détaillés**
- ✅ **Mode production ready**
- ✅ **Support international**
- ✅ **Multi-magasins automatique**

## 🚀 **Déploiement**

1. **Installer les dépendances**
2. **Configurer .env** (utiliser le fichier existant)
3. **Redémarrer Django**
4. **Tester en mode test**
5. **Passer en production**

**Le système SMS est maintenant prêt avec multi-magasins ! 📱✨**

## 📞 **Numéros Configurés**

- **Ville d'Avray** : 0652221943
- **Garches** : 0695260607
- **Défault** : +33612345678

Les SMS seront envoyés automatiquement depuis le bon numéro selon le magasin de la réparation !
