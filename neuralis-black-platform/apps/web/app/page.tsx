"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface AuditResult {
  auditId: string;
  status: string;
  query?: string;
  results?: {
    analysis: string;
    recommendations: string[];
    score: number;
  };
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startAudit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/api/audits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        throw new Error(`Failed to start audit: ${res.statusText}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Neuralis <span className="text-blue-500">Black</span>
          </h1>
          <p className="mt-2 text-gray-400">
            GEO Intelligence Platform — Optimize your content for AI-generated
            search results
          </p>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <label
            htmlFor="query"
            className="block text-sm font-medium text-gray-300"
          >
            Enter your query or content to audit
          </label>
          <textarea
            id="query"
            rows={4}
            className="mt-2 w-full rounded-md border border-gray-700 bg-gray-800 p-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g., Best practices for React performance optimization..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <button
            onClick={startAudit}
            disabled={loading || !query.trim()}
            className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Running Audit..." : "Start GEO Audit"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-400">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-6 space-y-4">
            <h2 className="text-lg font-semibold">Audit Result</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Audit ID:</span>
                <p className="font-mono text-xs">{result.auditId}</p>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <p className="font-semibold text-blue-400">{result.status}</p>
              </div>
            </div>

            {result.results && (
              <>
                <div>
                  <h3 className="text-sm font-medium text-gray-400">
                    GEO Score
                  </h3>
                  <p className="text-3xl font-bold text-green-400">
                    {result.results.score}/100
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400">
                    Analysis
                  </h3>
                  <p className="mt-1 text-sm text-gray-300">
                    {result.results.analysis}
                  </p>
                </div>
                {result.results.recommendations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">
                      Recommendations
                    </h3>
                    <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-gray-300">
                      {result.results.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
