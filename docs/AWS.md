# AWS — Cutline / Aether

## Target account

| Field | Value |
| --- | --- |
| Account name | Cutline Indusries (org member) |
| Account ID | `583968735276` |
| Org path | `o-3hu6u8ofxz` |
| Console sign-in | https://583968735276.signin.aws.amazon.com/console |
| IAM user (automation) | `Cursor` |
| Preferred region | `us-east-2` (Ohio) |

### Other accounts seen in this project (do not mix)

| Account ID | Context |
| --- | --- |
| `328681352894` | Tru kids brand llc (earlier screenshot) |
| `536831202884` | KMS key alias `Cursor` in `ap-northeast-1` (different account) |

Deploy automation defaults to **`583968735276` + `us-east-2`**.

## IAM setup

1. User `Cursor` with **AdministratorAccess** (or tighter later).  
2. Create **access key** (CLI):  
   https://console.aws.amazon.com/iam/home#/users/details/Cursor?section=security_credentials  
3. Put values in GitHub / Cursor secrets (see `SECRETS.md`).

Console password login alone is **not** enough for the agent CLI — API access keys are required.

## Autonomous bootstrap

Once Access Key ID + Secret are available:

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=us-east-2
export AWS_ACCOUNT_ID=583968735276
./infra/aws/bootstrap-from-keys.sh
```

This script:

1. Configures local AWS CLI  
2. Writes GitHub Actions secrets/vars  
3. Creates EC2 key pair `aether-cursor`  
4. Runs `infra/aws/launch.sh` (CloudFormation + rsync + systemd)

## Hands-off deploys after secrets exist

Push to `main` (paths under `backend/`, `frontend/`, `infra/aws/`, …) triggers **Deploy AWS EC2**.
