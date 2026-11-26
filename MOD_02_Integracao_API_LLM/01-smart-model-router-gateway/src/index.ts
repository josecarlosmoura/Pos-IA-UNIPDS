import { config } from "./config.ts";
import { OpenRouterService } from "./openrouterService.ts";
import { createServer } from "./server.ts";

const openRouterService = new OpenRouterService(config);
const app = createServer(openRouterService);

await app.listen({ port: 3000, host: '0.0.0.0' });
console.log('Server listening on http://0.0.0.0:3000');

app.inject({
    method: 'POST',
    url: '/chat',
    body: { question: 'What is the capital of France?' }
}).then((response) => {
    console.log('Response status', response.statusCode);
    console.log('Response body', response.body);
});