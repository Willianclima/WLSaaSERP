#!/bin/bash
set -euo pipefail

# ==============================================================================
# Google Cloud Secret Manager & Cloud Run Injection Bootstrap Script
# ==============================================================================
# Uso:
#   ./scripts/gcloud-secrets-bootstrap.sh [PROJECT_ID] [REGION] [SERVICE_NAME]
#
# Exemplo:
#   ./scripts/gcloud-secrets-bootstrap.sh snappy-champion-zsx2c us-west2 aura-erp
# ==============================================================================

PROJECT_ID="${1:-${PROJECT_ID:-snappy-champion-zsx2c}}"
REGION="${2:-${REGION:-us-west2}}"
SERVICE_NAME="${3:-${SERVICE_NAME:-aura-erp}}"

echo "================================================================================"
echo " 🔒 INICIALIZANDO GOOGLE CLOUD SECRET MANAGER"
echo " Projeto:       $PROJECT_ID"
echo " Região:        $REGION"
echo " Serviço Run:   $SERVICE_NAME"
echo "================================================================================"

# 1. Habilitar APIs necessárias no projeto
echo "1. Verificando ativação de APIs no GCP..."
gcloud services enable secretmanager.googleapis.com run.googleapis.com --project="$PROJECT_ID"

# 2. Obter número do projeto para identificação da Conta de Serviço do Cloud Run
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
echo "   Conta de serviço do Cloud Run identificada: $RUN_SA"

# Função auxiliar para criar segredo e adicionar versão inicial caso não exista
create_and_version_secret() {
  local SECRET_NAME="$1"
  local SECRET_VALUE="$2"
  local DESCRIPTION="$3"

  echo -n "   - Configurando '$SECRET_NAME' ($DESCRIPTION)... "

  # Cria o recurso do segredo se ainda não existir
  if ! gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud secrets create "$SECRET_NAME" \
      --replication-policy="automatic" \
      --project="$PROJECT_ID" >/dev/null
    echo -n "[Criado] "
  else
    echo -n "[Existente] "
  fi

  # Verifica se já possui ao menos uma versão ativa
  local HAS_VERSION
  HAS_VERSION=$(gcloud secrets versions list "$SECRET_NAME" --project="$PROJECT_ID" --filter="state:ENABLED" --format="value(name)" 2>/dev/null | head -n 1)

  if [ -z "$HAS_VERSION" ]; then
    if [ -n "$SECRET_VALUE" ]; then
      printf "%s" "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" --data-file=- --project="$PROJECT_ID" >/dev/null
      echo "-> Versão 1 adicionada com sucesso!"
    else
      echo "-> AVISO: Nenhuma versão ativa. Defina o valor com: echo -n 'VALOR' | gcloud secrets versions add $SECRET_NAME --data-file=- --project=$PROJECT_ID"
    fi
  else
    echo "-> Versão ativa ($HAS_VERSION) já presente."
  fi
}

echo ""
echo "2. Provisionando Segredos Críticos..."

# Gerar SESSION_SECRET criptográfico de 64 caracteres caso não informado via ambiente
SESSION_SECRET_VALUE="${SESSION_SECRET:-$(openssl rand -hex 32 2>/dev/null || date +%s | sha256sum | awk '{print $1}')}"
create_and_version_secret "aura-session-secret" "$SESSION_SECRET_VALUE" "Chave HMAC de Sessões de Usuários"

# Segredos com valor opcional via env vars
create_and_version_secret "aura-database-url" "${DATABASE_URL:-}" "String de Conexão PostgreSQL / Cloud SQL"
create_and_version_secret "aura-sql-password" "${SQL_PASSWORD:-}" "Senha Mestre do Banco de Dados"
create_and_version_secret "aura-gemini-api-key" "${GEMINI_API_KEY:-}" "Chave da API Google Gemini AI"
create_and_version_secret "aura-asaas-api-key" "${ASAAS_API_KEY:-}" "Chave da API Asaas v3 (Cobranças Reais)"
create_and_version_secret "aura-asaas-webhook-access-token" "${ASAAS_WEBHOOK_ACCESS_TOKEN:-}" "Token de Acesso Webhook Asaas"
create_and_version_secret "aura-billing-webhook-secret" "${BILLING_WEBHOOK_SECRET:-$(openssl rand -hex 16 2>/dev/null || echo '')}" "Secret HMAC de Webhooks de Billing"

echo ""
echo "3. Configurando Permissões IAM para o Cloud Run..."
# Concede permissão de Leitura de Segredos (Secret Accessor) à Service Account do Cloud Run
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$RUN_SA" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None >/dev/null

echo "   ✅ Permissão 'roles/secretmanager.secretAccessor' concedida para: $RUN_SA"

echo ""
echo "4. Injetando segredos no serviço Cloud Run ($SERVICE_NAME)..."
# Atualiza o serviço no Cloud Run conectando os segredos como variáveis de ambiente
if gcloud run services describe "$SERVICE_NAME" --region="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud run services update "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --set-secrets="SESSION_SECRET=aura-session-secret:latest"
  echo "   ✅ Cloud Run atualizado com SESSION_SECRET injetada!"
else
  echo "   ℹ Serviço Cloud Run '$SERVICE_NAME' não encontrado na região '$REGION'."
  echo "   Comando para próximo deploy com injeção automática de segredos:"
  echo "   gcloud run deploy $SERVICE_NAME \\"
  echo "     --project=$PROJECT_ID \\"
  echo "     --region=$REGION \\"
  echo "     --set-secrets=SESSION_SECRET=aura-session-secret:latest,DATABASE_URL=aura-database-url:latest"
fi

echo ""
echo "================================================================================"
echo " ✅ BOOTSTRAP DO SECRET MANAGER CONCLUÍDO COM SUCESSO!"
echo "================================================================================"