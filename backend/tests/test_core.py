import asyncio
from unittest.mock import AsyncMock, Mock, patch

from app.analyzer.block_analyzer import BlockAnalyzer
from app.services.ai_service import AIService
from app.validation import is_valid_bitcoin_address


def test_address_validation_rejects_malformed_values():
    assert not is_valid_bitcoin_address("not-an-address")
    assert is_valid_bitcoin_address("bc1qjn7e2xk99m4g4d4j3hszxqfh4uk585jq5m6dt7")


def test_block_analyzer_calculates_verified_metrics():
    result = BlockAnalyzer.analyze_block(
        {"id": "block-1", "height": 10, "timestamp": 100, "tx_count": 3},
        [
            {"txid": "tx-1", "fee": 100, "vin": [{"prevout": {"scriptpubkey_address": "addr1", "value": 100000000}}], "vout": [{"scriptpubkey_address": "addr2", "value": 200000000}]},
            {"txid": "tx-2", "fee": 200, "vin": [], "vout": [{"scriptpubkey_address": "addr3", "value": 300000000}]},
        ],
        1.25,
    )
    summary = result["block_summary"]
    assert summary["tx_count"] == 3
    assert summary["analyzed_tx_count"] == 2
    assert summary["coverage_pct"] == 66.67
    assert summary["total_volume_btc"] == 5.0
    assert summary["total_fees_btc"] == 0.000003
    assert summary["largest_tx_btc"] == 3.0
    assert summary["avg_tx_btc"] == 2.5


def test_ai_without_key_returns_safe_fallback():
    service = AIService()
    service.groq_key = None
    result = asyncio.run(service.summarize_block({"height": 10, "tx_count": 2, "analyzed_tx_count": 2}))
    assert result["status"] == "unavailable"
    assert result["provider"] == "groq"
    assert "structured_payload" in result


def test_ai_parses_grounded_groq_json_response():
    service = AIService()
    service.groq_key = "test-key"
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = {"choices": [{"message": {"content": '{"summary":"Block 10 had partial analyzed coverage."}'}}]}

    client = AsyncMock()
    client.__aenter__.return_value.post.return_value = response
    with patch("app.services.ai_service.httpx.AsyncClient", return_value=client):
        result = asyncio.run(service.summarize_block({"height": 10, "tx_count": 3, "analyzed_tx_count": 2, "coverage_pct": 66.67}))

    assert result["status"] == "ok"
    assert result["provider"] == "groq"
    assert result["summary"] == "Block 10 had partial analyzed coverage."


def test_ai_malformed_groq_response_falls_back():
    service = AIService()
    service.groq_key = "test-key"
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = {"choices": [{"message": {"content": "not-json"}}]}

    client = AsyncMock()
    client.__aenter__.return_value.post.return_value = response
    with patch("app.services.ai_service.httpx.AsyncClient", return_value=client):
        result = asyncio.run(service.summarize_block({"height": 10}))

    assert result["status"] == "unavailable"
    assert "structured_payload" in result