import asyncio
import json
import httpx
from bs4 import BeautifulSoup
from ddgs import DDGS
from mcp.server import Server, NotificationOptions
from mcp.server.models import InitializationOptions
import mcp.types as types
from mcp.server.stdio import stdio_server

server = Server("deep-research-server")

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """
    List available tools for deep research.
    """
    return [
        types.Tool(
            name="search_web",
            description="Search the web for a query using DuckDuckGo. Returns a list of relevant websites and snippets.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query."
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default: 5)."
                    }
                },
                "required": ["query"]
            }
        ),
        types.Tool(
            name="scrape_page",
            description="Scrape the text content of a webpage given its URL.",
            inputSchema={
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "The URL of the webpage to scrape."
                    }
                },
                "required": ["url"]
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict | None) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    """
    Handle tool execution requests.
    """
    if not arguments:
        raise ValueError("Missing arguments")

    if name == "search_web":
        query = arguments.get("query")
        max_results = arguments.get("max_results", 5)
        
        try:
            results = []
            with DDGS() as ddgs:
                for r in ddgs.text(query, max_results=max_results):
                    results.append({
                        "title": r.get('title', ''),
                        "url": r.get('href', ''),
                        "snippet": r.get('body', '')
                    })
            
            return [types.TextContent(
                type="text",
                text=json.dumps(results, indent=2)
            )]
        except Exception as e:
            return [types.TextContent(
                type="text",
                text=f"Error performing search: {str(e)}"
            )]

    elif name == "scrape_page":
        url = arguments.get("url")
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Remove script and style elements
                for script in soup(["script", "style"]):
                    script.decompose()
                    
                text = soup.get_text(separator=' ', strip=True)
                
                # Truncate text to avoid context limits (e.g., first 10000 characters)
                truncated_text = text[:10000]
                
                return [types.TextContent(
                    type="text",
                    text=f"Content from {url}:\n\n{truncated_text}"
                )]
        except Exception as e:
            return [types.TextContent(
                type="text",
                text=f"Error scraping page {url}: {str(e)}"
            )]

    else:
        raise ValueError(f"Unknown tool: {name}")

async def main():
    # Run the server using stdio transport
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="deep-research-server",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                )
            )
        )

if __name__ == "__main__":
    asyncio.run(main())
