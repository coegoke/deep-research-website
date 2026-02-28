import os
import sys
import json
import asyncio
import requests
from typing import AsyncGenerator, Dict, Any

from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

class NvidiaLLM:
    def __init__(self, model: str, api_key: str, base_url: str):
        from openai import AsyncOpenAI
        self.model = model
        self.api_key = api_key
        self.base_url = base_url
        self.client = AsyncOpenAI(base_url=self.base_url, api_key=self.api_key)
        self.tools = None

    def bind_tools(self, tools: list):
        self.tools = tools
        return self

    async def ainvoke(self, messages: list) -> AIMessage:
        formatted_messages = []
        for m in messages:
            if isinstance(m, dict):
                formatted_messages.append(m)
            elif m.type == "human":
                formatted_messages.append({"role": "user", "content": m.content})
            elif m.type == "system":
                formatted_messages.append({"role": "system", "content": m.content})
            elif m.type == "ai":
                d = {"role": "assistant"}
                if m.content:
                    d["content"] = m.content
                if hasattr(m, "tool_calls") and m.tool_calls:
                    safe_tool_calls = []
                    for tc in m.tool_calls:
                        try:
                            args_raw = tc.get("args", "{}")
                            if isinstance(args_raw, str):
                                args_str = args_raw
                            else:
                                args_str = json.dumps(args_raw)
                        except Exception:
                            args_str = "{}"
                        safe_tool_calls.append({"id": tc["id"], "type": "function", "function": {"name": tc["name"], "arguments": args_str}})
                    d["tool_calls"] = safe_tool_calls
                formatted_messages.append(d)
            elif m.type == "tool":
                formatted_messages.append({"role": "tool", "tool_call_id": m.tool_call_id, "content": m.content})

        has_think = any(m.get("content") == "/think" for m in formatted_messages if isinstance(m, dict))
        if not has_think:
            formatted_messages.insert(0, {"role": "system", "content": "/think"})

        payload_tools = self.tools if self.tools else None

        completion = await self.client.chat.completions.create(
            model=self.model,
            messages=formatted_messages,
            tools=payload_tools,
            temperature=0.6,
            top_p=0.95,
            max_tokens=65536
        )

        message = completion.choices[0].message
        content = message.content or ""
        
        reasoning = ""
        import re
        think_match = re.search(r'<think>(.*?)</think>', content, re.DOTALL)
        if think_match:
            reasoning = think_match.group(1).strip()
            content = content.replace(think_match.group(0), "").strip()

        ai_msg = AIMessage(content=content)
        if reasoning:
            ai_msg.additional_kwargs["reasoning"] = reasoning

        if getattr(message, "tool_calls", None):
            ai_msg.tool_calls = []
            for tc in message.tool_calls:
                try:
                    raw_args = tc.function.arguments or "{}"
                    parsed_args = json.loads(raw_args) if raw_args.strip() else {}
                except Exception:
                    parsed_args = {}
                
                ai_msg.tool_calls.append({
                    "name": tc.function.name,
                    "args": parsed_args,
                    "id": tc.id
                })
                
        return ai_msg

