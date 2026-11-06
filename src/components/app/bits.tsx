"use client";
import { Chip } from "@/components/ui";
import type { Stage } from "@/lib/engine/types";
import { STAGE_LABEL, STAGE_TONE } from "./format";

export function StageChip({ stage }: { stage: Stage }) {
  return <Chip tone={STAGE_TONE[stage]} dot>{STAGE_LABEL[stage]}</Chip>;
}
