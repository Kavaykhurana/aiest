import { NextResponse } from "next/server"

import { getReviewerId } from "@/lib/reviewer"
import { createClient } from "@/lib/supabase/server"

interface CaseRouteProps {
  params: {
    id: string
  }
}

export async function PATCH(request: Request, { params }: CaseRouteProps) {
  const supabase = createClient()
  const body = await request.json()
  const reviewStatus = body.review_status

  if (!["validated", "rejected"].includes(reviewStatus)) {
    return NextResponse.json({ error: "Invalid review status." }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("cases")
    .update({
      review_status: reviewStatus,
      reviewer_note: body.reviewer_note ?? null,
      reviewed_at: body.reviewed_at,
    })
    .eq("id", params.id)
    .eq("reviewer_id", getReviewerId())
    .select("*")
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 })
  }

  return NextResponse.json({ case: data })
}