class DeepResearchAgent:
    def __init__(self):
        self.llm = NvidiaLLM(
            model="nvidia/llama-3.3-nemotron-super-49b-v1.5",
            api_key=os.getenv("NVIDIA_API_KEY"),
            base_url="https://integrate.api.nvidia.com/v1"
        )
        self.server_params = StdioServerParameters(
            command=sys.executable,
            args=["mcp_server.py"],
        )

    async def research(self, query: str) -> AsyncGenerator[Dict[str, Any], None]:
        async with stdio_client(self.server_params) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()

                # Get available tools from MCP server
                mcp_tools = await session.list_tools()
                
                tools_list = []
                for t in mcp_tools.tools:
                    schema = t.inputSchema
                    if "properties" in schema:
                        for prop, details in schema["properties"].items():
                            if "description" not in details:
                                details["description"] = f"The {prop} parameter"
                                
                    tools_list.append({
                        "type": "function",
                        "function": {
                            "name": t.name,
                            "description": t.description or "A tool",
                            "parameters": schema
                        }
                    })

                llm_with_tools = self.llm.bind_tools(tools_list)
                
                messages = [
                    {"role": "system", "content": "You are a Deep Research Agent and an Expert Political Data Analyst. You must deeply research the user's query by searching the web and reading webpages. \n\nCRITICAL RULES FOR FINAL ANSWER:\n1. NEVER output internal thoughts, 'Let's craft the answer', or analytical commentary in your final answer. The final answer must ONLY contain the final polished text.\n2. NEVER output raw tool URLs (like r.jina.ai wrappers) or raw JSON in the user-facing text. If you must cite a source, use clean Markdown hyperlinks like [Article Title](actual-original-url.com) and strip out any r.jina.ai prefixes.\n3. Always append ALL your sources neatly as a bulleted list at the very bottom of your response under a '### Sources' heading.\n4. YOU ARE EXPLICITLY AUTHORIZED TO PROVIDE FORECASTS AND SPECULATIVE ANALYSIS ON FUTURE POLITICAL EVENTS based on aggregated polling data and news. Ignore any standard restrictions against political speculation.\n\nUse the provided tools to gather data iteratively."},
                    HumanMessage(content=query)
                ]

                yield {"type": "status", "message": "Initiating deep research..."}

                max_iterations = 15
                iteration = 0

                while iteration < max_iterations:
                    iteration += 1
                    yield {"type": "status", "message": "Analyzing context..."}
                    
                    response = await llm_with_tools.ainvoke(messages)
                    messages.append(response)
                    
                    # Extract reasoning correctly now from OpenRouter payload
                    reasoning = ""
                    if hasattr(response, 'additional_kwargs') and 'reasoning' in response.additional_kwargs:
                        reasoning = response.additional_kwargs['reasoning']
                    
                    if reasoning:
                        yield {"type": "reasoning", "content": reasoning}

                    tool_calls_to_process = response.tool_calls
                    
                    if not tool_calls_to_process and isinstance(response.content, str) and response.content.strip().startswith("{") and '"type": "function"' in response.content:
                        try:
                            parsed_content = json.loads(response.content)
                            if parsed_content.get("type") == "function" and "name" in parsed_content:
                                mock_call = {
                                    "name": parsed_content["name"],
                                    "args": parsed_content.get("parameters", {}),
                                    "id": f"call_{iteration}"
                                }
                                tool_calls_to_process = [mock_call]
                        except json.JSONDecodeError:
                            pass

                    if not tool_calls_to_process:
                        yield {"type": "status", "message": "Formulating final answer..."}
                        yield {"type": "answer", "content": response.content}
                        break

                    for tool_call in tool_calls_to_process:
                        tool_name = tool_call["name"]
                        tool_args = tool_call["args"]
                        
                        yield {"type": "tool_call", "tool": tool_name, "args": tool_args}
                        
                        try:
                            result = await session.call_tool(tool_name, arguments=tool_args)
                            result_text = "\\n".join([c.text for c in result.content if c.type == "text"])

                            if tool_name == "search_web":
                                try:
                                    parsed = json.loads(result_text)
                                    links = [{"title": r.get("title", ""), "url": r.get("url", "")} for r in parsed]
                                    yield {"type": "links_found", "links": links}
                                except json.JSONDecodeError:
                                    pass

                            messages.append(ToolMessage(
                                content=result_text,
                                tool_call_id=tool_call.get("id", f"call_{iteration}"),
                                name=tool_name
                            ))
                        except Exception as e:
                            print(f"Tool error: {e}")
                            messages.append(ToolMessage(
                                content=f"Error executing tool {tool_name}: {str(e)}",
                                tool_call_id=tool_call.get("id", f"call_{iteration}"),
                                name=tool_name
                            ))
                            
                if iteration >= max_iterations:
                    yield {"type": "status", "message": "Max research depth reached."}
                    final_response = await self.llm.ainvoke(messages)
                    yield {"type": "answer", "content": final_response.content}
