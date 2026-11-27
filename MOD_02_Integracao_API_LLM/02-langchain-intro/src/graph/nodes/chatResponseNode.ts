import { AIMessage } from "langchain";
import { type GraphState } from "../graph.ts";

export const chatResponseNode = (state: GraphState): GraphState => {
    const input = state.output ?? "";

    const responseText =
        state.command === "upper" ? input.toUpperCase() :
        state.command === "lower" ? input.toLowerCase() :
        input;

    const aiMessage = new AIMessage(responseText);

    return {
        ...state,
        output: responseText,
        message: [...state.message, aiMessage]
    };
};
