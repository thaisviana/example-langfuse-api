import json
from pathlib import Path
import pytest
from unittest.mock import Mock

from client.langfuse_metrics_client import LangfuseMetricsClient


PROXY_URL = 'https://genplat-langfuse.ifoodcorp.com.br/v1'


class TestLangfuseMetricsClient:
    @pytest.fixture
    def client(self):
        return LangfuseMetricsClient(
            proxy_url=PROXY_URL,
            requester_token='test-token',
            project='test-project',
        )

    def test_init(self, client):
        assert client.proxy_url == PROXY_URL
        assert client.requester_token == 'test-token'
        assert client.project == 'test-project'

    def test_get_headers(self, client):
        headers = client._get_headers()

        assert headers['x-requester-token'] == 'test-token'
        assert headers['x-ifood-langfuse-project'] == 'test-project'
        assert headers['Content-Type'] == 'application/json'

    def test_get_metrics_success(self, client, monkeypatch):
        mock_response = Mock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {'data': [{'sum_count': '100'}]}

        def fake_get(url, headers=None, params=None):
            assert url == f"{PROXY_URL}/api/public/v2/metrics"
            assert headers is not None
            assert headers['x-requester-token'] == 'test-token'
            assert headers['x-ifood-langfuse-project'] == 'test-project'
            assert params == {
                'query': json.dumps({
                    'view': 'observations',
                    'metrics': [{'measure': 'count', 'aggregation': 'sum'}],
                    'fromTimestamp': '2024-01-01T00:00:00Z',
                    'toTimestamp': '2024-12-31T23:59:59Z'
                })
            }
            return mock_response

        monkeypatch.setattr('requests.get', fake_get)

        query = {
            'view': 'observations',
            'metrics': [{'measure': 'count', 'aggregation': 'sum'}],
            'fromTimestamp': '2024-01-01T00:00:00Z',
            'toTimestamp': '2024-12-31T23:59:59Z'
        }

        result = client.get_metrics(query)

        assert result == {'data': [{'sum_count': '100'}]}
        mock_response.raise_for_status.assert_called_once()
        mock_response.json.assert_called_once()

    def test_get_metrics_request_failure(self, client, monkeypatch):
        mock_response = Mock()
        mock_response.raise_for_status.side_effect = Exception('Request failed')

        def fake_get(url, headers=None, params=None):
            assert url == f"{PROXY_URL}/api/public/v2/metrics"
            assert headers is not None
            assert headers['x-requester-token'] == 'test-token'
            assert headers['x-ifood-langfuse-project'] == 'test-project'
            assert params == {
                'query': json.dumps({
                    'view': 'observations',
                    'metrics': [{'measure': 'count'}]
                })
            }
            return mock_response

        monkeypatch.setattr('requests.get', fake_get)

        query = {'view': 'observations', 'metrics': [{'measure': 'count'}]}

        with pytest.raises(Exception, match='Request failed'):
            client.get_metrics(query)
