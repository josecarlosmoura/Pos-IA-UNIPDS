import { AIMessage, SystemMessage } from "langchain";
import { type GraphState } from "../graph.ts";

export const fallbackNode = (state: GraphState): GraphState => {
    const  message = "Unknown command. Try 'make this upper please!' or 'make this lower please!'";
    const fallbackMessage = new AIMessage(message).content.toString();

    return {
        ...state,
        output: fallbackMessage,
        message: [
            ...state.message,
            new SystemMessage("The system could not identify the command."),
        ]
    };
};