"use client";
import { useState } from "react";
import { Button } from "@/components/ui";

export function LanguageSwitcher({ current }: { current: "EN" | "UR" }) {
  const [saving, setSaving] = useState(false);

  async function pick(lang: "EN" | "UR") {
    setSaving(true);
    await fetch("/api/lang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang }),
    });
    window.location.reload();
  }

  return (
    <div className="flex gap-2">
      <Button variant={current === "EN" ? "primary" : "secondary"} disabled={saving} onClick={() => pick("EN")}>
        English
      </Button>
      <Button variant={current === "UR" ? "primary" : "secondary"} disabled={saving} onClick={() => pick("UR")}>
        اردو
      </Button>
    </div>
  );
}
