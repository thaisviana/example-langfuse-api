import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory

from client.langfuse_metrics_client import LangfuseMetricsClient

ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / '.env')

# --- Proxy configuration ---
PROXY_URL = os.getenv('LANGFUSE_PROXY_URL', 'https://genplat-langfuse.ifoodcorp.com.br/v1')

# Requester token: try env var first, then fall back to tompero's token file
REQUESTER_TOKEN = os.getenv('REQUESTER_TOKEN', '').strip()
if not REQUESTER_TOKEN:
    token_path = Path.home() / '.config' / 'tompero' / 'requester_token'
    if token_path.exists():
        REQUESTER_TOKEN = token_path.read_text().strip()

if not REQUESTER_TOKEN:
    raise RuntimeError(
        'Missing REQUESTER_TOKEN. Set it in .env or ensure '
        '~/.config/tompero/requester_token exists (run: tompero auth requester-token get).'
    )

# --- Projects ---
# List of Langfuse project names you have access to via the proxy.
# The proxy uses the x-ifood-langfuse-project header to route requests.
projects_str = os.getenv('LANGFUSE_PROJECTS', '')
projects = [p.strip() for p in projects_str.split(',') if p.strip()]

if not projects:
    raise RuntimeError(
        'Missing LANGFUSE_PROJECTS in .env. '
        'Set it to a comma-separated list of Langfuse project names, e.g.:\n'
        'LANGFUSE_PROJECTS=agent-cross-memory-service,ops-customer-support-agent'
    )

# --- Initialize clients ---
clients = {}
for project in projects:
    clients[project] = LangfuseMetricsClient(
        proxy_url=PROXY_URL,
        requester_token=REQUESTER_TOKEN,
        project=project,
    )

default_project = projects[0] if projects else None

app = Flask(__name__, static_folder='dashboard', static_url_path='')


@app.route('/api/metrics', methods=['POST'])
def metrics_proxy():
    payload = request.get_json(silent=True)
    if not payload or 'query' not in payload:
        return jsonify({'error': 'O corpo da requisição deve incluir o campo `query`.'}), 400

    project = payload.get('project', default_project)

    if project == 'all':
        combined_data = []
        errors = []
        for proj, client in clients.items():
            try:
                result = client.get_metrics(payload['query'])
                if 'data' in result and isinstance(result['data'], list):
                    for item in result['data']:
                        item['_project'] = proj
                    combined_data.extend(result['data'])
            except Exception as exc:
                errors.append(f'{proj}: {str(exc)}')
                combined_data.append({"_project": proj, "sum_count": "0"})

        combined_result = {'data': combined_data}
        if errors:
            combined_result['warnings'] = errors

        return jsonify(combined_result)

    if project not in clients:
        return jsonify({'error': f'Projeto {project} não configurado.'}), 400

    query = payload['query']
    try:
        result = clients[project].get_metrics(query)
        return jsonify(result)
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


@app.route('/api/info', methods=['GET'])
def info():
    available_projects = projects + ['all']
    return jsonify({
        'projects': available_projects,
        'default_project': default_project,
        'proxy_url': PROXY_URL,
    })


@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def serve_dashboard(path):
    dashboard_dir = ROOT_DIR / 'dashboard'
    if not (dashboard_dir / path).exists():
        return send_from_directory(str(dashboard_dir), 'index.html')
    return send_from_directory(str(dashboard_dir), path)


@app.route('/annotation')
def serve_annotation():
    return send_from_directory(str(ROOT_DIR / 'dashboard'), 'annotation.html')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
