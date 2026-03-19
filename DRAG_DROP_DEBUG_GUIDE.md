# 🛠️ RÉPARATION DRAG & DROP - GUIDE DE DÉBOGAGE

## 🎯 Problème Identifié

Le drag & drop dans le module réparations ne fonctionne pas correctement.

## 🔍 Étapes de Debug

### 1. Vérifier la Console Browser
Ouvrez les outils de développement et regardez la console pour :

```javascript
// Messages de debug attendus :
- "Kanban data: {...}" - Montre les données chargées
- "Total repairs: X" - Nombre total de réparations
- "Drag end result: {...}" - Quand vous déplacez une carte
- "Updating repair X to status Y" - Tentative de mise à jour
- "API response: {...}" - Réponse du backend
```

### 2. Vérifier les Données Kanban
Les données doivent avoir cette structure :
```javascript
{
  pending: [...],
  diagnosis: [...],
  waiting_parts: [...],
  in_progress: [...],
  testing: [...],
  completed: [...],
  delivered: [...],
  cancelled: [...]
}
```

### 3. Vérifier l'API Backend
L'endpoint doit répondre :
```bash
POST /api/repairs/repairs/{id}/update_status/
{
  "status": "in_progress"
}
```

### 4. Test Manuel

1. **Charger la page** : Vérifiez que les réparations s'affichent
2. **Ouvrir la console** : F12 → Console
3. **Déplacer une carte** : Glisser d'une colonne à l'autre
4. **Vérifier les logs** : Messages de debug dans la console

## 🐛 Problèmes Communs

### Problème 1 : Pas de données affichées
**Symptôme** : Colonnes vides
**Cause** : `getRepairsByStatus()` ne retourne pas les bonnes données
**Solution** : Vérifier l'API backend

### Problème 2 : Drag ne fonctionne pas
**Symptôme** : Les cartes ne se déplacent pas
**Cause** : react-beautiful-dnd mal configuré
**Solution** : Vérifier les imports et la configuration

### Problème 3 : Mise à jour échoue
**Symptôme** : Toast d'erreur après le drag
**Cause** : Endpoint backend manquant ou erreur
**Solution** : Vérifier les logs backend

### Problème 4 : Pas de feedback visuel
**Symptôme** : La carte bouge mais ne change pas de colonne
**Cause** : UI ne se rafraîchit pas
**Solution** : `loadRepairs()` après mise à jour

## 🔧 Corrections Appliquées

### 1. Amélioration du chargement des données
```javascript
// Avant : getKanban() avec transformation complexe
// Après : getRepairsByStatus() direct
```

### 2. Logs détaillés
```javascript
console.log('Drag end result:', { source, destination, draggableId });
console.log(`Updating repair ${repairId} to status ${newStatus}`);
console.log('API response:', response);
```

### 3. Gestion d'erreurs améliorée
```javascript
try {
  // API call
} catch (err) {
  console.error('Error details:', err.response?.data || err.message);
  toast.error(`Erreur: ${err.response?.data?.message || err.message}`);
}
```

### 4. Affichage des colonnes vides
```javascript
{columnRepairs.length === 0 ? (
  <div className="text-center text-gray-500 py-8">
    <p className="text-sm">Aucune réparation</p>
  </div>
) : (
  // Les cartes...
)}
```

## 🧪 Tests à Effectuer

### Test 1 : Chargement
- [ ] Les réparations s'affichent dans les bonnes colonnes
- [ ] Le nombre de réparations par colonne est correct
- [ ] Les infos client et vélo sont visibles

### Test 2 : Drag & Drop
- [ ] La carte peut être saisie (curseur change)
- [ ] La carte suit le mouvement de la souris
- [ ] La carte peut être déposée dans une autre colonne
- [ ] Un toast de succès apparaît
- [ ] La carte change de colonne après rechargement

### Test 3 : Gestion d'erreurs
- [ ] Erreur réseau affiche un message clair
- [ ] La carte revient à sa place originale
- [ ] Les données se rechargent automatiquement

## 📝 Prochaines Étapes

1. **Tester avec le navigateur** en suivant les étapes ci-dessus
2. **Vérifier les logs** pour identifier le problème exact
3. **Corriger l'API backend** si nécessaire
4. **Améliorer l'UX** avec des animations et feedback

---

*Guide de debug créé le 18 mars 2026*
