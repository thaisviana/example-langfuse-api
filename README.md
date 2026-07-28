# example-langfuse-api

Um exemplo completo de integração com a API pública do Langfuse usando o **GenPlat Langfuse Proxy**, incluindo um cliente reutilizável e um dashboard interativo para visualizar métricas de múltiplos projetos.

## 📋 Overview

Este repositório demonstra como:

- Consumir a **API v2 de Métricas do Langfuse** através do proxy da GenPlat
- Criar um **cliente Python reutilizável** que autentica via proxy (requester token)
- Construir um **dashboard web** com suporte a múltiplos projetos
- Gerenciar acesso a projetos via **x-requester-token** e **x-ifood-langfuse-project**
- Agregar dados de **múltiplos projetos simultaneamente**

## 📁 Estrutura do Projeto

```
.
├── client/
│   ├── __init__.py
│   └── langfuse_metrics_client.py    # Cliente Python do Langfuse via proxy
├── dashboard/
│   ├── index.html                     # Interface web
│   ├── app.js                         # Lógica do dashboard
│   └── styles.css                     # Estilos
├── tests/
│   ├── __init__.py
│   └── test_langfuse_metrics_client.py # Testes unitários
├── server.py                          # Servidor Flask (proxy seguro)
├── .env                               # Variáveis de ambiente
├── requirements.txt                   # Dependências Python
└── README.md                          # Este arquivo
```

## 🚀 Quick Start

### Pré-requisitos

- **VPN da iFood** conectada
- **Requester Token** válido: gere com `tompero auth requester-token get` (salvo em `~/.config/tompero/requester_token`)
- Acesso aos projetos Langfuse via proxy (solicite via [#genplat-support](https://ifood.slack.com/archives/C0593E3TSUE))

### Instalação

1. **Clone o repositório e crie um ambiente virtual:**

```bash
python3 -m venv venv
source venv/bin/activate
```

2. **Instale as dependências:**

```bash
pip install -r requirements.txt
```

3. **Configure as variáveis de ambiente no `.env`:**

```env
# URL do proxy da GenPlat (produção)
LANGFUSE_PROXY_URL=https://genplat-langfuse.ifoodcorp.com.br/v1

# Lista de projetos Langfuse que você tem acesso
LANGFUSE_PROJECTS=agent-cross-memory-service,ops-customer-support-agent

# Requester Token (opcional — se não definido, lê de ~/.config/tompero/requester_token)
# REQUESTER_TOKEN=eyJhbG...
```

### Executar o Dashboard

```bash
python server.py
```

Abra [http://localhost:5000](http://localhost:5000) no seu navegador.

## ⚙️ Configuração

### Projetos

O dropdown de projetos é populado a partir da variável `LANGFUSE_PROJECTS` no `.env`. Separe múltiplos projetos por vírgula:

```env
LANGFUSE_PROJECTS=projeto1,projeto2,projeto3
```

A opção "Todos os projetos" (all) agrega métricas de todos os projetos configurados.

### Requester Token

O servidor carrega o token na seguinte ordem:
1. Variável `REQUESTER_TOKEN` no `.env`
2. Arquivo `~/.config/tompero/requester_token`

### Proxy URL

| Ambiente | URL |
|----------|-----|
| **Produção** | `https://genplat-langfuse.ifoodcorp.com.br/v1` |
| **Sandbox** | `https://genplat-langfuse.ifood-sandbox.com.br/v1` |

### Como funciona a autenticação

O proxy da GenPlat gerencia a autenticação. O cliente envia:
- `x-requester-token`: seu token de acesso
- `x-ifood-langfuse-project`: nome do projeto Langfuse

**Não é necessário configurar `public_key` ou `secret_key` do Langfuse** — o proxy cuida disso.

## 💻 Uso

### Cliente Python (Programático)

```python
from client.langfuse_metrics_client import LangfuseMetricsClient

# Inicialize o cliente
client = LangfuseMetricsClient(
    proxy_url="https://genplat-langfuse.ifoodcorp.com.br/v1",
    requester_token="<seu-token>",
    project="ops-customer-support-agent",
)

# Construa uma query
query = {
    "view": "observations",
    "metrics": [{"measure": "count", "aggregation": "sum"}],
    "fromTimestamp": "2026-07-01T00:00:00Z",
    "toTimestamp": "2026-07-31T23:59:59Z",
}

# Recupere as métricas
result = client.get_metrics(query)
print(result)
```

## 📚 API Reference

### POST `/api/metrics`

**Request body:**
```json
{
  "query": {
    "view": "observations",
    "metrics": [{"measure": "count", "aggregation": "sum"}],
    "fromTimestamp": "2026-01-01T00:00:00Z",
    "toTimestamp": "2026-12-31T23:59:59Z"
  },
  "project": "ops-customer-support-agent"
}
```

### GET `/api/info`

**Response:**
```json
{
  "projects": ["agent-cross-memory-service", "ops-customer-support-agent", "all"],
  "default_project": "agent-cross-memory-service",
  "proxy_url": "https://genplat-langfuse.ifoodcorp.com.br/v1"
}
```

## 🔒 Segurança

- O `requester_token` nunca é exposto no frontend — o `server.py` faz o proxy
- O arquivo `.env` fica no servidor, inacessível aos clientes
- A autenticação é gerenciada pelo proxy da GenPlat, sem chaves do Langfuse no código

## 📖 Recursos

- [Documentação GenPlat Langfuse Proxy](https://docs-data.ifoodcorp.com.br/ml-platform/gen_plat/langfuse_proxy)
- [Documentação API Langfuse](https://langfuse.com/docs)
- [API v2 Metrics Endpoint](https://langfuse.com/docs/analytics/api)

---

**Desenvolvido com ❤️ para simplificar a integração com Langfuse via GenPlat Proxy**
