console.assert(
    process.env.OPENROUTER_API_KEY,
    'OPENROUTER_API_KEY is not defined'
);

export type ModelConfig = {
    apiKey: string;
    httpReferer?: string;
    xTitle: string
    port: number;
    models: string[];
    temperature: number;
    maxtokens: number;
    systemPrompt: string;

    provider: {
        sort: {
            by: string,
            partition: string
        }
    }
}

export const config = {
    apiKey: process.env.OPENROUTER_API_KEY!,
    httpReferer: process.env.HTTP_REFERER,
    xTitle: 'SmartModelRouterGateway',
    port: 3000, 
    models: [
        // Modelos de chat gratuitos (o 1º é o principal, os demais são fallback)
        'google/gemma-4-26b-a4b-it:free',
        'google/gemma-4-31b-it:free',
        'nvidia/nemotron-3.5-lightning:free'
    ],
    temperature: 0.2,
    maxtokens: 500,
    systemPrompt: 'You are a helpful assistant.',
    provider:{
        sort:{
            by: 'price',
            // by: 'latency',
            // by: 'throughput',
            partition: 'none'
        }
    }
}
