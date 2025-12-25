@echo off
REM ================================================
REM IdeaFlow 서버 시작 스크립트
REM ================================================
echo.
echo ==========================================
echo   IdeaFlow 서버 시작
echo ==========================================
echo.

REM 현재 디렉토리 확인
cd /d %~dp0

REM 백엔드 서버 빌드
echo [1/3] 백엔드 빌드 중...
cd server
call npm run build
if %ERRORLEVEL% neq 0 (
    echo 백엔드 빌드 실패!
    pause
    exit /b 1
)

REM 프론트엔드 빌드
echo [2/3] 프론트엔드 빌드 중...
cd ..
call npm run build
if %ERRORLEVEL% neq 0 (
    echo 프론트엔드 빌드 실패!
    pause
    exit /b 1
)

REM PM2로 서버 시작
echo [3/3] PM2로 서버 시작 중...
call pm2 start ecosystem.config.json

echo.
echo ==========================================
echo   서버 시작 완료!
echo   API:  http://localhost:4000
echo   Web:  dist 폴더를 IIS 또는 nginx로 서빙
echo ==========================================
echo.
echo PM2 상태 확인: pm2 status
echo 로그 보기: pm2 logs ideaflow-api
echo 서버 중지: pm2 stop ideaflow-api
echo.
pause
