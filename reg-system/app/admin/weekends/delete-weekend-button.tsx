"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteWeekend } from "@/app/actions/academy";

export function DeleteWeekendButton({ weekendId, weekendName }: { weekendId: string; weekendName: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete weekend "${weekendName}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await deleteWeekend(weekendId);
    } catch (err: any) {
      alert(err.message || "Failed to delete weekend");
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
