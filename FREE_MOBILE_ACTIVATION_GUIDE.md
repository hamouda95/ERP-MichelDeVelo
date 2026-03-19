# Guide Activation Free Mobile API

## 📞 **Contacter le Support Free**

### **Par téléphone (plus rapide)**
- **Numéro** : 3244 (gratuit depuis un mobile Free)
- **Horaires** : 7j/7 de 8h à 22h
- **Message** : "Bonjour, je souhaite activer l'API SMS pour les notifications depuis mon espace client"

### **Par chat en ligne**
- **URL** : https://www.free.fr/contact/
- **Section** : "Mobile" → "Assistance technique"
- **Demande** : Activation API SMS Notifications

### **Ce que demander**
```
"Bonjour, je souhaite activer l'option 'Notifications par SMS' 
pour pouvoir utiliser l'API Free Mobile depuis mon application.
Mon identifiant est : [votre identifiant]"
```

---

## 🔄 **Alternative : Services SMS Gratuits**

### **Option 2 : Orange SMS API**
- **Coût** : 0€ (abonnés Orange)
- **Activation** : Via espace client Orange
- **Setup** : 10 minutes

### **Option 3 : SFR SMS API**
- **Coût** : 0€ (abonnés SFR)
- **Activation** : Via espace client SFR
- **Setup** : 15 minutes

### **Option 4 : Email (Alternative universelle)**
- **Coût** : 0€
- **Avantages** : Marche avec tous les opérateurs
- **Setup** : Immédiat

---

## 🚀 **Solution Immédiate : Email + SMS Hybride**

### **Configuration pour tous les clients**
```python
def send_notification(client, message):
    if client.has_free_mobile:
        # SMS gratuit pour vous
        free_mobile_service.send_sms(your_phone, message)
    else:
        # Email pour les autres
        send_email(client.email, message)
```

---

## 💡 **Recommandation**

1. **Contactez Free** (5 minutes)
2. **Pendant l'attente** : Utilisez l'email
3. **Une fois activé** : Passez au SMS gratuit

**Le support Free active généralement l'API en 24-48h !**
