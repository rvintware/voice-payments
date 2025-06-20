import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * @template A extends z.ZodTypeAny
 * @template R extends z.ZodTypeAny
 * @typedef {Object} Tool
 * @property {string} name
 * @property {string} description
 * @property {A} argsSchema
 * @property {R} resultSchema
 * @property {(args: z.infer<A>, ctx: any) => Promise<z.infer<R>>} run
 */

/**
 * Convert Tool definition into OpenAI function-call parameters.
 */
export function toOpenAIFunctionDef(tool) {
  return {
    name: tool.name,
    description: tool.description,
    parameters: zodToJsonSchema(tool.argsSchema),
  };
} 