#!/bin/bash
set -euo pipefail

# ==============================================================================
# Cloud Run Direct Environment Variables Configuration (Zero Secret Manager)
# ==============================================================================
# Este script configura as variáveis de ambiente diretamente no Google Cloud Run,
# funcionando com 100% de sucesso mesmo quando o Secret Manager estiver BLOQUEADO
# por restrições de organização (ex: constraints/gcp.restrictServiceUsage na pasta).
#
# Uso:
#   ./scripts/cloudrun-env-bootstrap.sh [SERVICE_NAME] [REGION] [PROJECT_ID]
#
# Exemplo:
#   ./scripts/cloudrun-env-bootstrap.sh aura-erp us-west2 snappy-champion-zsx2c
# ==============================================================================

SERVICE_NAME="${1:-${SERVICE_NAME:-aura-erp}}"
REGION="${2:-${REGION:-us-west2}}"
PROJECT_ID="${3:-${PROJECT_ID:-snappy-champion-zsx2c}}"

echo "================================================================================"
echo " 🚀 CONFIGURAÇÃO DE VARIÁVEIS DIRETAS NO CLOUD RUN (Sem Secret Manager)"
echo " Serviço:    $SERVICE_NAME"
echo " Região:     $REGION"
echo " Projeto:    $PROJECT_ID"
echo "================================================================================"

# 1. Gerar SESSION_SECRET de 64 caracteres criptograficamente aleatório se não fornecido
SESSION_SECRET_VAL="${SESSION_SECRET:-$(openssl rand -hex 32 2>/dev/null || date +%s | sha256sum | awk '{print $1}')}"

# 2. Montar lista de variáveis para o Cloud Run
ENV_VARS="SESSION_SECRET=$SESSION_SECRET_VAL,NODE_ENV=production"

if [ -n "${DATABASE_URL:-}" ]; then
  ENV_VARS="$ENV_VARS,DATABASE_URL=$DATABASE_URL"
  echo "   - DATABASE_URL: [configurada]"
else
  echo "   - DATABASE_URL: [não informada - mantenha a existente no serviço se já configurada]"
fi

if [ -n "${ASAAS_API_KEY:-}" ]; then
  ENV_VARS="$ENV_VARS,ASAAS_API_KEY=$ASAAS_API_KEY"
  echo "   - ASAAS_API_KEY: [configurada]"
fi

if [ -n "${ASAAS_WEBHOOK_ACCESS_TOKEN:-}" ]; then
  ENV_VARS="$ENV_VARS,ASAAS_WEBHOOK_ACCESS_TOKEN=$ASAAS_WEBHOOK_ACCESS_TOKEN"
fi

if [ -n "${CORS_ALLOWED_ORIGINS:-}" ]; then
  ENV_VARS="$ENV_VARS,CORS_ALLOWED_ORIGINS=$CORS_ALLOWED_ORIGINS"
fi

echo ""
echo "Aplicando variáveis de ambiente no Cloud Run..."
gcloud run services update "$SERVICE_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --update-env-vars="$ENV_VARS"

echo ""
echo "================================================================================"
echo " ✅ CLOUD RUN ATUALIZADO COM SUCESSO!"
echo " A nova revisão foi criada e iniciará com SESSION_SECRET válida."
echo "================================================================================"
