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

## Never commit

- IAM secret access keys  
- Console passwords  
- SSH private keys / PEM files  
- OAuth device codes / authorization blobs  
- `~/.aws/credentials` contents  

If a secret was pasted into chat, **rotate it** and update the secret store — do not copy it into git.
