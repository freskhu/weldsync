"use client";

import { useState } from "react";
import { UploadProgramForm } from "./upload-program-form";
import type { Program, Robot } from "@/lib/types";

interface UploadButtonProps {
  robots: Robot[];
  templates: Program[];
}

export function UploadButton({ robots, templates }: UploadButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="px-4 py-2.5 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors min-h-[44px]"
      >
        + Novo Programa
      </button>

      {showModal && (
        <UploadProgramForm
          robots={robots}
          templates={templates}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
