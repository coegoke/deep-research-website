from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
import json
import asyncio
from pydantic import BaseModel
from dotenv import load_dotenv

from agent import DeepResearchAgent

load_dotenv()

app = FastAPI(title="Deep Research API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    agent = DeepResearchAgent()
    
    async def event_generator():
        try:
            async for event in agent.research(request.query):
                # Send events formatted for SSE
                yield {
                    "event": "message",
                    "data": json.dumps(event)
                }
            # Send done event
            yield {
                "event": "done",
                "data": json.dumps({"type": "done"})
            }
        except BaseException as e:
            import traceback
            err_msg = "".join(traceback.format_exception(e))
            print(f"Server Error: {err_msg}")
            yield {
                "event": "error",
                "data": json.dumps({"type": "error", "message": err_msg})
            }
            
    return EventSourceResponse(event_generator())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
