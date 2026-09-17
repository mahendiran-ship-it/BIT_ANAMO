import asyncio
import json
import logging
from typing import Dict, Any, Optional

import httpx
from app.config import settings

logger = logging.getLogger(__name__)

class AIService:
    """Generate grounded summaries from verified backend analysis using Groq."""

    def __init__(self):
        self.provider = settings.AI_PROVIDER.lower().strip()
        self.groq_key = settings.GROQ_API_KEY
        self.model = settings.GROQ_MODEL
        self.api_url = f"{settings.GROQ_API_BASE.rstrip('/')}/chat/completions"

    def is_configured(self) -> bool:
        return self.provider == "groq" and bool(self.groq_key)

    @staticmethod
    def _block_payload(block_summary: Dict[str, Any]) -> Dict[str, Any]:
        fields = (
            "height", "hash", "timestamp", "tx_count", "analyzed_tx_count",
            "coverage_pct", "total_volume_btc", "total_fees_btc", "largest_tx_btc",
            "smallest_tx_btc", "avg_tx_btc", "input_count", "output_count",
            "fetch_time_sec", "analysis_time_sec", "total_time_sec", "status"
        )
        return {field: block_summary.get(field) for field in fields}

    async def _complete(self, system_prompt: str, user_payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_configured():
            return {
                "status": "unavailable",
                "provider": "groq",
                "message": "Groq AI is not configured. Set GROQ_API_KEY in the backend environment.",
                "structured_payload": user_payload,
            }

        body = {
            "model": self.model,
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_payload, separators=(",", ":"))},
            ],
        }
        headers = {"Authorization": f"Bearer {self.groq_key}", "Content-Type": "application/json"}
        delay = 0.5
        for attempt in range(settings.AI_MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as client:
                    response = await client.post(self.api_url, headers=headers, json=body)
                response.raise_for_status()
                raw = response.json()
                content = raw.get("choices", [{}])[0].get("message", {}).get("content")
                if not isinstance(content, str) or not content.strip():
                    raise ValueError("Groq response did not contain message content")
                parsed = json.loads(content)
                if not isinstance(parsed, dict) or not isinstance(parsed.get("summary"), str):
                    raise ValueError("Groq response did not contain a valid summary object")
                return {
                    "status": "ok",
                    "provider": "groq",
                    "model": self.model,
                    "summary": parsed["summary"],
                    "structured_payload": user_payload,
                }
            except (httpx.HTTPError, ValueError, KeyError, IndexError, json.JSONDecodeError) as exc:
                if attempt >= settings.AI_MAX_RETRIES:
                    logger.warning("Groq summary failed after retries: %s", type(exc).__name__)
                    return {
                        "status": "unavailable",
                        "provider": "groq",
                        "message": "Groq AI could not generate a summary right now.",
                        "structured_payload": user_payload,
                    }
                await asyncio.sleep(delay)
                delay *= 2

        raise RuntimeError("Unreachable AI retry state")

    async def summarize_block(self, block_summary: Dict[str, Any]) -> Dict[str, Any]:
        """
        Summarizes block intelligence.
        Prepares structured payload for LLM analysis.
        """
        payload = {"verified_block_analysis": self._block_payload(block_summary)}
        system_prompt = (
            "You summarize verified Bitcoin block analysis. Use only values in the JSON input. "
            "Never invent or infer transaction counts, amounts, fees, addresses, risks, or patterns. "
            "Return JSON exactly as {\"summary\": \"...\"}. Mention analyzed scope and coverage. "
            "If the scope is partial, clearly say the observations apply only to analyzed transactions."
        )
        return await self._complete(system_prompt, payload)

    async def summarize_address(self, address_summary: Dict[str, Any]) -> Dict[str, Any]:
        """Summarizes address behavior based on structured historical activity."""
        payload = {
            "address": address_summary.get("address"),
            "transaction_count": address_summary.get("total_tx_count"),
            "total_incoming_btc": address_summary.get("total_in_btc"),
            "total_outgoing_btc": address_summary.get("total_out_btc"),
            "first_seen_height": address_summary.get("first_seen_height"),
            "last_seen_height": address_summary.get("last_seen_height")
        }

        return await self._complete(
            "Summarize only the verified address observations in the JSON. Never invent facts. Return JSON as {\"summary\": \"...\"}.",
            {"verified_address_observations": payload},
        )

    async def compare_activity(self, prev_period: Dict[str, Any], curr_period: Dict[str, Any]) -> Dict[str, Any]:
        """Compares two observation periods for an address or entity."""
        payload = {
            "previous_period": prev_period,
            "current_period": curr_period
        }
        return await self._complete(
            "Compare only the verified observation periods in the JSON. Never invent facts. Return JSON as {\"summary\": \"...\"}.",
            {"verified_activity_comparison": payload},
        )

    async def answer_block_question(self, context: Dict[str, Any], question: str) -> Dict[str, Any]:
        """Answers contextual questions about an analyzed block."""
        return await self._complete(
            "Answer only from the verified context. If the context does not support an answer, say so. Return JSON as {\"summary\": \"...\"}.",
            {"verified_context": context, "question": question},
        )

ai_service = AIService()
