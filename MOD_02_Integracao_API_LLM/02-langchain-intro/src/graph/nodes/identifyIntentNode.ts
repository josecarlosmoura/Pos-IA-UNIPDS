import { type GraphState } from "../graph.ts";

export const identifyIntentNode = (state: GraphState): GraphState => {
    const input = state.message.at(-1)?.text ?? "";
    const inputLower = input.toLowerCase();

    let command: GraphState["command"] = "unknown";
    if (inputLower.includes("upper")) {
        command = "upper";
    } else if (inputLower.includes("lower")) {
        command = "lower";
    }

    return {
        ...state,
        command,
        output: input, // Preserve the original input for further processing
    };
};