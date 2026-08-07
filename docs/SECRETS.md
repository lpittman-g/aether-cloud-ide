# Secrets — names only

Store **values** in GitHub Actions secrets / Cursor environment secrets.  
Store **names and purpose** here so future agents know what to expect.

## GitHub Actions (`lpittman-g/aether-cloud-ide`)

| Name | Type | Purpose |
| --- | --- | --- |
| `AWS_ACCESS_KEY_ID` | secret | IAM access key for deploy |
| `AWS_SECRET_ACCESS_KEY` | secret | IAM secret for deploy |
| `AWS_SESSION_TOKEN` | secret (optional) | Temporary session token |
| `EC2_SSH_KEY` | secret | Contents of EC2 `.pem` private key |
| `AWS_REGION` | variable | e.g. `us-east-2` |
| `EC2_KEY_NAME` | variable | e.g. `aether-cursor` |
| `AWS_ACCOUNT_ID` | variable | Target account id |

## Cursor Cloud environment

Same names preferred so Cloud Agents can deploy without interactive `aws login`.

## Azure (optional — VMAzule)

| Name | Type | Purpose |
| --- | --- | --- |
| `AZURE_SUBSCRIPTION_ID` | secret / env | Subscription 1 GUID (starts `09ab433b-d579-4c…`) |
| `AZURE_TENANT_ID` | secret (optional) | Entra tenant for SP login |
| `AZURE_CLIENT_ID` | secret (optional) | App registration / SP client id |
| `AZURE_CLIENT_SECRET` | secret (optional) | SP client secret |
| `AZURE_VM_SSH_KEY` | secret (optional) | Private key for SSH to VM behind `VMAzule-ip` |

Prefer device-code `az login` when interactive; use SP secrets for headless agents.

## Never commit

- IAM secret access keys  
- Console passwords  
- SSH private keys / PEM files  
- OAuth device codes / authorization blobs  
- `~/.aws/credentials` contents  
- GCP service account JSON keys  

If a secret was pasted into chat, **rotate it** and update the secret store — do not copy it into git.

## Google Cloud

| Name | Type | Purpose |
| --- | --- | --- |
| `GCP_PROJECT_ID` | secret / env | Target GCP project |
| `GCP_REGION` | env | e.g. `us-central1` |
| `GCP_ZONE` | env | e.g. `us-central1-a` |
| `GCP_SERVICE_ACCOUNT_KEY` | secret | Service account JSON |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | secret | Alternate SA JSON blob |
