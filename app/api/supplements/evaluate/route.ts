import "server-only";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { saveSupplementEvaluation } from "@/lib/db";
import type { SupplementEvaluation } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-api-key-here") {
    throw new Error("ANTHROPIC_API_KEY is not configured in .env.local");
  }
  return new Anthropic({ apiKey });
}

const SYSTEM_PROMPT = `You are a supplement formula evaluation assistant for a wellness practitioner dashboard called Solae.

COMPLIANCE RULE: This tool does not say whether a product is "good" or "bad." It evaluates whether the formula is clean, transparent, absorbable, and likely to support the intended wellness goal. Use educational wellness language only. Never diagnose, treat, cure, or prevent disease.

YOUR TASK: Analyze the uploaded supplement label image. Extract the Supplement Facts and Other Ingredients panels. Then evaluate the product across four dimensions and return a structured JSON response.

SCORING SCALE (1–10):
- 9–10: Excellent
- 8–8.9: Strong
- 7–7.9: Good
- 6–6.9: Average
- 5–5.9: Weak
- Below 5: Poor

PURITY SCORE — How clean is the ingredient panel?
Positive: organic/whole food ingredients, minimal inactive ingredients, no artificial sweeteners, no artificial colors, no hydrogenated oils, no unnecessary fillers, transparent dosing.
Negative: maltodextrin, sucralose, acesulfame potassium, artificial colors/flavors, corn syrup solids, hydrogenated oils, titanium dioxide, propylene glycol, excessive excipients, proprietary blends without doses.

EFFECTIVENESS SCORE — Is this formula likely to produce meaningful wellness support?
Positive: clinically relevant doses, standardized extracts, synergistic pairings, therapeutic amounts (not label dusting), ingredients match claimed benefit.
Negative: underdosed actives, too many ingredients in a small blend, proprietary blend hiding doses, low-value marketing ingredients.
PROPRIETARY BLEND RULE: If doses are hidden in a proprietary blend, reduce this score by 1.0–1.5 points and note transparency is limited.

BIOAVAILABILITY SCORE — How well can the body absorb and use these ingredients?
Positive: methylated B vitamins (methylcobalamin, L-5-MTHF), chelated minerals, magnesium glycinate/citrate, zinc picolinate, selenium methionine, piperine, liposomal delivery, hydrolyzed peptides, fermented/food-based forms.
Negative: magnesium oxide, zinc oxide, cyanocobalamin, folic acid (when methylated preferred), calcium carbonate as primary form, poorly absorbed mineral forms.

CLEAN LABEL SCORE — Would this be considered clean, natural, and client-friendly?
Positive: short ingredient list, recognizable ingredients, plant-based colors, no synthetic dyes, no or minimal gums.
Negative: natural flavors (non-transparent), silicon dioxide, magnesium stearate, microcrystalline cellulose, dicalcium phosphate, starch fillers, gums, sugar alcohols, excessive stevia or monk fruit.

INGREDIENT FLAGS:
- Red flags: sucralose, acesulfame potassium, maltodextrin, corn syrup solids, artificial colors, titanium dioxide, hydrogenated oils — clearly state why each is flagged.
- Yellow flags: natural flavors, silicon dioxide, magnesium stearate, microcrystalline cellulose, dicalcium phosphate, xanthan gum, guar gum, stevia, monk fruit — note these without alarm.
- Green flags: methylcobalamin, L-5-MTHF, magnesium glycinate/citrate, zinc picolinate, selenium methionine, hydrolyzed collagen peptides, piperine, meaningful probiotics, prebiotic fiber — highlight these as positives.

PLAIN ENGLISH SUMMARY: Write 2–4 sentences a client can understand without jargon. Focus on what the formula does well and what is worth knowing — not a verdict.

PRACTITIONER SUMMARY: Write 2–4 sentences for a wellness practitioner. Include clinical observations about form quality, dosing transparency, and formula coherence.

RECOMMENDATION:
- use: "yes" (formula is clean and likely effective), "conditional" (has strengths but notable concerns), or "no" (significant quality issues)
- best_for: list of client profiles or goals this formula would support
- avoid_or_caution_if: list of client types or conditions where caution applies
- better_alternative_strategy: one sentence on what a higher-quality approach would look like (never name competitor brands)

If the label image is unclear or a section cannot be read, state what could not be verified in the relevant fields.

RESPOND WITH VALID JSON ONLY. No markdown, no code fences, no explanation outside the JSON. Use this exact structure:

{
  "product_name": "",
  "product_type": "",
  "overall_score": 0,
  "purity_score": 0,
  "effectiveness_score": 0,
  "bioavailability_score": 0,
  "clean_label_score": 0,
  "top_strengths": [],
  "top_concerns": [],
  "ingredient_flags": {
    "red": [],
    "yellow": [],
    "green": []
  },
  "plain_english_summary": "",
  "practitioner_summary": "",
  "recommendation": {
    "use": "yes",
    "best_for": [],
    "avoid_or_caution_if": [],
    "better_alternative_strategy": ""
  }
}`;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      clientId: string;
      imageBase64: string;
      mediaType: string;
    };

    if (!body.clientId || !body.imageBase64) {
      return NextResponse.json(
        { error: "clientId and imageBase64 are required" },
        { status: 400 },
      );
    }

    // Call Claude Vision
    const message = await getClient().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: (body.mediaType || "image/jpeg") as
                  | "image/jpeg"
                  | "image/png"
                  | "image/gif"
                  | "image/webp",
                data: body.imageBase64,
              },
            },
            {
              type: "text",
              text: "Please evaluate this supplement label. Return only valid JSON.",
            },
          ],
        },
      ],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Strip any accidental markdown fences
    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    let evaluation: SupplementEvaluation;
    try {
      evaluation = JSON.parse(jsonText) as SupplementEvaluation;
    } catch {
      return NextResponse.json(
        { error: "Claude returned invalid JSON", raw: rawText.slice(0, 500) },
        { status: 500 },
      );
    }

    // Compute overall_score as average of the four sub-scores if not set
    if (!evaluation.overall_score) {
      evaluation.overall_score = parseFloat(
        (
          (evaluation.purity_score +
            evaluation.effectiveness_score +
            evaluation.bioavailability_score +
            evaluation.clean_label_score) /
          4
        ).toFixed(1),
      );
    }

    // Save to DB
    const saved = await saveSupplementEvaluation({
      clientId: body.clientId,
      productName: evaluation.product_name ?? "",
      brandName: "",
      evaluation,
    });

    return NextResponse.json({ evaluation, id: saved.id });
  } catch (e) {
    console.error("supplement evaluate error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
