#!/bin/bash
# Switch between different config files for testing
# Usage: ./scripts/switch-config.sh <config-name> [--token=TOKEN] [--token-file]
#
# Examples:
#   ./scripts/switch-config.sh kind --token-file          # Use .secret/token
#   ./scripts/switch-config.sh kind --token=eyJhbG...     # Explicit token
#   ./scripts/switch-config.sh local
#   ./scripts/switch-config.sh accounts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$PROJECT_DIR/.config"
ASSETS_DIR="$PROJECT_DIR/src/assets"
SECRET_DIR="$PROJECT_DIR/.secret"

CONFIG_NAME="${1:-}"
TOKEN=""
USE_TOKEN_FILE=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --token=*)
      TOKEN="${arg#*=}"
      shift
      ;;
    --token-file)
      USE_TOKEN_FILE=true
      shift
      ;;
    --gateway=*)
      GATEWAY="${arg#*=}"
      shift
      ;;
    *)
      if [ -z "$CONFIG_NAME" ]; then
        CONFIG_NAME="$arg"
      fi
      ;;
  esac
done

# Read token from file if requested or if token is empty and file exists
if [ "$USE_TOKEN_FILE" = true ] || { [ -z "$TOKEN" ] && [ -s "$SECRET_DIR/token" ]; }; then
  if [ -s "$SECRET_DIR/token" ]; then
    TOKEN=$(cat "$SECRET_DIR/token")
  fi
fi

if [ -z "$CONFIG_NAME" ]; then
  echo "Usage: $0 <config-name> [--token=TOKEN] [--gateway=URL]"
  echo ""
  echo "Available configs:"
  for f in "$CONFIG_DIR"/config.*.json; do
    name=$(basename "$f" | sed 's/config\.\(.*\)\.json/\1/')
    if [ "$name" != "*" ]; then
      echo "  - $name"
    fi
  done
  echo ""
  echo "Examples:"
  echo "  $0 kind"
  echo "  $0 local --gateway=https://my-gateway/graphql"
  exit 1
fi

SOURCE_FILE="$CONFIG_DIR/config.$CONFIG_NAME.json"
TARGET_FILE="$ASSETS_DIR/config.json"

if [ ! -f "$SOURCE_FILE" ]; then
  echo "Error: Config file not found: $SOURCE_FILE"
  echo ""
  echo "Available configs:"
  for f in "$CONFIG_DIR"/config.*.json; do
    name=$(basename "$f" | sed 's/config\.\(.*\)\.json/\1/')
    if [ "$name" != "*" ]; then
      echo "  - $name"
    fi
  done
  exit 1
fi

# Copy the config file
cp "$SOURCE_FILE" "$TARGET_FILE"
echo "Using config: $SOURCE_FILE"

# Replace token if provided
if [ -n "$TOKEN" ]; then
  if command -v jq &> /dev/null; then
    jq --arg token "$TOKEN" '.token = $token' "$TARGET_FILE" > "$TARGET_FILE.tmp" && mv "$TARGET_FILE.tmp" "$TARGET_FILE"
    echo "Token updated (${#TOKEN} chars)"
  else
    # Fallback to sed if jq not available
    sed -i.bak "s/\"token\": \"[^\"]*\"/\"token\": \"$TOKEN\"/" "$TARGET_FILE"
    rm -f "$TARGET_FILE.bak"
    echo "Token updated (${#TOKEN} chars)"
  fi
fi

# Replace gateway URL if provided
if [ -n "$GATEWAY" ]; then
  if command -v jq &> /dev/null; then
    jq --arg url "$GATEWAY" '.portalContext.crdGatewayApiUrl = $url' "$TARGET_FILE" > "$TARGET_FILE.tmp" && mv "$TARGET_FILE.tmp" "$TARGET_FILE"
    echo "Gateway URL updated: $GATEWAY"
  else
    echo "Warning: jq not found, cannot update gateway URL"
  fi
fi

echo ""
echo "Current config:"
cat "$TARGET_FILE" | jq -r '"\(.resourceDefinition.kind) @ \(.portalContext.crdGatewayApiUrl)"' 2>/dev/null || cat "$TARGET_FILE"
