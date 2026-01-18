"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { generateRemainingWeekends } from "@/app/actions/academy";

export function GenerateRemainingButton({ currentCount }: { currentCount: number }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  if (currentCount >= 12) {
    return null; // Don't show if already have 12+
  }

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await generateRemainingWeekends();
      setSuccess(`Generated ${result.created} weekends! Total: ${result.total}`);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to generate weekends");
    } finally {
      setLoading(false);
    }
  }

  const remaining = 12 - currentCount;

  return (
    <div className="space-y-3">
      <Button
        onClick={handleGenerate}
        disabled={loading}
        variant="outline"
        className="w-full"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {loading ? "Generating..." : `Generate Remaining ${remaining} Weekends`}
      </Button>

      {success && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-600 text-sm rounded">
          {success}
        </div>
      )}

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded">
          {error}
        </div>
      )}
    </div>
  );
}
