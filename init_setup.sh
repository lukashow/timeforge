#!/bin/bash

# Configuration
PB_DIR="backend/pocketbase"
PB_EXEC="$PB_DIR/pocketbase"
PB_VERSION="0.22.21" 
OR_TOOLS_DIR="backend/src/or-tools"
MIN_NODE_VERSION=18
MIN_PYTHON_VERSION=3
MIN_PYTHON_MINOR=11

# Colors and Formatting
BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# --- Helper Functions ---

print_banner() {
    echo -e "${CYAN}${BOLD}"
    cat << "EOF"
███╗   ███╗██╗  ██╗ ██████╗  █████╗ 
████╗ ████║██║  ██║██╔════╝ ██╔══██╗
██╔████╔██║███████║██║  ███╗███████║
██║╚██╔╝██║██╔══██║██║   ██║██╔══██║
██║ ╚═╝ ██║██║  ██║╚██████╔╝██║  ██║
╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝
EOF
    echo -e "${BLUE}      TimeForge System Initialization${NC}\n"
}

check_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

version_gt() { test "$(printf '%s\n' "$@" | sort -V | head -n 1)" != "$1"; }

check_node_version() {
    echo -n "Checking Node.js... "
    if ! check_command node; then
        echo -e "${RED}Not Installed${NC}"
        echo -e "${YELLOW}Please install Node.js (v${MIN_NODE_VERSION}+).${NC}"
        exit 1
    fi

    NODE_V=$(node -v | cut -d'v' -f2)
    MAJOR_V=$(echo "$NODE_V" | cut -d'.' -f1)

    if [ "$MAJOR_V" -lt "$MIN_NODE_VERSION" ]; then
        echo -e "${RED}v${NODE_V} (Too Old)${NC}"
        echo -e "${YELLOW}This project requires Node.js v${MIN_NODE_VERSION} or newer.${NC}"
        exit 1
    fi
    echo -e "${GREEN}v${NODE_V} (OK)${NC}"
}

check_python_version() {
    echo -n "Checking Python... "
    if ! check_command python3; then
        echo -e "${RED}Not Installed${NC}"
        echo -e "${YELLOW}Please install Python 3.11+.${NC}"
        exit 1
    fi

    PY_V=$(python3 --version 2>&1 | awk '{print $2}')
    PY_MAJOR=$(echo "$PY_V" | cut -d'.' -f1)
    PY_MINOR=$(echo "$PY_V" | cut -d'.' -f2)

    if [ "$PY_MAJOR" -lt "$MIN_PYTHON_VERSION" ] || ([ "$PY_MAJOR" -eq "$MIN_PYTHON_VERSION" ] && [ "$PY_MINOR" -lt "$MIN_PYTHON_MINOR" ]); then
        echo -e "${RED}v${PY_V} (Too Old)${NC}"
        echo -e "${YELLOW}This project requires Python v${MIN_PYTHON_VERSION}.${MIN_PYTHON_MINOR}+ for OR-Tools.${NC}"
        exit 1
    fi
    echo -e "${GREEN}v${PY_V} (OK)${NC}"
}

check_bun() {
    echo -n "Checking Bun...    "
    if ! check_command bun; then
        echo -e "${RED}Not Installed${NC}"
        echo -e "${YELLOW}Run: curl -fsSL https://bun.sh/install | bash${NC}"
        exit 1
    fi
     BUN_V=$(bun --version)
     echo -e "${GREEN}v${BUN_V} (OK)${NC}"
}

spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# --- Main Script ---

clear
print_banner

# 1. Environment Checks
echo -e "${BOLD}--- Environment Checks ---${NC}"
check_node_version
check_python_version
check_bun
echo ""

# 2. PocketBase Setup
echo -e "${BOLD}--- PocketBase Setup ---${NC}"

if [ -f "$PB_EXEC" ] && "$PB_EXEC" --version > /dev/null 2>&1; then
    echo -e "PocketBase status: ${GREEN}Ready${NC}"
else
    echo -e "PocketBase status: ${YELLOW}Missing or Corrupted${NC}"
    
    install_pocketbase() {
        ARCH=$(uname -m)
        case $ARCH in
            x86_64) PB_ARCH="amd64" ;;
            aarch64) PB_ARCH="arm64" ;;
            armv7l) PB_ARCH="armv7" ;;
            *) echo -e "${RED}Unsupported architecture: $ARCH${NC}"; return 1 ;;
        esac

        DOWNLOAD_URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip"
        ZIP_FILE="pocketbase.zip"

        echo -n "Downloading PocketBase... "
        curl -L -o "$ZIP_FILE" "$DOWNLOAD_URL" >/dev/null 2>&1 &
        spinner $!
        
        if [ ! -f "$ZIP_FILE" ]; then echo -e "${RED}Failed${NC}"; return 1; fi
        echo -e "${GREEN}Done${NC}"

        echo -n "Installing... "
        mkdir -p "$PB_DIR"
        unzip -o "$ZIP_FILE" -d "$PB_DIR" pocketbase >/dev/null 2>&1
        rm "$ZIP_FILE"
        chmod +x "$PB_EXEC"
        echo -e "${GREEN}Done${NC}"
    }

    install_pocketbase
    if [ $? -ne 0 ]; then exit 1; fi
fi
echo ""

# 3. Python Virtual Env
echo -e "${BOLD}--- Python Environment ---${NC}"

if [ ! -d "$OR_TOOLS_DIR" ]; then
     echo -e "${RED}Error: Directory $OR_TOOLS_DIR does not exist.${NC}"
     exit 1
fi

VENV_DIR="$OR_TOOLS_DIR/.venv"

if [ -d "$VENV_DIR" ]; then
    echo -e "Virtual Environment:       ${GREEN}Found${NC}"
else
    echo -n "Creating Virtual Config... "
    python3 -m venv "$VENV_DIR" &
    spinner $!
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Created${NC}"
        
        echo -n "Installing OR-Tools...    "
        "$VENV_DIR/bin/pip" install ortools >/dev/null 2>&1 &
        spinner $!
        
        if [ $? -eq 0 ]; then
             echo -e "${GREEN}Installed${NC}"
        else
             echo -e "${RED}Failed${NC}"
             exit 1
        fi
    else
        echo -e "${RED}Failed${NC}"
        exit 1
    fi
fi

# --- Completion ---
echo -e "\n${GREEN}${BOLD}Initialization Complete!${NC}"
echo -e "You are ready to forge time.\n"

read -p "Do you want to start the server now? (Y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo -e "\n${CYAN}Starting Development Server...${NC}"
    bun dev
else
    echo -e "\n${YELLOW}To start manually run: bun dev${NC}"
fi
