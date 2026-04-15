import { Request, Response, NextFunction } from "express";
import { authenticate } from "../../middleware/authenticate";

describe("authenticate middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  it("calls next when no authorization header is present", () => {
    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it("extracts user ID from Bearer token", () => {
    mockReq.headers = { authorization: "Bearer user-token-123" };

    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect((mockReq as any).userId).toBe("user-token-123");
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("does not set userId when authorization header is absent", () => {
    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect((mockReq as any).userId).toBeUndefined();
  });

  it("strips Bearer prefix from the token", () => {
    mockReq.headers = { authorization: "Bearer my-jwt-token" };

    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect((mockReq as any).userId).toBe("my-jwt-token");
  });

  it("handles empty Bearer token", () => {
    mockReq.headers = { authorization: "Bearer " };

    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect((mockReq as any).userId).toBe("");
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("handles non-Bearer authorization header by passing it through", () => {
    mockReq.headers = { authorization: "Basic abc123" };

    authenticate(mockReq as Request, mockRes as Response, mockNext);

    // The current implementation uses simple string replace, so "Basic abc123"
    // becomes "Basic abc123" with "Bearer " removed (no match, stays same)
    expect((mockReq as any).userId).toBe("Basic abc123");
    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
