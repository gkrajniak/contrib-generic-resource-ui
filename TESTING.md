# Testing & Development Guide

This document describes how to test the Generic Resource UI against different GraphQL gateways and configurations.

## Quick Start

### Testing against Kind cluster

```bash
# 1. Ensure your Kind cluster is running
kubectl cluster-info

# 2. Get a token (saved to .secret/token, valid for 24h)
task get-token

# 3. Start dev server (auto-fetches token if missing)
task dev
```

### Testing against local gateway

```bash
# 1. Port-forward the gateway (in a separate terminal)
task port-forward:gateway

# 2. Start with local config
task dev:local
```

## Token Management

Tokens are stored in `.secret/token` (gitignored). This keeps sensitive data out of config files.

```bash
# Fetch and save a new token (24h expiry)
task get-token

# Check current token status
task show-config

# Token is automatically used by:
# - task dev / task config:kind
# - task test-graphql / task test-resource
```

## Available Tasks

### Configuration Management

| Task | Description |
|------|-------------|
| `task config:list` | List all available config files |
| `task config:kind` | Switch to kind config using .secret/token |
| `task get-token` | Fetch token from cluster, save to .secret/token |
| `task config CONFIG_NAME=<name>` | Switch to a specific config file |
| `task show-config` | Display current config and token status |

### Development

| Task | Description |
|------|-------------|
| `task dev` | Switch to kind config and start dev server |
| `task dev:local` | Start with local gateway (localhost:8080) |
| `task start` | Start development server |
| `task build` | Build the Angular application |

### Troubleshooting

| Task | Description |
|------|-------------|
| `task test-graphql` | Test GraphQL endpoint with introspection query |
| `task test-resource` | Test fetching the configured resource type |
| `task port-forward:gateway` | Port-forward to kubernetes-graphql-gateway |

## Config File Structure

Config files are stored in `src/assets/config.*.json`. The active config is `src/assets/config.json`.

### AppConfig Format

```json
{
  "resourceDefinition": {
    "group": "core.platform-mesh.io",
    "version": "v1alpha1",
    "kind": "AccountInfo",
    "plural": "AccountInfoes",
    "singular": "AccountInfo",
    "scope": "Cluster"
  },
  "portalContext": {
    "crdGatewayApiUrl": "https://localhost/api/kubernetes-graphql-gateway/root:platform-mesh/graphql"
  },
  "token": "your-jwt-token-here",
  "resourceId": "account",
  "ui": {
    "title": "Account Info",
    "showCreateButton": false,
    "showDeleteButton": false,
    "showEditButton": false,
    "showYamlPanel": true
  }
}
```

## Creating New Configs

1. Create a new file: `src/assets/config.<name>.json`
2. Use the AppConfig format above
3. Switch to it: `task config CONFIG_NAME=<name>`

## Manual Testing with curl

```bash
# Get current config values
GATEWAY=$(jq -r '.portalContext.crdGatewayApiUrl' src/assets/config.json)
TOKEN=$(jq -r '.token' src/assets/config.json)

# Test introspection
curl -s -X POST "$GATEWAY" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "{ __schema { queryType { name } } }"}' | jq .

# Test specific resource
curl -s -X POST "$GATEWAY" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "{ core_platform_mesh_io { v1alpha1 { AccountInfo { metadata { name } } } } }"}' | jq .
```

## Troubleshooting

### Token Issues

```bash
# Check if token is valid JWT
task show-config

# Get a fresh token
task get-token

# Update config with fresh token
task config:kind
```

### Gateway Connection Issues

```bash
# Test if gateway is reachable
task test-graphql

# Port-forward if needed
task port-forward:gateway
```

### Schema/Query Issues

```bash
# Test resource query
task test-resource

# Check browser DevTools > Network tab for GraphQL requests
# Look for query structure and response errors
```

## Security Note

- Tokens are stored in `.secret/token` which is gitignored
- The `src/assets/config.json` uses a placeholder token by default
- Real tokens are read from `.secret/token` at runtime by the test tasks
