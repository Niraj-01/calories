import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebaseAdmin";

export const runtime = "nodejs";

const JOBS = "analyzeFoodJobs";

// Status endpoint the client polls until the job reaches a terminal state.
export async function GET(_request, { params }) {
  const { jobId } = await params;
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const snap = await adminDb().collection(JOBS).doc(jobId).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const job = snap.data();
  return NextResponse.json({
    jobId,
    status: job.status, // "processing" | "done" | "error"
    ...(job.status === "done" ? { result: job.result } : {}),
    ...(job.status === "error" ? { error: job.error } : {}),
  });
}
