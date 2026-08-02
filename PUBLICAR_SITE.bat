@echo off
title Publicar o Portal Academico

REM ===========================================================================
REM  PUBLICAR O PORTAL NO AR
REM
REM  Para usar: clique duas vezes neste arquivo. So isso.
REM
REM  O que ele faz, na ordem:
REM    1. Monta a versao nova do site
REM    2. Envia para o GitHub
REM    3. O Cloudflare percebe sozinho e publica em ~2 minutos
REM
REM  Sem acentos de proposito: a janela preta do Windows costuma trocar
REM  acentuacao por simbolos estranhos, e isso confunde mais do que ajuda.
REM ===========================================================================

cd /d "%~dp0"

echo.
echo ==========================================================
echo   PUBLICAR O PORTAL ACADEMICO
echo ==========================================================
echo.
echo   Isso leva de 1 a 3 minutos. Nao feche esta janela.
echo.
echo ----------------------------------------------------------
echo   ETAPA 1 de 3 - Montando a versao nova do site
echo ----------------------------------------------------------
echo.

call npm run build
if errorlevel 1 goto ERRO_BUILD

echo.
echo   [OK] Versao montada.
echo.
echo ----------------------------------------------------------
echo   ETAPA 2 de 3 - Guardando as alteracoes
echo ----------------------------------------------------------
echo.

git add -A
git commit -m "Portal Academico COC - atualizacao do portal"

REM  Se nao houver nada novo para guardar, o git reclama. Nao e erro:
REM  significa apenas que nada mudou desde a ultima publicacao.

echo.
echo ----------------------------------------------------------
echo   ETAPA 3 de 3 - Enviando para a internet
echo ----------------------------------------------------------
echo.

git push origin main
if errorlevel 1 goto ERRO_ENVIO

echo.
echo ==========================================================
echo   PRONTO
echo ==========================================================
echo.
echo   O codigo foi enviado. O site se atualiza sozinho
echo   em cerca de 2 minutos.
echo.
echo   Depois disso, abra o portal e segure a tecla CTRL
echo   enquanto aperta F5. Isso obriga o navegador a baixar
echo   a versao nova em vez de reaproveitar a antiga.
echo.
echo   Endereco: https://portal.colegiooswaldocruz.com.br
echo.
echo ----------------------------------------------------------
echo   Aperte qualquer tecla para fechar.
pause > nul
exit /b 0


:ERRO_BUILD
echo.
echo ==========================================================
echo   PAROU NA ETAPA 1
echo ==========================================================
echo.
echo   A versao nova do site nao foi montada. NADA foi
echo   publicado, e o site no ar continua funcionando
echo   normalmente com a versao antiga.
echo.
echo   O que fazer: tire uma foto desta janela inteira
echo   (ou copie o texto acima) e mande para o Claude.
echo.
echo   As linhas em vermelho, mais acima, dizem o motivo.
echo.
pause > nul
exit /b 1


:ERRO_ENVIO
echo.
echo ==========================================================
echo   PAROU NA ETAPA 3
echo ==========================================================
echo.
echo   A versao nova foi montada, mas nao chegou na internet.
echo   O site no ar continua com a versao antiga, funcionando.
echo.
echo   Causa mais comum: internet caiu ou o GitHub pediu senha.
echo.
echo   O que fazer:
echo     1. Confira se a internet esta funcionando
echo     2. Clique duas vezes neste arquivo de novo
echo     3. Se repetir, mande foto desta janela para o Claude
echo.
pause > nul
exit /b 1
