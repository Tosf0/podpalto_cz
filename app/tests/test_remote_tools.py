import json

import httpx
import pytest
from podpalto_app.remote_tools import ToolsClient, ToolsServiceError, load_remote_tools


def test_tools_are_built_from_the_service_catalog():
    tools = load_remote_tools(["eshop_catalog", "market_statistics"])
    assert [tool.name for tool in tools] == ["eshop_catalog", "market_statistics"]
    schema = tools[0].args_schema.model_json_schema()
    assert set(schema["properties"]) == {"fuel_type", "seller", "in_stock_only"}
    assert schema["required"] == ["fuel_type"]


def test_remote_tool_calls_the_service():
    (tool,) = load_remote_tools(["price_comparison"])
    result = json.loads(tool.run(fuel_type="briquettes", product_query="RUF"))
    assert result["mock"] is True
    assert result["offers_count"] == 3
    assert result["offers"][0]["seller"] == "SampleFuel"


def test_remote_tool_reports_bad_arguments_to_the_agent():
    (tool,) = load_remote_tools(["eshop_catalog"])
    assert tool._run(fuel_type="pellets").startswith("ERROR: invalid arguments")


def test_unknown_tool_name_is_rejected():
    with pytest.raises(ToolsServiceError, match="unknown remote tools"):
        load_remote_tools(["does_not_exist"])


def test_unreachable_service():
    def refuse(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    client = ToolsClient(
        http_client=httpx.Client(
            base_url="http://tools:8001", transport=httpx.MockTransport(refuse)
        )
    )
    assert client.is_healthy() is False
    with pytest.raises(ToolsServiceError, match="unreachable"):
        client.catalog()
