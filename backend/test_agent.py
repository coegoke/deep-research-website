import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from agent import DeepResearchAgent

async def main():
    agent = DeepResearchAgent()
    
    print("Starting agent research...")
    try:
        async for event in agent.research("What is the latest news about Python 3.13?"):
            print(event)
    except Exception as e:
        print(f"Agent error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
