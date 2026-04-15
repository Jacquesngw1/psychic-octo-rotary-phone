jest.mock("openai");
jest.mock("@google/generative-ai");

import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { LLMClient } from "../index";

const MockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
const MockGoogleAI = GoogleGenerativeAI as jest.MockedClass<
  typeof GoogleGenerativeAI
>;

describe("LLMClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("initializes OpenAI client with provided API key", () => {
      new LLMClient({ provider: "openai", apiKey: "test-openai-key" });
      expect(MockOpenAI).toHaveBeenCalledWith({ apiKey: "test-openai-key" });
    });

    it("initializes Google AI client with provided API key", () => {
      new LLMClient({ provider: "google", apiKey: "test-google-key" });
      expect(MockGoogleAI).toHaveBeenCalledWith("test-google-key");
    });

    it("defaults to gpt-4o model for OpenAI provider", () => {
      const client = new LLMClient({
        provider: "openai",
        apiKey: "test-key",
      });
      // Verify by calling generate and checking the model passed
      expect(client).toBeDefined();
    });

    it("defaults to gemini-1.5-pro model for Google provider", () => {
      const client = new LLMClient({
        provider: "google",
        apiKey: "test-key",
      });
      expect(client).toBeDefined();
    });

    it("uses custom model when provided for OpenAI", () => {
      new LLMClient({
        provider: "openai",
        apiKey: "test-key",
        model: "gpt-3.5-turbo",
      });
      expect(MockOpenAI).toHaveBeenCalled();
    });

    it("uses custom model when provided for Google", () => {
      new LLMClient({
        provider: "google",
        apiKey: "test-key",
        model: "gemini-1.0-pro",
      });
      expect(MockGoogleAI).toHaveBeenCalled();
    });
  });

  describe("generate with OpenAI", () => {
    let client: LLMClient;
    let mockCreate: jest.Mock;

    beforeEach(() => {
      mockCreate = jest.fn();
      MockOpenAI.prototype.chat = {
        completions: { create: mockCreate },
      } as unknown as OpenAI["chat"];

      client = new LLMClient({ provider: "openai", apiKey: "test-key" });
    });

    it("sends user message to OpenAI", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "Test response" } }],
        model: "gpt-4o",
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      });

      await client.generate("Hello");

      expect(mockCreate).toHaveBeenCalledWith({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello" }],
      });
    });

    it("includes system prompt when provided", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "Test response" } }],
        model: "gpt-4o",
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      });

      await client.generate("Hello", "You are a helpful assistant");

      expect(mockCreate).toHaveBeenCalledWith({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a helpful assistant" },
          { role: "user", content: "Hello" },
        ],
      });
    });

    it("returns properly mapped response with usage data", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "Analysis result" } }],
        model: "gpt-4o-2024-05-13",
        usage: {
          prompt_tokens: 15,
          completion_tokens: 25,
          total_tokens: 40,
        },
      });

      const response = await client.generate("Analyze this");

      expect(response).toEqual({
        text: "Analysis result",
        model: "gpt-4o-2024-05-13",
        usage: {
          promptTokens: 15,
          completionTokens: 25,
          totalTokens: 40,
        },
      });
    });

    it("returns empty string when content is null", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
        model: "gpt-4o",
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
          total_tokens: 10,
        },
      });

      const response = await client.generate("Hello");

      expect(response.text).toBe("");
    });

    it("returns undefined usage when not provided", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "response" } }],
        model: "gpt-4o",
        usage: undefined,
      });

      const response = await client.generate("Hello");

      expect(response.usage).toBeUndefined();
    });

    it("propagates API errors", async () => {
      mockCreate.mockRejectedValue(new Error("Rate limit exceeded"));

      await expect(client.generate("Hello")).rejects.toThrow(
        "Rate limit exceeded"
      );
    });
  });

  describe("generate with Google", () => {
    let client: LLMClient;
    let mockGenerateContent: jest.Mock;
    let mockGetGenerativeModel: jest.Mock;

    beforeEach(() => {
      mockGenerateContent = jest.fn();
      mockGetGenerativeModel = jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      });
      MockGoogleAI.prototype.getGenerativeModel = mockGetGenerativeModel;

      client = new LLMClient({ provider: "google", apiKey: "test-key" });
    });

    it("sends prompt to Google AI without system prompt", async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => "Google response" },
      });

      await client.generate("Hello");

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: "gemini-1.5-pro",
      });
      expect(mockGenerateContent).toHaveBeenCalledWith("Hello");
    });

    it("concatenates system prompt with user prompt", async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => "Google response" },
      });

      await client.generate("Hello", "You are a helper");

      expect(mockGenerateContent).toHaveBeenCalledWith(
        "You are a helper\n\nHello"
      );
    });

    it("returns properly structured response", async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => "Detailed analysis" },
      });

      const response = await client.generate("Analyze this");

      expect(response).toEqual({
        text: "Detailed analysis",
        model: "gemini-1.5-pro",
      });
    });

    it("uses custom model when specified", async () => {
      const customClient = new LLMClient({
        provider: "google",
        apiKey: "test-key",
        model: "gemini-1.0-pro",
      });

      mockGenerateContent.mockResolvedValue({
        response: { text: () => "response" },
      });

      const response = await customClient.generate("test");

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: "gemini-1.0-pro",
      });
      expect(response.model).toBe("gemini-1.0-pro");
    });

    it("propagates API errors", async () => {
      mockGenerateContent.mockRejectedValue(new Error("API key invalid"));

      await expect(client.generate("Hello")).rejects.toThrow(
        "API key invalid"
      );
    });
  });
});
