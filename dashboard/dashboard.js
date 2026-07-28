const periodSelect = document.getElementById('period-select');
const refreshBtn = document.getElementById('refresh-btn');
const errorContainer = document.getElementById('error-container');

function calculatePeriod(days) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - days);
  return { from, to };
}

function getPeriodDays(periodValue) {
  const periods = {
    '1d': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
  };
  return periods[periodValue] || 7;
}

function formatDate(date) {
  return date.toISOString().slice(0, 16);
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined) return '-';
  return parseFloat(value).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

async function fetchMetric(project, metric, aggregation, fromDate, toDate) {
  const query = {
    view: 'observations',
    dimensions: [],
    metrics: [{ measure: metric, aggregation }],
    fromTimestamp: fromDate.toISOString(),
    toTimestamp: toDate.toISOString(),
  };

  try {
    const response = await fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, project }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${metric} for ${project}:`, error);
    return null;
  }
}

async function loadDashboard() {
  const periodDays = getPeriodDays(periodSelect.value);
  const { from, to } = calculatePeriod(periodDays);

  refreshBtn.disabled = true;
  refreshBtn.textContent = 'Carregando...';
  errorContainer.innerHTML = '';

  try {
    const projects = await fetchProjects();
    if (!projects || projects.length === 0) {
      showError('Nenhum projeto disponível');
      return;
    }

    const metrics = ['totalCost', 'latency', 'totalTokens'];
    const allProjectsData = {};

    for (const project of projects) {
      if (project === 'all') continue;

      allProjectsData[project] = {
        project,
        totalCost: { sum: 0, avg: 0 },
        latency: { sum: 0, avg: 0 },
        totalTokens: { sum: 0, avg: 0 },
      };

      for (const metric of metrics) {
        const sumResult = await fetchMetric(project, metric, 'sum', from, to);
        const avgResult = await fetchMetric(project, metric, 'avg', from, to);

        const dataKey = `sum_${metric}`;

        if (sumResult?.data?.[0]) {
          allProjectsData[project][metric].sum = parseFloat(sumResult.data[0][dataKey]) || 0;
        }

        if (avgResult?.data?.[0]) {
          allProjectsData[project][metric].avg = parseFloat(avgResult.data[0][dataKey]) || 0;
        }
      }
    }

    renderAggregations(allProjectsData);
    renderTable(allProjectsData);
  } catch (error) {
    showError(`Erro ao carregar dashboard: ${error.message}`);
    console.error(error);
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = 'Atualizar';
  }
}

async function fetchProjects() {
  try {
    const response = await fetch('/api/info');
    if (!response.ok) throw new Error('Erro ao buscar projetos');
    const data = await response.json();
    return data.projects || [];
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

function calculateAggregates(allProjectsData) {
  let totalCostSum = 0,
    totalCostAvg = 0,
    latencySum = 0,
    latencyAvg = 0,
    tokensSum = 0,
    tokensAvg = 0;
  let count = 0;

  for (const project in allProjectsData) {
    const data = allProjectsData[project];
    totalCostSum += data.totalCost.sum || 0;
    totalCostAvg += data.totalCost.avg || 0;
    latencySum += data.latency.sum || 0;
    latencyAvg += data.latency.avg || 0;
    tokensSum += data.totalTokens.sum || 0;
    tokensAvg += data.totalTokens.avg || 0;
    count++;
  }

  return {
    totalCostSum,
    totalCostAvg: count > 0 ? totalCostAvg / count : 0,
    latencySum,
    latencyAvg: count > 0 ? latencyAvg / count : 0,
    tokensSum,
    tokensAvg: count > 0 ? tokensAvg / count : 0,
  };
}

function renderAggregations(allProjectsData) {
  const agg = calculateAggregates(allProjectsData);

  document.getElementById('totalcost-sum').textContent = formatCurrency(agg.totalCostSum);
  document.getElementById('totalcost-avg').textContent = formatCurrency(agg.totalCostAvg);
  document.getElementById('latency-sum').textContent = formatNumber(agg.latencySum, 0);
  document.getElementById('latency-avg').textContent = formatNumber(agg.latencyAvg, 2);
  document.getElementById('tokens-sum').textContent = formatNumber(agg.tokensSum, 0);
  document.getElementById('tokens-avg').textContent = formatNumber(agg.tokensAvg, 0);
}

function renderTable(allProjectsData) {
  const tableContainer = document.getElementById('table-container');

  if (!allProjectsData || Object.keys(allProjectsData).length === 0) {
    tableContainer.innerHTML = '<div class="error">Nenhum dado disponível</div>';
    return;
  }

  const rows = Object.values(allProjectsData).map(
    (data) => `
      <tr>
        <td><strong>${data.project}</strong></td>
        <td>${formatCurrency(data.totalCost.sum)}</td>
        <td>${formatCurrency(data.totalCost.avg)}</td>
        <td>${formatNumber(data.latency.sum, 0)}</td>
        <td>${formatNumber(data.latency.avg, 2)}</td>
        <td>${formatNumber(data.totalTokens.sum, 0)}</td>
        <td>${formatNumber(data.totalTokens.avg, 0)}</td>
      </tr>
    `
  );

  tableContainer.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Projeto</th>
          <th>Custo (Soma)</th>
          <th>Custo (Média)</th>
          <th>Latência (Soma ms)</th>
          <th>Latência (Média ms)</th>
          <th>Tokens (Soma)</th>
          <th>Tokens (Média)</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

function showError(message) {
  errorContainer.innerHTML = `<div class="error">${message}</div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  periodSelect.addEventListener('change', loadDashboard);
  refreshBtn.addEventListener('click', loadDashboard);
});
