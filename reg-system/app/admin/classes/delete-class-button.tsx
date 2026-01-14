"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteClass } from "@/app/actions/academy";

export function DeleteClassButton({ classId, className }: { classId: string; className: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete class "${className}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await deleteClass(classId);
    } catch (err: any) {
      alert(err.message || "Failed to delete class");
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
