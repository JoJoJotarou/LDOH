import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizeApiBaseUrl,
  extractProtocolAndDomain,
  checkApiBaseUrlExists,
  UrlValidationError,
  type UrlConflictResult,
} from "../url";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

// Mock Supabase
vi.mock("@/lib/db/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

/**
 * 测试用例的 Mock 数据
 */
export const mockUrls = {
  valid: [
    "https://api.example.com",
    "http://api.example.com",
    "https://API.Example.COM",
    "https://api.example.com/",
    "https://api.example.com/v1",
    "https://api.example.com:8080",
    "https://192.168.1.1:8080",
  ],
  invalid: ["not-a-url", "ftp://api.example.com", "", "   "],
  duplicates: [
    ["https://api.example.com", "http://api.example.com"],
    ["https://api.example.com", "https://api.example.com/"],
    ["https://API.Example.COM", "https://api.example.com"],
  ],
  nonDuplicates: [
    ["https://api.example.com", "https://api.example.com/v1"],
    ["https://api.example.com", "https://api2.example.com"],
    ["https://api.example.com:8080", "https://api.example.com:9090"],
  ],
};

/**
 * 前端开发用 Mock 数据
 */
export const mockConflictingSite = {
  id: "mock-site-123",
  name: "Example Site",
  apiBaseUrl: "https://api.example.com",
};

export const mockUrlConflictResponse = {
  error: "API Base URL 已存在",
  conflictingSite: mockConflictingSite,
};

export const mockUrlCheckResult: UrlConflictResult = {
  exists: true,
  conflictingSite: mockConflictingSite,
};

describe("normalizeApiBaseUrl", () => {
  it("should normalize http to https", () => {
    const result = normalizeApiBaseUrl("http://api.example.com");
    expect(result.normalized).toBe("https://api.example.com");
    expect(result.protocolAndDomain).toBe("https://api.example.com");
  });

  it("should convert domain to lowercase", () => {
    const result = normalizeApiBaseUrl("https://API.Example.COM");
    expect(result.normalized).toBe("https://api.example.com");
    expect(result.protocolAndDomain).toBe("https://api.example.com");
  });

  it("should remove trailing slash", () => {
    const result = normalizeApiBaseUrl("https://api.example.com/");
    expect(result.normalized).toBe("https://api.example.com");
  });

  it("should preserve path", () => {
    const result = normalizeApiBaseUrl("https://api.example.com/v1");
    expect(result.normalized).toBe("https://api.example.com/v1");
    expect(result.protocolAndDomain).toBe("https://api.example.com");
  });

  it("should remove trailing slash from path", () => {
    const result = normalizeApiBaseUrl("https://api.example.com/v1/");
    expect(result.normalized).toBe("https://api.example.com/v1");
  });

  it("should preserve port number", () => {
    const result = normalizeApiBaseUrl("https://api.example.com:8080");
    expect(result.normalized).toBe("https://api.example.com:8080");
    expect(result.protocolAndDomain).toBe("https://api.example.com:8080");
  });

  it("should handle IP addresses", () => {
    const result = normalizeApiBaseUrl("https://192.168.1.1:8080");
    expect(result.normalized).toBe("https://192.168.1.1:8080");
    expect(result.protocolAndDomain).toBe("https://192.168.1.1:8080");
  });

  it("should preserve query parameters", () => {
    const result = normalizeApiBaseUrl("https://api.example.com?key=value");
    expect(result.normalized).toBe("https://api.example.com?key=value");
  });

  it("should preserve hash", () => {
    const result = normalizeApiBaseUrl("https://api.example.com#section");
    expect(result.normalized).toBe("https://api.example.com#section");
  });

  it("should store original URL", () => {
    const original = "http://API.Example.COM/v1/";
    const result = normalizeApiBaseUrl(original);
    expect(result.original).toBe(original);
  });

  it("should throw UrlValidationError for empty URL", () => {
    expect(() => normalizeApiBaseUrl("")).toThrow(UrlValidationError);
    expect(() => normalizeApiBaseUrl("   ")).toThrow(UrlValidationError);
  });

  it("should throw UrlValidationError for invalid URL format", () => {
    expect(() => normalizeApiBaseUrl("not-a-url")).toThrow(UrlValidationError);
  });

  it("should throw UrlValidationError for unsupported protocol", () => {
    expect(() => normalizeApiBaseUrl("ftp://api.example.com")).toThrow(
      UrlValidationError
    );
  });
});

describe("extractProtocolAndDomain", () => {
  it("should extract protocol and domain", () => {
    const result = extractProtocolAndDomain("https://api.example.com/v1");
    expect(result).toBe("https://api.example.com");
  });

  it("should preserve port number", () => {
    const result = extractProtocolAndDomain("https://api.example.com:8080/v1");
    expect(result).toBe("https://api.example.com:8080");
  });

  it("should normalize protocol to https", () => {
    const result = extractProtocolAndDomain("http://api.example.com/v1");
    expect(result).toBe("https://api.example.com");
  });

  it("should convert domain to lowercase", () => {
    const result = extractProtocolAndDomain("https://API.Example.COM/v1");
    expect(result).toBe("https://api.example.com");
  });
});

describe("checkApiBaseUrlExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return exists: false when no sites exist", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    });
    (supabaseAdmin.from as unknown) = mockFrom;

    const result = await checkApiBaseUrlExists("https://api.example.com");
    expect(result.exists).toBe(false);
    expect(result.conflictingSite).toBeUndefined();
  });

  it("should return exists: true when protocol+domain matches", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          {
            id: "site-1",
            name: "Example Site",
            api_base_url: "http://api.example.com",
          },
        ],
        error: null,
      }),
    });
    (supabaseAdmin.from as unknown) = mockFrom;

    const result = await checkApiBaseUrlExists("https://api.example.com");
    expect(result.exists).toBe(true);
    expect(result.conflictingSite).toEqual({
      id: "site-1",
      name: "Example Site",
      apiBaseUrl: "http://api.example.com",
    });
  });

  it("should return exists: true when trailing slash differs", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          {
            id: "site-1",
            name: "Example Site",
            api_base_url: "https://api.example.com/",
          },
        ],
        error: null,
      }),
    });
    (supabaseAdmin.from as unknown) = mockFrom;

    const result = await checkApiBaseUrlExists("https://api.example.com");
    expect(result.exists).toBe(true);
  });

  it("should return exists: true when domain case differs", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          {
            id: "site-1",
            name: "Example Site",
            api_base_url: "https://API.Example.COM",
          },
        ],
        error: null,
      }),
    });
    (supabaseAdmin.from as unknown) = mockFrom;

    const result = await checkApiBaseUrlExists("https://api.example.com");
    expect(result.exists).toBe(true);
  });

  it("should return exists: false when path differs", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          {
            id: "site-1",
            name: "Example Site",
            api_base_url: "https://api.example.com/v1",
          },
        ],
        error: null,
      }),
    });
    (supabaseAdmin.from as unknown) = mockFrom;

    const result = await checkApiBaseUrlExists("https://api.example.com/v2");
    expect(result.exists).toBe(false);
  });

  it("should return exists: false when port differs", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          {
            id: "site-1",
            name: "Example Site",
            api_base_url: "https://api.example.com:8080",
          },
        ],
        error: null,
      }),
    });
    (supabaseAdmin.from as unknown) = mockFrom;

    const result = await checkApiBaseUrlExists("https://api.example.com:9090");
    expect(result.exists).toBe(false);
  });

  it("should exclude specified site ID", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          {
            id: "site-1",
            name: "Example Site",
            api_base_url: "https://api.example.com",
          },
        ],
        error: null,
      }),
    });
    (supabaseAdmin.from as unknown) = mockFrom;

    const result = await checkApiBaseUrlExists(
      "https://api.example.com",
      "site-1"
    );
    expect(result.exists).toBe(false);
  });

  it("should skip invalid URLs in database", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          {
            id: "site-1",
            name: "Invalid Site",
            api_base_url: "not-a-url",
          },
          {
            id: "site-2",
            name: "Valid Site",
            api_base_url: "https://api.example.com",
          },
        ],
        error: null,
      }),
    });
    (supabaseAdmin.from as unknown) = mockFrom;

    const result = await checkApiBaseUrlExists("https://api.example.com");
    expect(result.exists).toBe(true);
    expect(result.conflictingSite?.id).toBe("site-2");
  });

  it("should throw error when database query fails", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      }),
    });
    (supabaseAdmin.from as unknown) = mockFrom;

    await expect(
      checkApiBaseUrlExists("https://api.example.com")
    ).rejects.toThrow("Failed to query sites");
  });
});
