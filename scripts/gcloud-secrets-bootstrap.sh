#!/bin/bash
# Script gerado para migração de segredos via gcloud CLI
PROJECT_ID="ais-us-west2-762fbb0b6f964552b"

# PostgreSQL / Cloud SQL full production connection string with SSL
gcloud secrets create aura-database-url --replication-policy="automatic" --project="$PROJECT_ID" 2>/dev/null || true
# gcloud secrets versions add aura-database-url --data-file=/path/to/secret --project="$PROJECT_ID"

# Database master password for user 'postgres' / 'aura_admin'
gcloud secrets create aura-sql-password --replication-policy="automatic" --project="$PROJECT_ID" 2>/dev/null || true
# gcloud secrets versions add aura-sql-password --data-file=/path/to/secret --project="$PROJECT_ID"

# Cryptographic HMAC-SHA256 signing secret for session tokens
gcloud secrets create aura-session-secret --replication-policy="automatic" --project="$PROJECT_ID" 2>/dev/null || true
# gcloud secrets versions add aura-session-secret --data-file=/path/to/secret --project="$PROJECT_ID"

# Google Gemini API key for server-side AI catalog enrichment
gcloud secrets create aura-gemini-api-key --replication-policy="automatic" --project="$PROJECT_ID" 2>/dev/null || true
# gcloud secrets versions add aura-gemini-api-key --data-file=/path/to/secret --project="$PROJECT_ID"

# AWS IAM Access Key ID for S3 media asset storage
gcloud secrets create aura-aws-access-key-id --replication-policy="automatic" --project="$PROJECT_ID" 2>/dev/null || true
# gcloud secrets versions add aura-aws-access-key-id --data-file=/path/to/secret --project="$PROJECT_ID"

# AWS IAM Secret Access Key for S3 media asset storage
gcloud secrets create aura-aws-secret-access-key --replication-policy="automatic" --project="$PROJECT_ID" 2>/dev/null || true
# gcloud secrets versions add aura-aws-secret-access-key --data-file=/path/to/secret --project="$PROJECT_ID"

# Cloudflare R2 Object Storage Access Key ID
gcloud secrets create aura-r2-access-key-id --replication-policy="automatic" --project="$PROJECT_ID" 2>/dev/null || true
# gcloud secrets versions add aura-r2-access-key-id --data-file=/path/to/secret --project="$PROJECT_ID"

# Cloudflare R2 Object Storage Secret Access Key
gcloud secrets create aura-r2-secret-access-key --replication-policy="automatic" --project="$PROJECT_ID" 2>/dev/null || true
# gcloud secrets versions add aura-r2-secret-access-key --data-file=/path/to/secret --project="$PROJECT_ID"

# Platform billing & gateway webhook HMAC verification secret
gcloud secrets create aura-billing-webhook-secret --replication-policy="automatic" --project="$PROJECT_ID" 2>/dev/null || true
# gcloud secrets versions add aura-billing-webhook-secret --data-file=/path/to/secret --project="$PROJECT_ID"

# Asaas payment gateway webhook access token
gcloud secrets create aura-asaas-webhook-access-token --replication-policy="automatic" --project="$PROJECT_ID" 2>/dev/null || true
# gcloud secrets versions add aura-asaas-webhook-access-token --data-file=/path/to/secret --project="$PROJECT_ID"


# Exemplo de Deploy no Cloud Run com segredos mapeados diretamente:
# gcloud run deploy aura-erp --project="$PROJECT_ID" \
#   --image=gcr.io/$PROJECT_ID/aura-erp:latest \
#   --set-secrets=DATABASE_URL=aura-database-url:latest,SQL_PASSWORD=aura-sql-password:latest,SESSION_SECRET=aura-session-secret:latest,GEMINI_API_KEY=aura-gemini-api-key:latest,AWS_ACCESS_KEY_ID=aura-aws-access-key-id:latest,AWS_SECRET_ACCESS_KEY=aura-aws-secret-access-key:latest,R2_ACCESS_KEY_ID=aura-r2-access-key-id:latest,R2_SECRET_ACCESS_KEY=aura-r2-secret-access-key:latest,BILLING_WEBHOOK_SECRET=aura-billing-webhook-secret:latest,ASAAS_WEBHOOK_ACCESS_TOKEN=aura-asaas-webhook-access-token:latest