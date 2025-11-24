export interface AgentResult {
    success: boolean;
    message: string;
    data?: any;
}

export abstract class BaseAgent {
    name: string;
    type: string;

    constructor(name: string, type: string) {
        this.name = name;
        this.type = type;
    }

    abstract run(context?: any): Promise<AgentResult>;

    protected log(message: string) {
        console.log(`[Agent: ${this.name}] ${message}`);
    }
}
