import json
import requests


class LangfuseMetricsClient:
    """
    Langfuse API client that routes all calls through the GenPlat Langfuse Proxy.

    Authentication is handled via the GenPlat proxy — no Langfuse API keys needed.
    Each request must include:
      - x-requester-token: the user's requester token
      - x-ifood-langfuse-project: the Langfuse project name
    """

    def __init__(self, proxy_url, requester_token, project):
        self.proxy_url = proxy_url
        self.requester_token = requester_token
        self.project = project

    def _get_headers(self):
        return {
            "x-requester-token": self.requester_token,
            "x-ifood-langfuse-project": self.project,
            "Content-Type": "application/json",
        }

    def get_metrics(self, query):
        """
        Retrieve metrics from Langfuse API v2 via the GenPlat proxy.

        Args:
            query (dict): Query parameters for the metrics API v2

        Returns:
            dict: JSON response from the API
        """
        url = f"{self.proxy_url}/api/public/v2/metrics"
        headers = self._get_headers()
        params = {"query": json.dumps(query)}
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()
