import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface LLMResponse {
  text: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMClientOptions {
  provider: "openai" | "google";
  apiKey: string;
  model?: string;
}

export class LLMClient {
  private provider: "openai" | "google";
  private openai?: OpenAI;
  private google?: GoogleGenerativeAI;
  private model: string;

  constructor(options: LLMClientOptions) {
    this.provider = options.provider;

    if (options.provider === "openai") {
      this.openai = new OpenAI({ apiKey: options.apiKey });
      this.model = options.model ?? "gpt-4o";
    } else {
      this.google = new GoogleGenerativeAI(options.apiKey);
      this.model = options.model ?? "gemini-1.5-pro";
    }
  }

  async generate(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    if (this.provider === "openai" && this.openai) {
      return this.generateOpenAI(prompt, systemPrompt);
    }
    return this.generateGoogle(prompt, systemPrompt);
  }

  private async generateOpenAI(
    prompt: string,
    systemPrompt?: string
  ): Promise<LLMResponse> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await this.openai!.chat.completions.create({
      model: this.model,
      messages,
    });

    const choice = response.choices[0];
    return {
      text: choice.message.content ?? "",
      model: response.model,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  private async generateGoogle(
    prompt: string,
    systemPrompt?: string
  ): Promise<LLMResponse> {
    const model = this.google!.getGenerativeModel({ model: this.model });
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const result = await model.generateContent(fullPrompt);
    const response = result.response;

    return {
      text: response.text(),
      model: this.model,
    };
  }
}

export default LLMClient;
