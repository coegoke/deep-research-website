import { AgentEvent } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function streamChat(
    query: string,
    onEvent: (event: AgentEvent) => void,
    onDone: () => void,
    onError: (error: string) => void
) {
    fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
    })
        .then(async (response) => {
            if (!response.body) throw new Error('ReadableStream not yet supported in this browser.');

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');

            let done = false;

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                if (readerDone) {
                    done = true;
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                let currentEvent = '';

                for (const line of lines) {
                    if (line.startsWith('event:')) {
                        currentEvent = line.replace('event:', '').trim();
                    } else if (line.startsWith('data:')) {
                        const dataStr = line.replace('data:', '').trim();
                        if (dataStr) {
                            try {
                                const data = JSON.parse(dataStr);

                                if (currentEvent === 'done' || data.type === 'done') {
                                    onDone();
                                    return;
                                } else if (currentEvent === 'error' || data.type === 'error') {
                                    onError(data.message || 'Unknown error');
                                    return;
                                } else {
                                    onEvent(data as AgentEvent);
                                }
                            } catch (e) {
                                console.error('Error parsing SSE data:', e, dataStr);
                            }
                        }
                    }
                }
            }
        })
        .catch((error) => {
            console.error('Fetch error:', error);
            onError(error.message || 'Connection error');
        });
}
