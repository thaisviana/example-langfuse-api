const form = document.getElementById('metrics-form');
const result = document.getElementById('result');
const debug = document.getElementById('debug');

function formatDate(date) {
  return date.toISOString().slice(0, 16);
}

function setDefaultDates() {
  const today = new Date();
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(today.getDate() - 15);

  document.getElementById('fromTimestamp').value = formatDate(fifteenDaysAgo);
  document.getElementById('toTimestamp').value = formatDate(today);
}

async function loadProjectInfo() {
  try {
    const response = await fetch('/api/info');
    if (response.ok) {
      const data = await response.json();
      
      const projectSelect = document.getElementById('project-select');
      projectSelect.innerHTML = '';
      
      data.projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project;
        option.textContent = project === 'all' ? 'Todos os projetos' : project;
        if (project === data.default_project) {
          option.selected = true;
        }
        projectSelect.appendChild(option);
      });
    } else {
      document.getElementById('project-select').innerHTML = '<option>Erro</option>';
    }
  } catch (error) {
    document.getElementById('project-select').innerHTML = '<option>Erro</option>';
  }
}

function updateMetricOptions() {
  const view = document.getElementById('view').value;
  const metricSelect = document.getElementById('metric');

  // Clear existing options
  metricSelect.innerHTML = '';

  let options = [];
  if (view === 'observations') {
    options = [
      { value: 'count', text: 'count' },
      { value: 'latency', text: 'latency' },
      { value: 'totalCost', text: 'totalCost' },
      { value: 'totalTokens', text: 'totalTokens' }
    ];
  } else if (view === 'scores-numeric') {
    options = [
      { value: 'count', text: 'count' },
      { value: 'value', text: 'value' }
    ];
  } else if (view === 'scores-categorical') {
    options = [
      { value: 'count', text: 'count' },
      { value: 'value', text: 'value' }
    ];
  }

  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.text;
    metricSelect.appendChild(opt);
  });
}

const buildQuery = () => {
  const view = document.getElementById('view').value;
  const measure = document.getElementById('metric').value;
  const aggregation = document.getElementById('aggregation').value;
  const from = document.getElementById('fromTimestamp').value;
  const to = document.getElementById('toTimestamp').value;

  return {
    view,
    dimensions: [],
    metrics: [{ measure, aggregation }],
    fromTimestamp: new Date(from).toISOString(),
    toTimestamp: new Date(to).toISOString(),
  };
};

const renderResult = (data) => {
  if (!data) {
    result.textContent = 'Resposta vazia';
    return;
  }

  try {
    const json = JSON.stringify(data, null, 2);
    result.textContent = json;
  } catch (error) {
    result.textContent = String(data);
  }
};

const renderDebug = (message) => {
  debug.textContent = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
};

document.addEventListener('DOMContentLoaded', () => {
  setDefaultDates();
  updateMetricOptions();
  document.getElementById('view').addEventListener('change', updateMetricOptions);
  loadProjectInfo();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  result.textContent = 'Carregando...';
  debug.textContent = '';

  const query = buildQuery();
  const project = document.getElementById('project-select').value;

  try {
    const response = await fetch('/api/metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, project }),
    });

    const body = await response.json();

    if (!response.ok) {
      renderResult('Erro ao buscar métricas');
      renderDebug(body);
      return;
    }

    renderResult(body);
    renderDebug({ status: response.status, query, project: project === 'all' ? 'All Projects' : project });
  } catch (error) {
    renderResult('Falha na requisição');
    renderDebug(error.message || error);
  }
});
