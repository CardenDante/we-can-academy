"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { removeSessionFromClass } from "@/app/actions/sessions";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

interface RemoveSessionButtonProps {
  sessionClassId: string;
  classId: string;
}

export function RemoveSessionButton({
  sessionClassId,
  classId,
}: RemoveSessionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    if (!confirm("Are you sure you want to remove this session from the class?")) {
      return;
    }

    setLoading(true);

    try {
      await removeSessionFromClass(sessionClassId);
      router.refresh();
    } catch (error) {
      alert("Failed to remove session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRemove}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
