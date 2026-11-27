import 
{
    END,
    MessagesZodMeta,
    START,
    StateGraph,
} from "@langchain/langgraph";
import { withLangGraph } from "@langchain/langgraph/zod";
import { BaseMessage } from "langchain";
import { z } from "zod/v3";
import { identifyIntentNode } from "./nodes/identifyIntentNode.ts";
import { chatResponseNode } from "./nodes/chatResponseNode.ts";
import { upperCaseNode } from "./nodes/upperCaseNode.ts";
import { lowerCaseNode } from "./nodes/lowerCaseNode.ts";
import { fallbackNode } from "./nodes/fallbackNode.ts";

const GraphState = z.object({
    message: withLangGraph(
        z.custom<BaseMessage[]>(),
        MessagesZodMeta
    ),
    output: z.string(),
    command: z.enum(["upper", "lower", "unknown"]),
});

export type GraphState = z.infer<typeof GraphState>

export function buildGraph() {
    const workflow = new StateGraph({
        stateSchema: GraphState
    })
    . addNode("identifyIntent", identifyIntentNode)
    . addNode("chatResponse", chatResponseNode)

    . addNode("upperCase", upperCaseNode)
    . addNode("lowerCase", lowerCaseNode)
    . addNode("fallback", fallbackNode)
    // .addNode("identifyIntent", (state: GraphState) => {


    //     return {
    //         ...state,
    //         output: 'test'
    //     }
    // })
    .addEdge(START, "identifyIntent")
    .addConditionalEdges(
        "identifyIntent",
        (state: GraphState) => {
            if (state.command === "upper") {
                return "upperCase";
            } else if (state.command === "lower") {
                return "lowerCase";
            } else {
                return "fallback";
            }
        },
        {
            upperCase: "upperCase",
            lowerCase: "lowerCase",
            fallback: "fallback"
        }
    )
    .addEdge("upperCase", "chatResponse")
    .addEdge("lowerCase", "chatResponse")
    .addEdge("fallback", "chatResponse")
    .addEdge("chatResponse", END)

    return workflow.compile()
}