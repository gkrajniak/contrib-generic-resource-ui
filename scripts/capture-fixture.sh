#!/bin/bash
# Capture GraphQL fixture data from live gateway for offline testing
# Usage: ./scripts/capture-fixture.sh <config-name>

set -e

CONFIG_NAME="$1"
if [ -z "$CONFIG_NAME" ]; then
  echo "Usage: $0 <config-name>"
  echo ""
  echo "Available configs:"
  ls src/assets/configs/*.json 2>/dev/null | xargs -I{} basename {} .json | sed 's/^/  /'
  exit 1
fi

CONFIG_FILE="src/assets/configs/${CONFIG_NAME}.json"
if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: Config file not found: $CONFIG_FILE"
  exit 1
fi

# Load token
TOKEN=$(cat .secret/token 2>/dev/null || echo "")
if [ -z "$TOKEN" ]; then
  echo "Error: No token found in .secret/token"
  exit 1
fi

# Extract config values
GATEWAY_URL=$(jq -r '.portalContext.crdGatewayApiUrl' "$CONFIG_FILE")
GROUP=$(jq -r '.resourceDefinition.group' "$CONFIG_FILE")
VERSION=$(jq -r '.resourceDefinition.version' "$CONFIG_FILE")
KIND=$(jq -r '.resourceDefinition.kind' "$CONFIG_FILE")
PLURAL=$(jq -r '.resourceDefinition.plural' "$CONFIG_FILE")
SCOPE=$(jq -r '.resourceDefinition.scope' "$CONFIG_FILE")
NAMESPACE=$(jq -r '.namespaceId // empty' "$CONFIG_FILE")

# Normalize group name for GraphQL (replace . and - with _)
# For core API (empty group), we don't use a group prefix at all
GROUP_NORMALIZED=$(echo "$GROUP" | sed 's/[.-]/_/g')
USE_GROUP_PREFIX=true
if [ -z "$GROUP_NORMALIZED" ]; then
  USE_GROUP_PREFIX=false
fi

echo "Capturing fixture for: $KIND"
echo "  Gateway: $GATEWAY_URL"
echo "  Group: $GROUP ($GROUP_NORMALIZED), Version: $VERSION"
echo ""

FIXTURE_DIR="e2e/fixtures"
FIXTURE_FILE="${FIXTURE_DIR}/${CONFIG_NAME}.fixture.json"
TMP_DIR=$(mktemp -d)

mkdir -p "$FIXTURE_DIR"

# Function to fetch GraphQL
gql_fetch() {
  local QUERY="$1"
  curl -s -X POST "$GATEWAY_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"query\": \"$QUERY\"}"
}

# Function to fetch type introspection
fetch_type() {
  local TYPE_NAME="$1"
  gql_fetch "{ __type(name: \\\"$TYPE_NAME\\\") { name kind fields { name description type { name kind fields { name description type { name kind ofType { name kind } } } ofType { name kind fields { name type { name kind ofType { name kind } } } ofType { name kind } } } } inputFields { name description type { name kind ofType { name kind ofType { name kind ofType { name kind } } } } defaultValue } } }"
}

# Collect types that need introspection
collect_nested_types() {
  local JSON_FILE="$1"
  jq -r '
    .. | objects |
    select(.kind == "OBJECT" and .name != null) |
    .name
  ' "$JSON_FILE" 2>/dev/null | sort -u
}

echo "Step 1: Fetching main type introspection ($KIND)..."
fetch_type "$KIND" > "$TMP_DIR/type_${KIND}.json"

# Collect nested types from the main type
echo "Step 2: Discovering nested types..."
TYPES_TO_FETCH=$(collect_nested_types "$TMP_DIR/type_${KIND}.json")
FETCHED_TYPES="$KIND"

# Iteratively fetch nested types (up to 3 levels deep)
for i in 1 2 3; do
  NEW_TYPES=""
  for TYPE in $TYPES_TO_FETCH; do
    if ! echo "$FETCHED_TYPES" | grep -q "^${TYPE}$"; then
      echo "  Fetching: $TYPE"
      fetch_type "$TYPE" > "$TMP_DIR/type_${TYPE}.json"
      FETCHED_TYPES="$FETCHED_TYPES
$TYPE"
      # Find more nested types
      MORE_TYPES=$(collect_nested_types "$TMP_DIR/type_${TYPE}.json")
      NEW_TYPES="$NEW_TYPES
$MORE_TYPES"
    fi
  done
  TYPES_TO_FETCH=$(echo "$NEW_TYPES" | sort -u)
  if [ -z "$(echo "$TYPES_TO_FETCH" | tr -d '[:space:]')" ]; then
    break
  fi
done

# Build namespace args
NAMESPACE_ARG=""
NAMESPACE_DETAIL_ARG=""
if [ "$SCOPE" = "Namespaced" ] && [ -n "$NAMESPACE" ]; then
  NAMESPACE_ARG="(namespace: \\\"$NAMESPACE\\\")"
  NAMESPACE_DETAIL_ARG=", namespace: \\\"$NAMESPACE\\\""
fi

echo ""
echo "Step 3: Fetching list data..."

# Build query based on whether we have a group prefix
if [ "$USE_GROUP_PREFIX" = "true" ]; then
  LIST_QUERY="{ ${GROUP_NORMALIZED} { ${VERSION} { ${PLURAL}${NAMESPACE_ARG} { resourceVersion items { metadata { name namespace uid creationTimestamp labels } } } } } }"
  DATA_PATH=".data.${GROUP_NORMALIZED}.${VERSION}.${PLURAL}"
else
  LIST_QUERY="{ ${VERSION} { ${PLURAL}${NAMESPACE_ARG} { resourceVersion items { metadata { name namespace uid creationTimestamp labels } } } } }"
  DATA_PATH=".data.${VERSION}.${PLURAL}"
fi

gql_fetch "$LIST_QUERY" > "$TMP_DIR/list.json"

# Get first item name for detail query
FIRST_NAME=$(jq -r "${DATA_PATH}.items[0].metadata.name // empty" "$TMP_DIR/list.json")

if [ -n "$FIRST_NAME" ]; then
  echo "Step 4: Fetching detail data for: $FIRST_NAME"
  if [ "$USE_GROUP_PREFIX" = "true" ]; then
    DETAIL_QUERY="{ ${GROUP_NORMALIZED} { ${VERSION} { ${KIND}(name: \\\"${FIRST_NAME}\\\"${NAMESPACE_DETAIL_ARG}) { metadata { name namespace uid resourceVersion creationTimestamp deletionTimestamp labels annotations generation } } } } }"
  else
    DETAIL_QUERY="{ ${VERSION} { ${KIND}(name: \\\"${FIRST_NAME}\\\"${NAMESPACE_DETAIL_ARG}) { metadata { name namespace uid resourceVersion creationTimestamp deletionTimestamp labels annotations generation } } } }"
  fi
  gql_fetch "$DETAIL_QUERY" > "$TMP_DIR/detail.json"
else
  echo "Step 4: No items found, creating empty detail response"
  echo '{"data": null}' > "$TMP_DIR/detail.json"
fi

echo ""
echo "Step 5: Building fixture file..."

# Build the fixture JSON
{
  echo '{'
  echo '  "introspection": {'

  FIRST=true
  for TYPE_FILE in "$TMP_DIR"/type_*.json; do
    TYPE_NAME=$(basename "$TYPE_FILE" .json | sed 's/type_//')
    # Skip if type is null
    if [ "$(jq '.data.__type' "$TYPE_FILE")" = "null" ]; then
      continue
    fi
    if [ "$FIRST" != "true" ]; then
      echo ','
    fi
    FIRST=false
    echo -n "    \"$TYPE_NAME\": "
    cat "$TYPE_FILE"
  done

  echo ''
  echo '  },'
  echo -n '  "listResponse": '
  cat "$TMP_DIR/list.json"
  echo ','
  echo -n '  "detailResponse": '
  cat "$TMP_DIR/detail.json"
  echo ''
  echo '}'
} > "$TMP_DIR/fixture.json"

# Validate and format
if jq '.' "$TMP_DIR/fixture.json" > "$FIXTURE_FILE" 2>/dev/null; then
  echo ""
  echo "Fixture saved to: $FIXTURE_FILE"
  echo ""
  echo "Introspection types captured:"
  jq -r '.introspection | keys[]' "$FIXTURE_FILE" | sed 's/^/  /'
  echo ""
  echo "List items: $(jq ".listResponse.data.${GROUP_NORMALIZED}.${VERSION}.${PLURAL}.items | length" "$FIXTURE_FILE")"
else
  echo "Error: Failed to create valid JSON fixture"
  cat "$TMP_DIR/fixture.json"
  exit 1
fi

# Cleanup
rm -rf "$TMP_DIR"
