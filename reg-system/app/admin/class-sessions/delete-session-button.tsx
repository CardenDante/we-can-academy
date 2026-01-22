"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteSession } from "@/app/actions/academy";

export function DeleteSessionButton({ sessionId, sessionName }: { sessionId: string; sessionName: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete session "${sessionName}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await deleteSession(sessionId);
    } catch (err: any) {
      alert(err.message || "Failed to delete session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
