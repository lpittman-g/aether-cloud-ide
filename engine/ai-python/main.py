"""
Aether AI orchestration service (Python).
Mirrors Replit-style agent / LLM workflow endpoints.
"""

from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="Aether AI", version="0.1.0")


class AgentRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    context: dict[str, Any] | None = None
    mode: str = "plan"


class AgentResponse(BaseModel):
    ok: bool
    engine: str = "python-ai"
    mode: str
    message: str
    steps: list[str]
    model: str | None = None


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "aether-ai",
        "language": "python",
        "openai": bool(os.getenv("OPENAI_API_KEY")),
    }


@app.post("/v1/agent", response_model=AgentResponse)
def agent(req: AgentRequest) -> AgentResponse:
    """Lightweight agent planner. Uses OpenAI when OPENAI_API_KEY is set."""
    steps = [
        "Parse user goal",
        "Inspect Repl workspace context",
        "Propose file edits / run commands",
        "Execute via Go orchestrator + Rust sandbox",
    ]
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        try:
            from openai import OpenAI

            client = OpenAI(api_key=api_key)
            model = os.getenv("AETHER_AI_MODEL", "gpt-4o-mini")
            completion = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are Aether Agent inside a Replit-style cloud IDE. "
                            "Return a short actionable plan for the user's coding task."
                        ),
                    },
                    {"role": "user", "content": req.prompt},
                ],
                max_tokens=400,
            )
            text = completion.choices[0].message.content or ""
            return AgentResponse(
                ok=True,
                mode=req.mode,
                message=text,
                steps=steps,
                model=model,
            )
        except Exception as exc:  # noqa: BLE001
            return AgentResponse(
                ok=False,
                mode=req.mode,
                message=f"LLM call failed: {exc}",
                steps=steps,
                model=None,
            )

    preview = req.prompt.strip().splitlines()[0][:160]
    return AgentResponse(
        ok=True,
        mode=req.mode,
        message=(
            f"Planned (local Python orchestrator): {preview}\n\n"
            "Set OPENAI_API_KEY to enable live LLM orchestration."
        ),
        steps=steps,
        model="local-planner",
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "5001"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
