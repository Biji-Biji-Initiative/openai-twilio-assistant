import OpenAI from 'openai';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

class OpenAIService {
  private client: OpenAI;

  constructor() {
    if (!env.OPENAI_API_KEY) {
      logger.warn('OpenAI API key not set. AI features will be disabled.');
    }
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY || '' });
  }

  async processMessage(message: string): Promise<string> {
    if (!env.OPENAI_API_KEY) {
      return 'AI processing is not available (API key not configured)';
    }

    try {
      const completion = await this.client.chat.completions.create({
        messages: [{ role: 'user', content: message }],
        model: 'gpt-3.5-turbo',
      });

      return completion.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      logger.error('Error processing message with OpenAI:', error);
      throw new Error('Failed to process message with AI');
    }
  }
}

export const openAIService = new OpenAIService(); 