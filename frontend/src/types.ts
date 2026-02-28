export interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    reasoning?: string
    events?: AgentEvent[]
}

export interface AgentEvent {
    type: 'status' | 'reasoning' | 'tool_call' | 'links_found' | 'answer' | 'error' | 'done'
    message?: string
    content?: string
    tool?: string
    args?: any
    links?: { title: string; url: string }[]
}
