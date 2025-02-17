export interface ToolTemplate {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export const toolTemplates: ToolTemplate[] = [
  {
    name: "search",
    description: "Search for information on a given topic",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "lookup",
    description: "Look up specific information in a database",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The ID to look up",
        },
        type: {
          type: "string",
          description: "The type of information to look up",
          enum: ["customer", "order", "product"],
        },
      },
      required: ["id", "type"],
    },
  },
  {
    name: "calculate",
    description: "Perform a calculation",
    parameters: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          description: "The operation to perform",
          enum: ["add", "subtract", "multiply", "divide"],
        },
        numbers: {
          type: "array",
          items: {
            type: "number",
          },
          description: "The numbers to calculate with",
        },
      },
      required: ["operation", "numbers"],
    },
  },
];
