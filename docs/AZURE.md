# Azure — VMAzule

## Target resources (from Azure mobile / portal)

| Field | Value |
| --- | --- |
| Public IP name | `VMAzule-ip` |
| Public IP address | `20.121.66.136` |
| Location | East US |
| Resource group | `VMAzule_group` |
| Subscription | Subscription 1 (id starts `09ab433b-d579-4c…`) |
| DNS name | not configured |

## Intended use

Secondary (or alternate) host for **Aether** cloud IDE, parallel to the AWS EC2 deploy documented in `docs/AWS.md`.

| Surface (once deployed) | Expected URL |
| --- | --- |
| IDE | http://20.121.66.136:3000 |
| API health | http://20.121.66.136:4000/api/health |

## Access needed to finish deploy

Agents need **one** of:

1. Azure CLI / MCP auth (`az login` device code, or service principal secrets — see `docs/SECRETS.md`)
2. SSH (or WinRM/RDP) credentials for the VM bound to `VMAzule-ip`

Without that, only the public IP inventory can be recorded.

## Probe notes (2026-08-07)

- TCP connect to common ports from the agent VM was inconclusive/unreliable; HTTP to `:80` connected then timed out with no response.
- Do not assume Aether is already running on this IP until health checks succeed after install.

## Next steps

1. Authenticate Azure (`az account set` to Subscription 1).
2. Resolve VM name NIC → `VMAzule-ip`, OS type, NSG rules.
3. Open NSG for `:3000` / `:4000` (and SSH/22 or RDP as appropriate).
4. Install Node + Docker, sync repo to `/opt/aether/app`, start frontend/backend (mirror `infra/aws/launch.sh` patterns).
5. Verify health + `/api/run`, then update `docs/PROJECT_STATUS.md`.
