const DEFAULT_REVIEWER_ID = "00000000-0000-0000-0000-000000000001"
const DEFAULT_REVIEWER_NAME = "Dr. Test"

export function getReviewerId() {
  return process.env.NEXT_PUBLIC_REVIEWER_ID || DEFAULT_REVIEWER_ID
}

export function getReviewerName() {
  return process.env.NEXT_PUBLIC_REVIEWER_NAME || DEFAULT_REVIEWER_NAME
}
