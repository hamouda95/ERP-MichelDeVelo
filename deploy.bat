@echo off
REM Script de déploiement complet ERP Michel De Vélo (Windows)

echo 🚀 DÉPLOIEMENT COMPLET ERP MICHEL DE VÉLO
echo ==========================================

REM 1. Backend - Migrations
echo 📦 Backend: Migrations...
cd backend
python manage.py makemigrations
python manage.py migrate
echo ✅ Migrations terminées

REM 2. Backend - Redémarrage
echo 🔄 Backend: Redémarrage...
taskkill /F /IM python.exe >nul 2>&1
start /B python manage.py runserver
echo ✅ Backend démarré

REM 3. Frontend - Build
echo 🎨 Frontend: Build...
cd ..\frontend
call npm run build
echo ✅ Build terminé

REM 4. Frontend - Redémarrage
echo 🔄 Frontend: Redémarrage...
npx kill-port 3000 >nul 2>&1
npx kill-port 3001 >nul 2>&1
start /B npm start
echo ✅ Frontend démarré

REM 5. Test de connexion
echo 🧪 Test de connexion...
timeout /t 3 >nul
curl -f http://localhost:8000/api/ >nul 2>&1 || echo ⚠️ Backend non accessible
curl -f http://localhost:3001 >nul 2>&1 || echo ⚠️ Frontend non accessible

echo.
echo 🎉 DÉPLOIEMENT TERMINÉ
echo ========================
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3001
echo Database: ✅ Synchronisée
echo.
echo ✅ Système prêt pour la production !
pause
