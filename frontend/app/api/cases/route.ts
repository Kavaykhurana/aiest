import { NextResponse } from "next/server"

import { getReviewerId } from "@/lib/reviewer"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("reviewer_id", getReviewerId())
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ cases: data })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const body = await request.json()
  const { data, error } = await supabase
    .from("cases")
    .insert({
      reviewer_id: getReviewerId(),
      patient_ref: body.patient_ref ?? null,
      image_url: body.image_url,
      gradcam_url: body.gradcam_url ?? null,
      prediction: body.prediction,
      confidence: body.confidence,
    })
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ case: data }, { status: 201 })
}
