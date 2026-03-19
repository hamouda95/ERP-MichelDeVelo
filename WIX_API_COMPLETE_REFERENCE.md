# 📚 Wix API Complete Reference - 2024

## 🎯 Overview

Ce document contient la référence complète des APIs Wix pour l'intégration avec votre ERP Michel De Vélo.

---

## 🔐 Authentication

### OAuth 2.0 Flow
- **Endpoint**: `https://www.wixapis.com/oauth2/token`
- **Method**: POST
- **Headers**: Content-Type: application/json
- **Body**:
```json
{
  "grant_type": "client_credentials",
  "client_id": "YOUR_APP_ID",
  "client_secret": "YOUR_APP_SECRET",
  "instance_id": "YOUR_INSTANCE_ID"
}
```

---

## 📋 Business Solutions APIs

### 1. Bookings API
**Base URL**: `https://www.wixapis.com`

#### Bookings Reader V2
- **Query Extended Bookings**: `POST /bookings/v2/extended-bookings/query`
- **Get Extended Booking**: Utiliser Query avec un seul ID
- **Documentation**: https://dev.wix.com/docs/rest/business-solutions/bookings/bookings/bookings-reader-v2/introduction

#### Bookings Writer V2  
- **Create Booking**: `POST /bookings/v2/bookings`
- **Update Booking**: `PATCH /bookings/v2/bookings/{bookingId}`
- **Cancel Booking**: `POST /bookings/v2/bookings/{bookingId}/cancel`
- **Documentation**: https://dev.wix.com/docs/rest/business-solutions/bookings/bookings/bookings-writer-v2/introduction

### 2. eCommerce API
**Base URL**: `https://www.wixapis.com`

#### Cart Management
- **Get Cart**: `GET /e-commerce/v1/carts/{cartId}`
- **Create Cart**: `POST /e-commerce/v1/carts`
- **Update Cart**: `PATCH /e-commerce/v1/carts/{cartId}`
- **Documentation**: https://dev.wix.com/docs/api-reference/business-solutions/e-commerce/purchase-flow/cart/cart/introduction

#### Orders Management
- **Create Order**: `POST /e-commerce/v1/orders`
- **Get Order**: `GET /e-commerce/v1/orders/{orderId}`
- **Update Order**: `PATCH /e-commerce/v1/orders/{orderId}`
- **List Orders**: `GET /e-commerce/v1/orders/query`
- **Documentation**: https://dev.wix.com/docs/api-reference/business-solutions/e-commerce/orders/orders/introduction

#### Checkout Management
- **Create Checkout**: `POST /e-commerce/v1/checkouts`
- **Get Checkout**: `GET /e-commerce/v1/checkouts/{checkoutId}`
- **Documentation**: https://dev.wix.com/docs/api-reference/business-solutions/e-commerce/purchase-flow/checkout/checkout/introduction

### 3. Stores Catalog API
**Base URL**: `https://www.wixapis.com`

#### Products Management
- **Query Products**: `POST /stores/v1/products/query`
- **Get Product**: `GET /stores/v1/products/{productId}`
- **Create Product**: `POST /stores/v1/products`
- **Update Product**: `PATCH /stores/v1/products/{productId}`
- **Delete Product**: `DELETE /stores/v1/products/{productId}`
- **Documentation**: https://dev.wix.com/docs/api-reference/business-solutions/stores/catalog-v1/catalog/query-products

#### Inventory Management
- **Query Inventory**: `POST /stores/v1/inventory/query`
- **Get Inventory**: `GET /stores/v1/inventory/{inventoryItemId}`
- **Update Inventory**: `PATCH /stores/v1/inventory/{inventoryItemId}`
- **Increment Inventory**: `POST /stores/v1/inventory/increment`
- **Decrement Inventory**: `POST /stores/v1/inventory/decrement`
- **Documentation**: https://dev.wix.com/docs/api-reference/business-solutions/stores/catalog-v1/inventory/query-inventory

