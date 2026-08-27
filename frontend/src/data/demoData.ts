// frontend/src/data/demoData.ts
// All demo data for unauthenticated preview mode

export const DEMO_JOBS = [
  {
    id: 'demo-61c02ac4-5385-414e-8bba-95a311d1215c',
    repo_url: 'https://github.com/codewithleo1/selfheal-test-repo',
    status: 'completed',
    pr_url: 'https://github.com/codewithleo1/selfheal-test-repo/pull/17',
    pr_status: 'merged',
    created_at: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
  },
  {
    id: 'demo-a3f9b821-1234-4abc-8def-00112233aabb',
    repo_url: 'https://github.com/acme-corp/payment-service',
    status: 'completed',
    pr_url: 'https://github.com/codewithleo1/selfheal-test-repo/pull/17',
    pr_status: 'open',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'demo-b7e1c933-5678-4fed-9abc-ccddeeff0011',
    repo_url: 'https://github.com/startupxyz/ecommerce-app',
    status: 'completed',
    pr_url: 'https://github.com/codewithleo1/selfheal-test-repo/pull/17',
    pr_status: 'merged',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: 'demo-c9d2e044-9012-4bcd-aef0-112233445566',
    repo_url: 'https://github.com/techco/billing-api',
    status: 'failed',
    pr_url: null,
    pr_status: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'demo-d1f3a155-3456-4cde-bf01-223344556677',
    repo_url: 'https://github.com/devshop/inventory-service',
    status: 'completed',
    pr_url: 'https://github.com/codewithleo1/selfheal-test-repo/pull/17',
    pr_status: 'merged',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
]

export const DEMO_REPOS = [
  { id: 1, full_name: 'codewithleo1/selfheal-test-repo', language: 'Python', pushed_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), private: false, html_url: 'https://github.com/codewithleo1/selfheal-test-repo' },
  { id: 2, full_name: 'acme-corp/payment-service', language: 'Python', pushed_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), private: false, html_url: 'https://github.com/acme-corp/payment-service' },
  { id: 3, full_name: 'startupxyz/ecommerce-app', language: 'TypeScript', pushed_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), private: false, html_url: 'https://github.com/startupxyz/ecommerce-app' },
  { id: 4, full_name: 'techco/billing-api', language: 'Python', pushed_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), private: true, html_url: 'https://github.com/techco/billing-api' },
  { id: 5, full_name: 'devshop/inventory-service', language: 'JavaScript', pushed_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), private: false, html_url: 'https://github.com/devshop/inventory-service' },
]

export const DEMO_INSIGHTS: Record<string, { vendors: string[]; risk_level: 'low' | 'medium' | 'high'; risk_reason: string; suggested_action: string; files_scanned: string[] }> = {
  'https://github.com/codewithleo1/selfheal-test-repo': {
    vendors: ['stripe', 'twilio', 'shopify'],
    risk_level: 'medium',
    risk_reason: 'Multiple third-party API vendors with frequent version updates increase the chance of schema drift.',
    suggested_action: 'Run a health check on your Stripe payment integration — last breaking change 3 months ago.',
    files_scanned: ['requirements.txt', 'stripe_client.py', 'twilio_client.py', 'shopify_client.py'],
  },
  'https://github.com/acme-corp/payment-service': {
    vendors: ['stripe', 'plaid'],
    risk_level: 'high',
    risk_reason: 'Stripe and Plaid both released breaking changes in the last 6 months. High drift risk.',
    suggested_action: 'Immediately audit your Stripe PaymentIntent and Plaid Link token flows.',
    files_scanned: ['requirements.txt', 'payments.py', 'plaid_client.py'],
  },
  'https://github.com/startupxyz/ecommerce-app': {
    vendors: ['shopify', 'sendgrid'],
    risk_level: 'high',
    risk_reason: 'Shopify Admin API versions deprecate every 12 months. Your version may be at end-of-life.',
    suggested_action: 'Migrate to Shopify Admin API 2024-01 — current version likely deprecated.',
    files_scanned: ['package.json', 'shopify.ts', 'email.ts'],
  },
}

export const DEMO_RESULT = {
  jobId: 'demo-61c02ac4-5385-414e-8bba-95a311d1215c',
  repoUrl: 'https://github.com/codewithleo1/selfheal-test-repo',
  prUrl: 'https://github.com/codewithleo1/selfheal-test-repo/pull/17',
  prStatus: 'merged',
  steps: [
    { step: 1, step_name: 'detect', status: 'done', duration: '8s', desc: 'Extract error & endpoint', output: { endpoint: 'POST /v1/payment_intents', vendor: 'stripe', failing_field: 'amount' } },
    { step: 2, step_name: 'search', status: 'done', duration: '10s', desc: 'Locate file & function', output: { file_path: 'utils/stripe_client.py', function_name: 'create_payment_intent' } },
    { step: 3, step_name: 'crawl', status: 'done', duration: '12s', desc: 'Compare API schema', output: { diff_summary: "Field 'amount' renamed to 'amount_total' in PaymentIntent object." } },
    { step: 4, step_name: 'patch', status: 'done', duration: '12s', desc: 'Generate & validate code', output: {} },
    { step: 5, step_name: 'pr', status: 'done', duration: '6s', desc: 'Create Pull Request', output: {} },
  ],
  patchedCode: `def create_payment_intent(amount: int, currency: str) -> dict:
    """Create a payment intent using Stripe API v2."""
    response = httpx.post(
        'https://api.stripe.com/v1/payment_intents',
        headers={'Authorization': 'Bearer sk_test_placeholder'},
        json={
-           'amount': amount * 100,
+           'amount_total': amount * 100,
            'currency': currency,
            'payment_method_types': ['card'],
        },
    )
    return response.json()`,
  summary: "Stripe API changed the field name from **amount** to **amount_total** in PaymentIntent object. The code has been updated to use the new field name and the PR has been merged.",
  breakingChange: "Field 'amount' renamed to 'amount_total' in PaymentIntent object.",
  endpoint: 'POST /v1/payment_intents',
  vendor: 'Stripe',
  filePath: 'utils/stripe_client.py',
  branch: 'selfheal/fix-20260810-154835',
  commit: 'd4f3b2e',
  severity: 'High',
  totalTime: '48s',
}

export const DEMO_STATS = {
  totalJobs: 24,
  successful: 18,
  prsOpened: 16,
  avgTime: '47s',
  repositories: 4,
}