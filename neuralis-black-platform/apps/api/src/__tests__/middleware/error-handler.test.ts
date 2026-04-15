import { Request, Response, NextFunction } from "express";
import { errorHandler } from "../../middleware/error-handler";

describe("errorHandler middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockReq = {};
    mockRes = {
      status: mockStatus,
    } as Partial<Response>;
    mockNext = jest.fn();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  it("returns HTTP 500 status", () => {
    const error = new Error("Something broke");

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(500);
  });

  it("returns generic error message", () => {
    const error = new Error("Something broke");

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Internal server error",
      })
    );
  });

  it("includes error message in development mode", () => {
    process.env.NODE_ENV = "development";
    const error = new Error("Detailed error info");

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockJson).toHaveBeenCalledWith({
      error: "Internal server error",
      message: "Detailed error info",
    });
  });

  it("hides error message in production mode", () => {
    process.env.NODE_ENV = "production";
    const error = new Error("Secret database error");

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockJson).toHaveBeenCalledWith({
      error: "Internal server error",
      message: undefined,
    });
  });

  it("logs the error to console", () => {
    const error = new Error("Test error");

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(console.error).toHaveBeenCalledWith("Unhandled error:", error);
  });
});
