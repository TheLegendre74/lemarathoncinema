@echo off
chcp 65001 >nul 2>nul
title Resultats Entrainement AMs
color 0B

echo.
echo  ===================================================
echo          RESULTATS ENTRAINEMENT AMs v2
echo  ===================================================
echo.

cd /d "%~dp0..\..\..\.."

echo   Que veux-tu faire ?
echo.
echo   [1] Voir les resultats
echo   [2] Voir les resultats avec historique detaille
echo   [3] Voir et APPLIQUER les poids dans le jeu
echo   [4] Forcer l'application (meme si peu d'amelioration)
echo.

set /p choix="  Ton choix (1-4) : "

if "%choix%"=="1" (
    echo.
    npx tsx app/labo/life/_life-god-game/training/show-results.ts
)
if "%choix%"=="2" (
    echo.
    npx tsx app/labo/life/_life-god-game/training/show-results.ts --history
)
if "%choix%"=="3" (
    echo.
    npx tsx app/labo/life/_life-god-game/training/show-results.ts --save
)
if "%choix%"=="4" (
    echo.
    npx tsx app/labo/life/_life-god-game/training/show-results.ts --save --force
)

echo.
pause