#### Collections Management
- **Query Collections**: `POST /stores/v1/collections/query`
- **Get Collection**: `GET /stores/v1/collections/{collectionId}`
- **Create Collection**: `POST /stores/v1/collections`
- **Documentation**: https://dev.wix.com/docs/api-reference/business-solutions/stores/catalog-v1/collections/query-collections

### 4. CRM API
**Base URL**: `https://www.wixapis.com`

#### Contacts Management
- **Query Contacts**: `POST /contacts/v4/contacts/query`
- **Create Contact**: `POST /contacts/v4/contacts`
- **Get Contact**: `GET /contacts/v4/contacts/{contactId}`
- **Update Contact**: `PATCH /contacts/v4/contacts/{contactId}`
- **Delete Contact**: `DELETE /contacts/v4/contacts/{contactId}`
- **Documentation**: https://dev.wix.com/docs/api-reference/crm/members-contacts/contacts/contacts/introduction

#### Members Management
- **Query Members**: `POST /members/v1/members/query`
- **Create Member**: `POST /members/v1/members`
- **Get Member**: `GET /members/v1/members/{memberId}`
- **Update Member**: `PATCH /members/v1/members/{memberId}`
- **Documentation**: https://dev.wix.com/docs/api-reference/crm/members-contacts/members/member-management/members/introduction

### 5. Pricing Plans API
**Base URL**: `https://www.wixapis.com`

#### Plans Management
- **Create Plan**: `POST /pricing-plans/v3/plans`
- **Get Plan**: `GET /pricing-plans/v3/plans/{planId}`
- **Update Plan**: `PATCH /pricing-plans/v3/plans/{planId}`
- **Delete Plan**: `DELETE /pricing-plans/v3/plans/{planId}`
- **List Plans**: `GET /pricing-plans/v3/plans/query`
- **Documentation**: https://dev.wix.com/docs/api-reference/business-solutions/pricing-plans/plans-v3/introduction

#### Subscriptions Management
- **Create Subscription**: `POST /pricing-plans/v3/subscriptions`
- **Get Subscription**: `GET /pricing-plans/v3/subscriptions/{subscriptionId}`
- **Cancel Subscription**: `POST /pricing-plans/v3/subscriptions/{subscriptionId}/cancel`
- **Documentation**: https://dev.wix.com/docs/api-reference/business-solutions/pricing-plans/subscriptions-v3/introduction

### 6. Events API
**Base URL**: `https://www.wixapis.com`

#### Webhooks Management
- **Create Webhook**: `POST /events/v1/webhooks`
- **Get Webhook**: `GET /events/v1/webhooks/{webhookId}`
- **Update Webhook**: `PATCH /events/v1/webhooks/{webhookId}`
- **Delete Webhook**: `DELETE /events/v1/webhooks/{webhookId}`
- **Documentation**: https://dev.wix.com/docs/sdk/api-reference/events/introduction

---

## 🔧 Implementation Notes

### Headers Standards
```http
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json
wix-site-id: {SITE_ID}
wix-account-id: {ACCOUNT_ID}
```

### Error Handling
Les erreurs Wix suivent un format standard :
```json
{
  "message": "Description de l'erreur",
  "details": {
    "applicationError": {
      "code": "ERROR_CODE",
      "description": "Description détaillée"
    }
  }
}
```

### Pagination
La plupart des APIs supportent la pagination avec :
- `limit`: Nombre d'items par page (max 100-500)
- `offset` ou `cursor`: Pour navigation
- `hasNext`: Indique s'il y a une page suivante

---

## 📊 Status Codes Communs

### Succès
- `200 OK`: Requête réussie
- `201 Created`: Ressource créée
- `204 No Content`: Opération réussie sans contenu

### Erreurs Client
- `400 Bad Request`: Requête invalide
- `401 Unauthorized`: Token invalide ou expiré
- `403 Forbidden`: Permissions insuffisantes
- `404 Not Found`: Ressource non trouvée
- `429 Too Many Requests`: Limite de rate dépassée

