@echo off
echo Starting TubeScript application...

REM Check if virtual environment is activated
if "%VIRTUAL_ENV%"=="" (
    echo Activating Python virtual environment...
    cd backend
    if not exist venv (
        echo Creating virtual environment...
        python -m venv venv
        call venv\Scripts\activate
        echo Installing Python dependencies...
        pip install -r requirements.txt
    ) else (
        call venv\Scripts\activate
    )
    cd ..
) else (
    echo Virtual environment already active: %VIRTUAL_ENV%
)

REM Check if .env file exists
if not exist backend\.env (
    echo WARNING: No .env file found in backend directory
    echo Please create backend\.env with your HuggingFace token before proceeding
    echo Example: HUGGINGFACE_TOKEN=your_token_here
    pause
    exit /b
)

REM Start backend server in a new window
start cmd /k "cd backend && call venv\Scripts\activate && python app.py"

REM Check if node_modules exists, if not run npm install
if not exist frontend\node_modules (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo TubeScript is starting...
echo Backend server: http://localhost:8001
echo Frontend application: http://localhost:3000

REM Start frontend dev server in current window
cd frontend && npm run dev