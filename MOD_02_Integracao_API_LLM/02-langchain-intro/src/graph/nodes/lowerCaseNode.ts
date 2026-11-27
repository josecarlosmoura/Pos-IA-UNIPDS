import { type GraphState } from "../graph.ts";

export const lowerCaseNode = (state: GraphState): GraphState => {
    const responseText = state.output.toLowerCase() ?? "No input provided in lowercase";
    
    return {
        ...state,
        output: responseText
    };
};