### Erreurs Serveur
- `500 Internal Server Error`: Erreur serveur Wix
- `502 Bad Gateway`: Erreur gateway
- `503 Service Unavailable`: Service temporairement indisponible

---

## 🚀 Rate Limiting

### Limites Standard
- **Requests per minute**: 300
- **Requests per hour**: 10,000
- **Concurrent connections**: 100

### Backoff Strategy
- **Initial delay**: 1 seconde
- **Maximum delay**: 60 secondes
- **Exponential backoff**: 2^n secondes

---

## 🌐 Account Level APIs

Pour les opérations qui nécessitent un accès au niveau du compte plutôt que du site :

### Base URL
- **Account Level**: `https://www.wixapis.com`

### Endpoints Principaux
- **Sites**: `/sites/v1/sites`
- **Billing**: `/billing/v1/plans`
- **Permissions**: `/permissions/v1/permissions`

### Documentation Complète
https://dev.wix.com/docs/api-reference/account-level/about-account-level-apis

---

## 📱 Testing & Development

### Environnement de Test
- **Sandbox URL**: `https://www.wixapis.com` (même que production)
- **Test Tokens**: Utiliser les tokens de développement
- **Mock Data**: Utiliser les données de démonstration pour les tests

### Outils Recommandés
- **Postman**: Collection d'APIs Wix disponible
- **Insomnia**: Environment pour tester les APIs
- **Wix API Explorer**: Outil officiel de test

---

## 🔍 Debugging Tips

### Logs Wix
- Activer les logs dans votre dashboard Wix
- Utiliser les headers `x-wix-request-id` pour tracer
- Surveiller les réponses 429 pour le rate limiting

### Common Issues
1. **Site/Account Mismatch**: Vérifier la correspondance des IDs
2. **Token Expired**: Implémenter le rafraîchissement automatique
3. **Permission Denied**: Vérifier les permissions de l'app
4. **Invalid JSON**: Valider les payloads avant envoi

---

## 📚 Documentation Officielle Complète

### Documentation Principale
- **API Reference**: https://dev.wix.com/docs/api-reference
- **Developer Portal**: https://dev.wix.com/
- **Community Forum**: https://forum.wixstudio.com/
- **Discord**: https://discord.gg/GhdmDN926z
- **GitHub Examples**: https://github.com/wix-incubator/wix-code-docs

### Guides Spécifiques
- **Bookings Integration**: https://dev.wix.com/docs/sdk/backend-modules/bookings/introduction
- **eCommerce Integration**: https://dev.wix.com/docs/api-reference/business-solutions/e-commerce/introduction
- **Stores Integration**: https://dev.wix.com/docs/api-reference/business-solutions/stores/introduction

---

## 🎯 Use Cases pour ERP Michel De Vélo

### 1. Synchronisation Multi-sources
- **Bookings Wix** → Appointments ERP
- **Products Wix** → Products ERP  
- **Inventory Wix** → Stock ERP
- **Orders Wix** → Orders ERP
- **Contacts Wix** → Clients ERP

### 2. Automatisation
- **Webhooks** pour synchronisation en temps réel
- **Tâches planifiées** pour synchronisation périodique
- **Retry logic** pour gérer les erreurs temporaires

### 3. Business Intelligence
- **Analytics croisées** entre Wix et ERP
- **Rapports de performance** des synchronisations
- **Alertes** sur les divergences de données

---

## 📞 Support & Resources

### Support Wix
- **Developer Support**: https://dev.wix.com/support
- **Status Page**: https://status.wix.com/
- **API Changelog**: https://dev.wix.com/changelog

### Communauté
- **Stack Overflow**: Rechercher "wix-api" pour les solutions
- **GitHub Issues**: Signaler les bugs dans les repos officiels
- **Discord Community**: Support en direct des développeurs

---

*Ce document sera mis à jour régulièrement avec les dernières évolutions des APIs Wix*
