import type { Mission } from "@/types";

/**
 * Seed missions that populate the in-memory store on first load.
 * The set mirrors the screenshots used as the visual reference.
 *
 * TODO Backend: replace with `GET /api/missions` once the backend is live.
 */
export const seedMissions: Mission[] = [
  {
    id: "m_001",
    title: "Scrape e-commerce pricing data",
    description:
      "We need an automated solution to monitor competitor pricing across major retail platforms. Your agent should extract daily pricing data for 500 specified SKUs from Target.com and Walmart.com. The output must be a clean, structured CSV file matching our internal database schema. High reliability and bypass of basic bot-detection is essential.",
    requirements: [
      "Python script using BeautifulSoup or Scrapy frameworks",
      "Bypass standard rate limiting and bot detection",
      "Output structured CSV matching schema in spec",
      "0% error rate on schema validation",
      "Run end-to-end in under 15 minutes",
    ],
    rewardUsd: 150,
    x402ClaimPriceUsd: 50,
    workerType: "aws_agent",
    status: "open",
    deadline: "2026-05-12",
    createdAt: "2026-05-06T10:00:00Z",
    adminNote:
      "Remember to check the CSV formatting before final approval. The agent reported 99% success rate on SKUs.",
    featured: true,
  },
  {
    id: "m_002",
    title: "Review UI/UX for new beta app",
    description:
      "Senior product designer needed to perform a heuristic evaluation of our beta dashboard. Deliver a written PDF report with at least 8 actionable findings, a severity rating per finding, and annotated screenshots.",
    requirements: [
      "PDF report with at least 8 valid findings",
      "Severity rating per finding (low / med / high)",
      "Annotated screenshots for each finding",
    ],
    rewardUsd: 500,
    x402ClaimPriceUsd: 0,
    workerType: "human",
    status: "claimed",
    deadline: "2026-05-15",
    createdAt: "2026-05-04T14:00:00Z",
    claimedBy: "Reviewer_J. Park",
    claimedAt: "2026-05-05T09:30:00Z",
  },
  {
    id: "m_003",
    title: "Categorize 100 images",
    description:
      "Lightweight tagging task. Apply one of seven pre-defined tags to each of the 100 supplied product images. Suitable for any worker.",
    requirements: [
      "Use the supplied taxonomy of 7 tags",
      "One tag per image, exported as JSON",
      "95%+ inter-rater agreement on the validation subset",
    ],
    rewardUsd: 25,
    x402ClaimPriceUsd: 10,
    workerType: "any",
    status: "approved",
    deadline: "2026-05-08",
    createdAt: "2026-05-02T11:00:00Z",
    claimedBy: "Agent_X_007",
    claimedAt: "2026-05-03T08:00:00Z",
    submittedAt: "2026-05-03T15:00:00Z",
    deliverableUrl: "image_tags_v1.json",
  },
  {
    id: "m_004",
    title: "Generate 10 product blog posts",
    description:
      "Write 10 SEO-optimised blog posts (~800 words each) about emerging fintech products. Each post must pass a plagiarism check.",
    requirements: [
      "10 posts, ~800 words each",
      "Pass standard plagiarism scanner",
      "Include H2/H3 outline and meta description",
    ],
    rewardUsd: 80,
    x402ClaimPriceUsd: 30,
    workerType: "any",
    status: "open",
    deadline: "2026-05-20",
    createdAt: "2026-05-06T09:00:00Z",
  },
  {
    id: "m_005",
    title: "Image classification (1k)",
    description:
      "Classify a batch of 1,000 images into 12 categories with confidence scores. Suitable for ML agents.",
    requirements: [
      "Confidence score per prediction",
      "F1 >= 0.92 on hold-out set",
      "Output as JSONL",
    ],
    rewardUsd: 45,
    x402ClaimPriceUsd: 5,
    workerType: "aws_agent",
    status: "submitted",
    deadline: "2026-05-09",
    createdAt: "2026-05-05T07:00:00Z",
    claimedBy: "Agent_X_011",
    claimedAt: "2026-05-05T07:08:00Z",
    submittedAt: "2026-05-06T08:30:00Z",
    deliverableUrl: "image_classifier_results.jsonl",
  },
  {
    id: "m_006",
    title: "Legacy data migration",
    description:
      "Migrate 5GB of legacy MySQL data into the new Postgres schema with full integrity checks.",
    requirements: [
      "Full row-count parity",
      "Type coercion documented",
      "Rollback script provided",
    ],
    rewardUsd: 5,
    x402ClaimPriceUsd: 50,
    workerType: "aws_agent",
    status: "open",
    deadline: "2026-05-25",
    createdAt: "2026-05-01T10:00:00Z",
  },
];
