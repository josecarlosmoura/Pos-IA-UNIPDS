import { type GraphState } from "../graph.ts";

export const upperCaseNode = (state: GraphState): GraphState => {
    const responseText = state.output.toUpperCase() ?? "No input provided in uppercase";
    
    return {
        ...state,
        output: responseText
    };
};