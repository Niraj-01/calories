import { NextResponse } from "next/server";
import { after } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/src/lib/firebaseAdmin";
import {
  parseAnalyzeInput,
  analyzeJobId,
  runAnalyzeFood,
} from "@/src/lib/analyzeFood";

export const runtime = "nodejs";

const JOBS = "analyzeFoodJobs";
const MAX_ATTEMPTS = 3;
// A job left "processing" longer than this is presumed dropped (e.g. the
// instance was recycled before after() finished) and may be re-processed.
const STUCK_MS = 60_000;

function jobRef(id) {
  return adminDb().collection(JOBS).doc(id);
}

// The deferred unit of work. Idempotent: it writes the terminal state with
// merge, so running it more than once (a retry, or a duplicate trigger) lands on
// the same result rather than corrupting the doc.
async function processJob(id, input, apiKey) {
  try {
    const result = await runAnalyzeFood(input, apiKey);
    await jobRef(id).set(
      { status: "done", result, error: null, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  } catch (err) {
    await jobRef(id).set(
      {
        status: "error",
        error: err?.message || "Analysis failed",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing GOOGLE_AI_API_KEY" }, { status: 500 });
  }

  // Validate fast — never enqueue garbage.
  const parsed = parseAnalyzeInput(body);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const input = parsed.input;
  const id = analyzeJobId(input);
  const ref = jobRef(id);

  // Decide whether to (re)enqueue, using a transaction so concurrent duplicate
  // submissions can't both kick off the work.
  const decision = await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();

    if (snap.exists) {
      const job = snap.data();
      const updatedMs = job.updatedAt?.toMillis?.() ?? 0;

      // Already finished → return it without re-running (idempotent dedupe).
      if (job.status === "done") return { action: "return", job };
      // Still running and fresh → another request owns it; just report status.
      if (job.status === "processing" && now - updatedMs < STUCK_MS) {
        return { action: "return", job };
      }
      // Errored but out of retries → terminal failure.
      if (job.status === "error" && (job.attempts || 0) >= MAX_ATTEMPTS) {
        return { action: "return", job };
      }
      // Otherwise it's retryable (errored with budget left, or stuck-processing).
      tx.set(
        ref,
        {
          status: "processing",
          attempts: (job.attempts || 0) + 1,
          error: null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return { action: "process" };
    }

    // Brand new job.
    tx.set(ref, {
      status: "processing",
      attempts: 1,
      result: null,
      error: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { action: "process" };
  });

  if (decision.action === "process") {
    // Return immediately; the slow Gemini call runs after the response is sent.
    after(async () => {
      await processJob(id, input, apiKey);
    });
  }

  const job = decision.job;
  return NextResponse.json(
    {
      jobId: id,
      status: job?.status || "processing",
      ...(job?.status === "done" ? { result: job.result } : {}),
      ...(job?.status === "error" ? { error: job.error } : {}),
    },
    { status: decision.action === "process" ? 202 : 200 },
  );
}
