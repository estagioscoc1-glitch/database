@echo off
REM ===========================================================================
REM  Liga o Portal Academico no seu computador.
REM
REM  Dois cliques neste arquivo. Abre uma janela preta — deixe ABERTA.
REM  Enquanto ela estiver aberta, o portal funciona em http://localhost:3000
REM
REM  Se a janela sumir na hora, o motivo fica gravado em DIAGNOSTICO.txt,
REM  nesta mesma pasta.
REM ===========================================================================
title Portal Academico COC - servidor ligado (nao feche esta janela)
cd /d "%~dp0"

set LOG=%~dp0DIAGNOSTICO.txt
echo ============================================ > "%LOG%"
echo Data: %date% %time% >> "%LOG%"
echo Pasta: %cd% >> "%LOG%"
echo. >> "%LOG%"

echo  Verificando o Node.js...
where node >> "%LOG%" 2>&1
if errorlevel 1 (
  echo. >> "%LOG%"
  echo ERRO: o Node.js nao foi encontrado no PATH. >> "%LOG%"
  echo.
  echo  ERRO: o Node.js nao foi encontrado.
  echo  Isso esta anotado em DIAGNOSTICO.txt
  echo.
  pause
  exit /b 1
)

echo  Verificando o npm...
where npm >> "%LOG%" 2>&1
if errorlevel 1 (
  echo. >> "%LOG%"
  echo ERRO: o npm nao foi encontrado no PATH. >> "%LOG%"
  echo.
  echo  ERRO: o npm nao foi encontrado.
  echo  Isso esta anotado em DIAGNOSTICO.txt
  echo.
  pause
  exit /b 1
)

node -v >> "%LOG%" 2>&1
echo. >> "%LOG%"
echo --- saida do servidor --- >> "%LOG%"

echo.
echo  Ligando o Portal Academico...
echo  Quando aparecer "Local: http://localhost:3000", ja pode usar.
echo.
echo  NAO FECHE ESTA JANELA enquanto estiver usando o sistema.
echo.

call npm run dev 2>&1

echo. >> "%LOG%"
echo --- o servidor parou --- >> "%LOG%"
echo.
echo  O servidor parou. O motivo esta em DIAGNOSTICO.txt
echo  Pressione qualquer tecla para fechar.
pause > nul
