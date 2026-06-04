@echo off
chcp 65001 >nul 2>nul
title Entrainement Evolutif AMs v2
color 0A

echo.
echo  ===================================================
echo            ENTRAINEMENT EVOLUTIF DES AMs v2
echo  ===================================================
echo.
echo   Les resultats se cumulent entre les sessions.
echo   Tu peux fermer et relancer a tout moment.
echo.
echo   Config : pop=30, gen=40, ticks=8000, runs=2
echo   (modifiable avec --pop --gen --ticks --runs)
echo.
echo   Fitness : Expansion, Terraform, Cooperation,
echo             Specialisation, Efficacite
echo   Baseline automatique : poids neutres 1.0
echo.
echo  ---------------------------------------------------
echo.

cd /d "%~dp0..\..\..\.."
npx tsx app/labo/life/_life-god-game/training/run-training.ts %*

echo.
echo  ---------------------------------------------------
echo.
echo   Entrainement termine !
echo   Lance VOIR-RESULTATS.bat pour consulter.
echo.
pause
