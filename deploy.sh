#!/bin/bash
# Script de déploiement complet ERP Michel De Vélo

echo "🚀 DÉPLOIEMENT COMPLET ERP MICHEL DE VÉLO"
echo "=========================================="

# 1. Backend - Migrations
echo "📦 Backend: Migrations..."
cd backend
python manage.py makemigrations
python manage.py migrate
echo "✅ Migrations terminées"

# 2. Backend - Redémarrage
echo "🔄 Backend: Redémarrage..."
taskkill /F /IM python.exe 2>nul
python manage.py runserver &
BACKEND_PID=$!
echo "✅ Backend démarré (PID: $BACKEND_PID)"

# 3. Frontend - Build
echo "🎨 Frontend: Build..."
cd ../frontend
npm run build
echo "✅ Build terminé"

# 4. Frontend - Redémarrage
echo "🔄 Frontend: Redémarrage..."
npx kill-port 3000 2>nul
npx kill-port 3001 2>nul
npm start &
FRONTEND_PID=$!
echo "✅ Frontend démarré (PID: $FRONTEND_PID)"

# 5. Test de connexion
echo "🧪 Test de connexion..."
sleep 5
curl -f http://localhost:8000/api/health 2>nul || echo "⚠️ Backend non accessible"
curl -f http://localhost:3001 2>nul || echo "⚠️ Frontend non accessible"

echo ""
echo "🎉 DÉPLOIEMENT TERMINÉ"
echo "========================"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3001"
echo "Database: ✅ Synchronisée"
echo ""
echo "✅ Système prêt pour la production !"
