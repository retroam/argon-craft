# ArgonCraft 3D — Agent & Developer Guide (`AGENTS.md`)

## Overview
**ArgonCraft 3D** is a Figma-to-3D Game Studio and Google Model Arsenal Evaluation Suite built for **Google AI Studio Build** and the **Gemini 4 Argon (`gemini-4-argon`) Interactions API**.

It solves the core human-computer interaction bottleneck in generative game creation: **humans are poor at writing complete upfront game specifications.** Instead of asking for a wall of text, ArgonCraft:
1. Lets the user sketch or customize a 2D semantic layout in a **Figma-like vector editor** ([`FigmaCanvasStudio.tsx`](file:///Users/dev/Documents/capes/3d-evaluator/src/components/FigmaCanvasStudio.tsx)).
2. Generates **3 short-lived (20-second) playable 3D mechanic probes** ([`MicroDemoLab.tsx`](file:///Users/dev/Documents/capes/3d-evaluator/src/components/MicroDemoLab.tsx)) via `gemini-3.8-flash` / `gemini-4-argon`.
3. **Observes the human as they play** ([`ThreeGameViewport.tsx`](file:///Users/dev/Documents/capes/3d-evaluator/src/components/ThreeGameViewport.tsx)), capturing real-time behavioral telemetry (APM, jump cadence, airborne ratio, air-dash/combat bursts, 2D spatial heatmap, shard collection, hazard collisions).
4. Chains state via `previous_interaction_id` into `gemini-4-argon` (`thinking_level: "high"` or `"medium"`) to infer the player's **Latent Game Specification** and synthesize the **Full 3D Game** ([`FullGameStudio.tsx`](file:///Users/dev/Documents/capes/3d-evaluator/src/components/FullGameStudio.tsx)) with a 5-point autonomous verification loop.
5. Benchmarks the **Google Model Arsenal** ([`EvalSuiteArena.tsx`](file:///Users/dev/Documents/capes/3d-evaluator/src/components/EvalSuiteArena.tsx)) across `gemini-4-argon` (`high`, `medium`, `low`), `gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemma-4-31b-it`, and multimodal companions (`gemini-nano-banana-2.1`, `gemini-3.1-flash-lite-image`, `gemini-3.8-flash-tts`).

## Critical Gemini 4 Argon & Interactions API Rules
- Always use `@google/genai` (`>= 2.30.1`) and `client.interactions.create(...)` in [`geminiService.ts`](file:///Users/dev/Documents/capes/3d-evaluator/src/services/geminiService.ts).
- When calling `gemini-4-argon`, pass `generation_config: { thinking_level: "low" | "medium" | "high" }`.
- **Never** pass legacy parameters (`temperature`, `top_p`, `top_k`, `thinking_budget`, or explicit `cached_content`) to `gemini-4-argon`.
- Use `previous_interaction_id` to maintain server-side conversation state across the Canvas → Micro-Demo → Telemetry → Full Game pipeline.
- When using `gemini-3.8-flash-tts`, pass `speech_metadata` annotations inside `user_input` content and `response_format: { type: "audio" }`.
