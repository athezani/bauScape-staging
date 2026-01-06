#!/bin/bash

set -e

VERCEL_TOKEN="${VERCEL_TOKEN:-}"

if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ VERCEL_TOKEN non trovato nelle variabili d'ambiente"
  echo "Ottieni il token da: https://vercel.com/account/tokens"
  echo "Poi esegui: export VERCEL_TOKEN=your_token"
  exit 1
fi

VERCEL_API="https://api.vercel.com"

echo "🔍 Ottenendo informazioni sui progetti..."

# Funzione per ottenere l'ID del progetto dal nome
get_project_id() {
  local project_name=$1
  curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
    "$VERCEL_API/v9/projects?limit=100" | \
    jq -r ".projects[] | select(.name == \"$project_name\") | .id"
}

# Funzione per promuovere un deploy a produzione
promote_deployment() {
  local project_id=$1
  local deployment_id=$2
  local project_name=$3
  
  echo "🚀 Promuovendo deploy $deployment_id a produzione per $project_name..."
  
  response=$(curl -s -w "\n%{http_code}" -X PATCH \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    "$VERCEL_API/v13/deployments/$deployment_id" \
    -d "{\"target\":\"production\"}")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo "✅ Deploy $deployment_id promosso a produzione"
  else
    echo "❌ Errore nel promuovere deploy: $http_code"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    return 1
  fi
}

# Funzione per ottenere tutti i deploy di un progetto
get_deployments() {
  local project_id=$1
  local limit=${2:-100}
  
  curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
    "$VERCEL_API/v6/deployments?projectId=$project_id&limit=$limit" | \
    jq -r '.deployments[] | "\(.uid)|\(.target)|\(.state)|\(.created)"'
}

# Funzione per eliminare un deploy
delete_deployment() {
  local deployment_id=$1
  
  echo "🗑️  Eliminando deploy $deployment_id..."
  
  response=$(curl -s -w "\n%{http_code}" -X DELETE \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    "$VERCEL_API/v13/deployments/$deployment_id")
  
  http_code=$(echo "$response" | tail -n1)
  
  if [ "$http_code" = "200" ] || [ "$http_code" = "204" ]; then
    echo "✅ Deploy $deployment_id eliminato"
  else
    echo "⚠️  Errore nell'eliminare deploy $deployment_id: $http_code"
    return 1
  fi
}

# Configurazione
BAUSCAPE_PROJECT="bauscape"
BAUSCAPE_DEPLOY="FaoyAvE2Y"

BAU_SCAPE_PROJECT="bau-scape"
BAU_SCAPE_DEPLOY="HLstrCRvS"

echo ""
echo "📦 Progetto 1: $BAUSCAPE_PROJECT"
echo "   Deploy da promuovere: $BAUSCAPE_DEPLOY"
BAUSCAPE_PROJECT_ID=$(get_project_id "$BAUSCAPE_PROJECT")
if [ -z "$BAUSCAPE_PROJECT_ID" ]; then
  echo "❌ Progetto '$BAUSCAPE_PROJECT' non trovato"
  exit 1
fi
echo "   Project ID: $BAUSCAPE_PROJECT_ID"

echo ""
echo "📦 Progetto 2: $BAU_SCAPE_PROJECT"
echo "   Deploy da promuovere: $BAU_SCAPE_DEPLOY"
BAU_SCAPE_PROJECT_ID=$(get_project_id "$BAU_SCAPE_PROJECT")
if [ -z "$BAU_SCAPE_PROJECT_ID" ]; then
  echo "❌ Progetto '$BAU_SCAPE_PROJECT' non trovato"
  exit 1
fi
echo "   Project ID: $BAU_SCAPE_PROJECT_ID"

echo ""
read -p "Continuare con la promozione e l'eliminazione dei preview? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Operazione annullata"
  exit 1
fi

echo ""
echo "🚀 Promuovendo deploy a produzione..."

# Promuovi bauscape
promote_deployment "$BAUSCAPE_PROJECT_ID" "$BAUSCAPE_DEPLOY" "$BAUSCAPE_PROJECT"

# Promuovi bau-scape
promote_deployment "$BAU_SCAPE_PROJECT_ID" "$BAU_SCAPE_DEPLOY" "$BAU_SCAPE_PROJECT"

echo ""
echo "🔍 Ottenendo lista deploy preview da eliminare..."

# Ottieni tutti i deploy preview per bauscape
echo ""
echo "📋 Deploy preview per $BAUSCAPE_PROJECT:"
preview_deploys_bauscape=$(get_deployments "$BAUSCAPE_PROJECT_ID" | grep -v "^$BAUSCAPE_DEPLOY|" | grep "|preview|" | cut -d'|' -f1)
if [ -z "$preview_deploys_bauscape" ]; then
  echo "   Nessun deploy preview da eliminare"
else
  echo "$preview_deploys_bauscape" | while read deploy_id; do
    if [ "$deploy_id" != "$BAUSCAPE_DEPLOY" ]; then
      delete_deployment "$deploy_id"
    fi
  done
fi

# Ottieni tutti i deploy preview per bau-scape
echo ""
echo "📋 Deploy preview per $BAU_SCAPE_PROJECT:"
preview_deploys_bau_scape=$(get_deployments "$BAU_SCAPE_PROJECT_ID" | grep -v "^$BAU_SCAPE_DEPLOY|" | grep "|preview|" | cut -d'|' -f1)
if [ -z "$preview_deploys_bau_scape" ]; then
  echo "   Nessun deploy preview da eliminare"
else
  echo "$preview_deploys_bau_scape" | while read deploy_id; do
    if [ "$deploy_id" != "$BAU_SCAPE_DEPLOY" ]; then
      delete_deployment "$deploy_id"
    fi
  done
fi

echo ""
echo "✅ Operazione completata!"
echo ""
echo "📊 Riepilogo:"
echo "   • $BAUSCAPE_PROJECT: Deploy $BAUSCAPE_DEPLOY promosso a produzione"
echo "   • $BAU_SCAPE_PROJECT: Deploy $BAU_SCAPE_DEPLOY promosso a produzione"
echo "   • Deploy preview eliminati"

