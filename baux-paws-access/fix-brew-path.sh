#!/bin/bash

# Script per aggiungere Homebrew al PATH

echo "🔧 Aggiunta Homebrew al PATH"
echo "============================"
echo ""

# Detect architecture
ARCH=$(uname -m)

if [ "$ARCH" = "arm64" ]; then
    BREW_PATH="/opt/homebrew/bin"
    echo "✅ Rilevato Apple Silicon (M1/M2)"
elif [ "$ARCH" = "x86_64" ]; then
    BREW_PATH="/usr/local/bin"
    echo "✅ Rilevato Intel"
else
    echo "⚠️  Architettura sconosciuta: $ARCH"
    BREW_PATH="/opt/homebrew/bin"
fi

echo "📁 Percorso Homebrew: $BREW_PATH"
echo ""

# Check if brew exists
if [ ! -f "$BREW_PATH/brew" ]; then
    echo "❌ Homebrew non trovato in $BREW_PATH"
    echo ""
    echo "Cerca in altri percorsi..."
    
    # Try to find brew
    BREW_FOUND=$(find /opt /usr/local -name brew -type f 2>/dev/null | head -1)
    
    if [ -n "$BREW_FOUND" ]; then
        BREW_PATH=$(dirname "$BREW_FOUND")
        echo "✅ Trovato in: $BREW_PATH"
    else
        echo "❌ Homebrew non trovato. Reinstalla con:"
        echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
        exit 1
    fi
fi

# Check current shell
SHELL_NAME=$(basename "$SHELL")
echo "🐚 Shell corrente: $SHELL_NAME"
echo ""

# Add to PATH
if [ "$SHELL_NAME" = "zsh" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ "$SHELL_NAME" = "bash" ]; then
    SHELL_RC="$HOME/.bash_profile"
else
    SHELL_RC="$HOME/.profile"
fi

echo "📝 Aggiunta a: $SHELL_RC"
echo ""

# Check if already in PATH
if grep -q "$BREW_PATH" "$SHELL_RC" 2>/dev/null; then
    echo "✅ Homebrew è già nel PATH in $SHELL_RC"
else
    echo "➕ Aggiungo Homebrew al PATH..."
    echo "" >> "$SHELL_RC"
    echo "# Homebrew" >> "$SHELL_RC"
    echo "export PATH=\"$BREW_PATH:\$PATH\"" >> "$SHELL_RC"
    echo "✅ Aggiunto a $SHELL_RC"
fi

# Add to current session
export PATH="$BREW_PATH:$PATH"

echo ""
echo "✅ Homebrew aggiunto al PATH"
echo ""
echo "🔍 Verifica:"
echo "   PATH contiene Homebrew: $(echo $PATH | grep -q "$BREW_PATH" && echo "✅ Sì" || echo "❌ No")"
echo ""

# Test brew
if command -v brew &> /dev/null; then
    echo "✅ brew funziona!"
    brew --version
else
    echo "⚠️  brew ancora non funziona in questa sessione"
    echo ""
    echo "Soluzioni:"
    echo "1. Riavvia il terminale"
    echo "2. Oppure esegui: source $SHELL_RC"
    echo "3. Oppure esegui: export PATH=\"$BREW_PATH:\$PATH\""
fi




