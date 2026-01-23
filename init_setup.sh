#!/bin/bash

# Configuration
PB_DIR="backend/pocketbase"
PB_EXEC="$PB_DIR/pocketbase"
PB_VERSION="0.22.21" # Default fallback version
OR_TOOLS_DIR="backend/src/or-tools"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Lavapunk initialization...${NC}"

# --- Part 1: PocketBase Check ---
echo "Checking PocketBase..."

install_pocketbase() {
    echo "Attempting to install PocketBase..."
    
    # Detect Architecture
    ARCH=$(uname -m)
    case $ARCH in
        x86_64)
            PB_ARCH="amd64"
            ;;
        aarch64)
            PB_ARCH="arm64"
            ;;
        armv7l)
            PB_ARCH="armv7"
            ;;
        *)
            echo -e "${RED}Unsupported architecture: $ARCH${NC}"
            exit 1
            ;;
    esac

    echo "Detected architecture: $PB_ARCH"
    
    # Define Download URL
    DOWNLOAD_URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip"
    ZIP_FILE="pocketbase.zip"

    echo "Downloading PocketBase v${PB_VERSION} from $DOWNLOAD_URL..."
    
    if command -v curl >/dev/null 2>&1; then
        curl -L -o "$ZIP_FILE" "$DOWNLOAD_URL"
    elif command -v wget >/dev/null 2>&1; then
        wget -O "$ZIP_FILE" "$DOWNLOAD_URL"
    else
        echo -e "${RED}Error: Neither curl nor wget found. Please install one to download PocketBase.${NC}"
        exit 1
    fi

    if [ ! -f "$ZIP_FILE" ]; then
         echo -e "${RED}Download failed.${NC}"
         exit 1
    fi

    # Ensure directory exists
    mkdir -p "$PB_DIR"

    # Unzip
    echo "Extracting..."
    if command -v unzip >/dev/null 2>&1; then
        unzip -o "$ZIP_FILE" -d "$PB_DIR" pocketbase
    else 
        echo -e "${RED}Error: unzip not found. Please install unzip.${NC}"
        rm "$ZIP_FILE"
        exit 1
    fi

    # Cleanup
    rm "$ZIP_FILE"
    chmod +x "$PB_EXEC"
    echo -e "${GREEN}PocketBase installed successfully.${NC}"
}

if [ -f "$PB_EXEC" ]; then
    # Check if executable works
    if "$PB_EXEC" --version > /dev/null 2>&1; then
        echo -e "${GREEN}PocketBase is present and executable.${NC}"
    else
        echo -e "${RED}PocketBase executable is corrupted or not working. Reinstalling...${NC}"
        rm -f "$PB_EXEC"
        install_pocketbase
    fi
else
    echo "PocketBase executable not found."
    install_pocketbase
fi


# --- Part 2: Python Check ---
echo "Checking Python setup..."

# Check if python3 is installed
if ! command -v python3 >/dev/null 2>&1; then
    echo -e "${RED}Error: Python 3 is not installed.${NC}"
    echo "Please install Python 3 to continue."
    exit 1
fi

echo -e "${GREEN}Python 3 is installed.${NC}"

# Check/Setup venv in OR_TOOLS_DIR
if [ ! -d "$OR_TOOLS_DIR" ]; then
     echo -e "${RED}Error: Directory $OR_TOOLS_DIR does not exist.${NC}"
     exit 1
fi

VENV_DIR="$OR_TOOLS_DIR/venv"
REQUIREMENTS_FILE="$OR_TOOLS_DIR/requirements.txt"

if [ -d "$VENV_DIR" ]; then
    echo -e "${GREEN}Virtual environment found in $OR_TOOLS_DIR.${NC}"
else
    echo "Virtual environment not found. Setting it up..."
    python3 -m venv "$VENV_DIR"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Virtual environment created.${NC}"
        
        # Install ortools
        echo "Installing ortools..."
        "$VENV_DIR/bin/pip" install ortools
        
        if [ $? -eq 0 ]; then
             echo -e "${GREEN}ortools installed successfully.${NC}"
        else
             echo -e "${RED}Failed to install ortools.${NC}"
             exit 1
        fi
    else
        echo -e "${RED}Failed to create virtual environment.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}Initialization complete!${NC}"
