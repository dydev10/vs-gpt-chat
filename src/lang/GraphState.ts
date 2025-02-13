import { StateGraph, Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

// Define the state annotation
const GraphStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (left: BaseMessage[], right: BaseMessage | BaseMessage[]) => {
      if (Array.isArray(right)) {
        return left.concat(right);
      }
      return left.concat([right]);
    },
    default: () => [],
  }),
});

// // Create the StateGraph with the defined state annotation
// const graphBuilder = new StateGraph(GraphStateAnnotation);
// export default graphBuilder;

export default GraphStateAnnotation;
