@echo off
REM ================================================
REM IdeaFlow 백업 스크립트
REM ================================================
echo.
echo ==========================================
echo   IdeaFlow 백업 시작
echo ==========================================
echo.

REM 현재 날짜/시간
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set BACKUP_DATE=%datetime:~0,8%_%datetime:~8,4%

REM 백업 폴더 생성
set BACKUP_DIR=C:\IdeaFlow\backups\%BACKUP_DATE%
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo 백업 폴더: %BACKUP_DIR%
echo.

REM 1. SQL Server 데이터베이스 백업
echo [1/2] 데이터베이스 백업 중...
sqlcmd -S "(local)\SQLEXPRESS" -U sa -P "Akc!18031!" -C -Q "BACKUP DATABASE IdeaFlowDB TO DISK='%BACKUP_DIR%\IdeaFlowDB.bak' WITH FORMAT, COMPRESSION"
if %ERRORLEVEL% neq 0 (
    echo 데이터베이스 백업 실패!
) else (
    echo 데이터베이스 백업 완료: %BACKUP_DIR%\IdeaFlowDB.bak
)
echo.

REM 2. 첨부파일 폴더 백업
echo [2/2] 첨부파일 백업 중...
if exist "C:\IdeaFlow\uploads" (
    powershell -Command "Compress-Archive -Path 'C:\IdeaFlow\uploads' -DestinationPath '%BACKUP_DIR%\uploads.zip' -Force"
    if %ERRORLEVEL% neq 0 (
        echo 첨부파일 백업 실패!
    ) else (
        echo 첨부파일 백업 완료: %BACKUP_DIR%\uploads.zip
    )
) else (
    echo 첨부파일 폴더가 없습니다. 스킵합니다.
)
echo.

echo ==========================================
echo   백업 완료!
echo   위치: %BACKUP_DIR%
echo ==========================================
echo.

REM 30일 이상 된 백업 삭제 (선택사항)
echo 30일 이상 된 백업 정리 중...
forfiles /P "C:\IdeaFlow\backups" /D -30 /C "cmd /c if @isdir==TRUE rmdir /s /q @path" 2>nul
echo.

pause
