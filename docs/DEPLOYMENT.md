# OpsCrew deployment preparation

Prepared for S1 on 2026-10-09. Local development is approved. The first new paid resource, billing change, or chargeable cloud deployment still requires the project owner's confirmation of the actual project, region, resource configuration, and budget. The commands below are a runbook for that approved future action; they have not been executed as part of this preparation.

The current workstation has Node 24 but no detected Docker or Google Cloud CLI. No container build, registry upload, cloud deployment, new cloud Gemini call, Firebase setup, or Firestore write is claimed here. Local test results belong in the S1 acceptance report. An AI Studio development preview does not establish a formal deployed contest endpoint.

## Resource and cost proposal

Use one confirmed Google Cloud project. `asia-southeast1` (Singapore) is the preferred candidate, subject to the owner's existing project, organization policy, service availability, data location, and actual pricing. It is a Cloud Run region; this does not establish that the selected Gemini API account/model is available or billed in that region. Confirm model access and price separately before the real call. [Cloud Run regions](https://docs.cloud.google.com/run/docs/deploying#cloud_run_locations)

| Resource | S1 proposal | Later change |
| --- | --- | --- |
| Cloud Run | One private `opscrew-s1` service; service minimum 0, maximum 1; 1 CPU; 512 MiB; request-based CPU allocation; concurrency 4; request timeout 60 seconds | Public judge entry only after S3 identity isolation and S4 abuse limits pass |
| Artifact Registry | One Docker repository in the confirmed region; commit-based release tags and immutable image digests recorded | Retain reviewed release images; review cleanup rules |
| Cloud Build | Manually submitted Docker build with a dedicated builder identity | No automatic trigger in S1 |
| Cloud Storage | One private regional bucket for build source and build logs | Review retention after release; never store secrets here |
| Secret Manager | One server Gemini key secret with a pinned numeric version | Rotate through a newly tested revision |
| Runtime identity | Dedicated service account; Secret Accessor on this one secret | Add only separately reviewed permissions needed by S3 |
| Gemini Developer API | Official `@google/genai`; default `gemini-3.1-flash-lite`; one initial synthetic call after approval | No automatic model upgrade |
| Firebase Authentication / Firestore | Not provisioned or enabled by this S1 runbook | S3 has a separate identity/data/location plan |

USD 40 for 2026-10-08 through 2026-11-06 is the user-approved combined management target, covering model calls, compute, builds, image storage, secrets, logs, and later database use. The concrete first paid-resource configuration still requires confirmation. This target is not a price quote or guaranteed cap. Confirm the applicable account currency, current service prices, free-tier eligibility, and existing credits. Propose project-scoped actual-cost alerts at 50%, 75%, 90%, and 100%, plus a forecast alert. Alerts-only budgets do not stop usage or billing; reporting can be delayed. Check any service-specific spend cap's coverage before relying on it. [Google Cloud budget behavior](https://docs.cloud.google.com/billing/docs/how-to/budgets)

Minimum 0 and maximum 1 reduce exposure but do not enforce a dollar limit. S1 access is restricted to named testers; per-user quotas and a global daily model limit remain S4 work. Before public access, verify those limits and a way to pause analysis. Extra services or spend beyond the approved amount require a new approval. Re-estimate maintenance at submission and any finalist extension.

## Local production verification

Run these from `aistudio-export-2026-10-07`, using Node 24 and npm 11:

```powershell
npm ci
npm test
npm run lint
npm run build
npm run smoke:production
```

The formal smoke script starts its own `node server.ts` process in production on a reserved ephemeral port. It supplies no API keys, uses the operating system null device for dotenv, and inherits only essential process environment values. It checks root HTML, a built JavaScript asset, a nested SPA refresh, `/api/health`, non-sensitive `/api/config`, a JSON `MISSING_API_KEY` error, and a JSON unknown-API 404. It makes only local requests and always stops the child it created, including after failure. It never locates or terminates a process by port or name. Run the build first; a Vite development server or `vite preview` does not verify the production backend.

The Dockerfile uses the [official Node image](https://hub.docker.com/_/node), pinned to `node:24-bookworm-slim`. The build stage installs from the lockfile, builds the frontend, and prunes development dependencies. The runtime copies the production dependency tree, `server.ts`, `server/`, `src/domain/`, and `dist/`, and runs as the `node` user. Node 24 executes erasable TypeScript directly; there is no runtime `tsx` dependency. Continue running the type check separately. [Node 24 TypeScript support](https://nodejs.org/docs/latest-v24.x/api/typescript.html)

The major-version image tag receives updates, so it is not a digest-locked toolchain. Record the resolved base digest, Node/npm versions, lockfile hash, source commit, image digest, and Cloud Run revision at release. `.dockerignore` excludes environment files (including examples), common credential files, local dependencies, build output, fixtures, tests, and caches. Never pass a secret as a Docker build argument or a `VITE_` environment variable. The production dependency tree currently retains Vite because it is declared as a dependency; the server imports it only outside production.

When Docker is available, this optional local check needs no key:

```powershell
docker build --pull --platform=linux/amd64 --tag opscrew:s1 .
docker run --rm --publish 127.0.0.1:8080:8080 --env GEMINI_API_KEY= opscrew:s1
# In a second terminal: Invoke-RestMethod http://127.0.0.1:8080/api/health
# Stop this foreground container with Ctrl+C after checking it.
```

## Cloud prerequisites and identities

Install the current Google Cloud CLI only when the cloud step is authorized, or use an approved Cloud Shell environment. The following commands use PowerShell 7.3 or later. If login, consent, billing setup, or verification needs human input, stop immediately for the owner. Login status is valid only for the current session and must be rechecked later. Do not download a service account JSON key.

Separate the provisioning administrator, human build/deploy operator, builder service account, and runtime service account. For an existing container deployment, Google documents Cloud Run Developer, Service Account User on the runtime identity, and Artifact Registry Reader on the image repository. This runbook also configures secrets and service IAM, for which Cloud Run Admin is the documented role. Initial service creation requires project-level scope; narrow ongoing permissions after the service exists. [Container deployment roles](https://docs.cloud.google.com/run/docs/deploying#required_roles), [secret configuration roles](https://docs.cloud.google.com/run/docs/configuring/services/secrets#required_roles)

| Principal | Required permissions for these commands |
| --- | --- |
| Provisioning administrator | Enable APIs (`serviceusage.services.enable`); create/manage the selected repository, bucket, secret, and service accounts; set the resource IAM policies below and the operator's project roles. Use scoped administrative roles/custom permissions for these actions; the runtime receives none of them. Billing linkage is a separate owner-approved action. |
| Human operator | Cloud Build Editor and Service Usage Consumer on the project; Service Account User on the builder and runtime service accounts; Artifact Registry Reader on this repository; Storage Object Admin on this build bucket for source upload and log access; Cloud Run Admin for initial service/secret configuration and tester IAM. Read-only project discovery may also require the organization's assigned viewer permissions. |
| Builder service account | Artifact Registry Writer on this repository; Storage Object Admin on this source/log bucket. It does not deploy Cloud Run or access Gemini secrets. |
| Runtime service account | Secret Manager Secret Accessor on the single Gemini secret. No project Editor, builder, storage, Firebase, or database role in S1. |
| Named tester | Cloud Run Invoker on this one service. This authenticates the early infrastructure smoke; it is not S3 application identity isolation. |

Cloud Build's default identity depends on project configuration, so this runbook specifies its own builder. A user-managed builder must write logs to a user-owned bucket or Cloud Logging; the commands use the explicit private build bucket for both source and logs. Keep Google's managed Cloud Build/Cloud Run service-agent roles intact, but do not grant those roles to the runtime account. [User-managed build identities and log requirements](https://docs.cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts), [Cloud Build permissions](https://docs.cloud.google.com/build/docs/iam-roles-permissions)

Cloud Run uses the attached runtime service identity for Google Cloud credentials (ADC); Secret Manager supplies `GEMINI_API_KEY` to the server environment at startup. The current Gemini Developer API SDK call still authenticates with that key, not ADC. ADC is for Google Cloud access and later server clients; neither case needs a downloaded JSON credential or `GOOGLE_APPLICATION_CREDENTIALS` in Cloud Run. [Cloud Run service identity](https://docs.cloud.google.com/run/docs/configuring/services/service-identity)

## Approved future provisioning

First fill in and review the values. Every cloud command names its project explicitly. The fail-fast settings require PowerShell 7.3+ and prevent a failed native command from silently continuing.

```powershell
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$ProjectId = 'YOUR_PROJECT_ID'
$Region = 'YOUR_CONFIRMED_REGION' # Candidate: asia-southeast1; confirm first.
$OperatorEmail = 'YOUR_OPERATOR_EMAIL'
$TesterEmail = 'YOUR_TESTER_EMAIL'
$Service = 'opscrew-s1'
$Repository = 'opscrew'
$SecretName = 'opscrew-gemini-api-key'
$RuntimeName = 'opscrew-runtime'
$BuilderName = 'opscrew-builder'
$RuntimeSa = "$RuntimeName@$ProjectId.iam.gserviceaccount.com"
$BuilderSa = "$BuilderName@$ProjectId.iam.gserviceaccount.com"
$BuildBucket = "$ProjectId-opscrew-builds-$Region" # Confirm global uniqueness.
if ($ProjectId -like 'YOUR_*' -or $Region -like 'YOUR_*' -or
    $OperatorEmail -like 'YOUR_*' -or $TesterEmail -like 'YOUR_*') {
    throw 'Replace and review all project, region, and identity placeholders first.'
}
gcloud auth list
gcloud projects describe $ProjectId
gcloud billing projects describe $ProjectId
```

After the owner confirms the actual paid resource configuration, the provisioning administrator can perform the one-time setup below. Do not re-run creation blindly against existing resources; inspect and reuse matching resources. Confirm permissions separately for every principal.

```powershell
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com iam.googleapis.com storage.googleapis.com generativelanguage.googleapis.com --project=$ProjectId
gcloud iam service-accounts create $RuntimeName --display-name='OpsCrew runtime' --project=$ProjectId
gcloud iam service-accounts create $BuilderName --display-name='OpsCrew image builder' --project=$ProjectId
gcloud artifacts repositories create $Repository --repository-format=docker --location=$Region --project=$ProjectId
gcloud storage buckets create "gs://$BuildBucket" --location=$Region --uniform-bucket-level-access --public-access-prevention --project=$ProjectId
gcloud secrets create $SecretName --replication-policy=user-managed --locations=$Region --project=$ProjectId
gcloud secrets add-iam-policy-binding $SecretName "--member=serviceAccount:$RuntimeSa" --role=roles/secretmanager.secretAccessor --project=$ProjectId
gcloud artifacts repositories add-iam-policy-binding $Repository --location=$Region "--member=serviceAccount:$BuilderSa" --role=roles/artifactregistry.writer --project=$ProjectId
gcloud storage buckets add-iam-policy-binding "gs://$BuildBucket" "--member=serviceAccount:$BuilderSa" --role=roles/storage.objectAdmin --project=$ProjectId
gcloud storage buckets add-iam-policy-binding "gs://$BuildBucket" "--member=user:$OperatorEmail" --role=roles/storage.objectAdmin --project=$ProjectId
gcloud artifacts repositories add-iam-policy-binding $Repository --location=$Region "--member=user:$OperatorEmail" --role=roles/artifactregistry.reader --project=$ProjectId
gcloud iam service-accounts add-iam-policy-binding $BuilderSa "--member=user:$OperatorEmail" --role=roles/iam.serviceAccountUser --project=$ProjectId
gcloud iam service-accounts add-iam-policy-binding $RuntimeSa "--member=user:$OperatorEmail" --role=roles/iam.serviceAccountUser --project=$ProjectId
foreach ($OperatorRole in @('roles/cloudbuild.builds.editor', 'roles/serviceusage.serviceUsageConsumer', 'roles/run.admin')) {
    gcloud projects add-iam-policy-binding $ProjectId "--member=user:$OperatorEmail" "--role=$OperatorRole"
}
```

The owner creates/imports the valid Gemini Developer API key into a new Secret Manager version through an approved secret input interface. Do not paste it into this document, a terminal command, chat, a repository file, build output, or an image. Record only the secret name and numeric version. Confirm `gemini-3.1-flash-lite` access, quotas, billing status, and current price in that account before the live smoke.

## Build and private deployment after approval

From the reviewed, clean application checkout, complete local verification, then submit this Docker build. The upload explicitly uses `.dockerignore`; Docker's exclusions alone would not control the Cloud Build source upload. [Cloud Build upload and logging flags](https://docs.cloud.google.com/sdk/gcloud/reference/builds/submit)

Resolve the image's SHA-256 digest with `image_summary.digest`, validate its shape, and deploy the `@sha256:` reference below. Commit-based tags help identify a release; this repository setup does not enforce tag immutability. [Google's Artifact Registry digest lookup](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/about-container-images#artifact_registry)

```powershell
if (git status --porcelain) { throw 'Commit or review local changes before creating a release image.' }
$Commit = (git rev-parse --short=12 HEAD).Trim()
$Image = "$Region-docker.pkg.dev/$ProjectId/$Repository/opscrew:$Commit"
$BuildArgs = @(
    'builds', 'submit', '.', "--project=$ProjectId", "--region=$Region",
    "--tag=$Image", "--service-account=projects/$ProjectId/serviceAccounts/$BuilderSa",
    '--ignore-file=.dockerignore', "--gcs-source-staging-dir=gs://$BuildBucket/source",
    "--gcs-log-dir=gs://$BuildBucket/logs"
)
gcloud @BuildArgs
$Digest = (gcloud artifacts docker images describe $Image --project=$ProjectId --format='value(image_summary.digest)').Trim()
if ($Digest -notmatch '^sha256:[a-f0-9]{64}$') { throw 'No verified image digest returned.' }
$ImageByDigest = "$Region-docker.pkg.dev/$ProjectId/$Repository/opscrew@$Digest"
$SecretVersion = 'REPLACE_WITH_NUMERIC_SECRET_VERSION'
if ($SecretVersion -notmatch '^\d+$') { throw 'Pin the verified numeric secret version.' }
$DeployArgs = @(
    'run', 'deploy', $Service, "--project=$ProjectId", "--region=$Region",
    "--image=$ImageByDigest", "--service-account=$RuntimeSa", '--port=8080',
    '--min=0', '--max=1', '--cpu=1', '--memory=512Mi', '--concurrency=4',
    '--timeout=60s', '--cpu-throttling', '--no-cpu-boost',
    '--ingress=all', '--invoker-iam-check', '--no-allow-unauthenticated',
    '--set-env-vars=NODE_ENV=production,GEMINI_MODEL=gemini-3.1-flash-lite',
    "--set-secrets=GEMINI_API_KEY=${SecretName}:$SecretVersion"
)
gcloud @DeployArgs
gcloud run services add-iam-policy-binding $Service "--member=user:$TesterEmail" --role=roles/run.invoker --region=$Region --project=$ProjectId
gcloud run services get-iam-policy $Service --region=$Region --project=$ProjectId
$ServiceUrl = (gcloud run services describe $Service --region=$Region --project=$ProjectId --format='value(status.url)').Trim()
$Revision = (gcloud run services describe $Service --region=$Region --project=$ProjectId --format='value(status.latestReadyRevisionName)').Trim()
```

This uses service-level min/max scaling and keeps the invoker IAM check enabled. Internet ingress allows the named testers to reach the endpoint; it does not grant anonymous access. Verify no `allUsers`/`allAuthenticatedUsers` invoker binding is present, including any inherited project grant. The 60-second platform timeout contains the current bounded application request; it is not a claim about measured model latency. [Deployment flag definitions](https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy)

## Actual cloud smoke and evidence

The named tester signs in through their approved gcloud session. A private service's infrastructure authentication failure can be a platform-generated HTML 403, so first supply a valid identity token. Keep tokens in memory only. Google also supports its authenticated local proxy for browser checks in a supported shell; the direct PowerShell requests below avoid requiring that proxy on Windows. [Testing private Cloud Run services](https://docs.cloud.google.com/run/docs/authenticating/developers#test_your_private_service)

```powershell
$IdentityToken = (gcloud auth print-identity-token).Trim()
$Headers = @{ Authorization = "Bearer $IdentityToken" }
try {
    $Page = Invoke-WebRequest "$ServiceUrl/" -Headers $Headers -TimeoutSec 65
    if ($Page.StatusCode -ne 200 -or $Page.Headers['Content-Type'] -notmatch 'text/html') { throw 'Root HTML failed.' }
    $AssetPath = [regex]::Match($Page.Content, '<script\b[^>]*\bsrc=["'']([^"'']+)["'']').Groups[1].Value
    if ($AssetPath -notmatch '^/assets/') { throw 'Built JavaScript asset missing.' }
    $Asset = Invoke-WebRequest "$ServiceUrl$AssetPath" -Headers $Headers -TimeoutSec 65
    if ($Asset.StatusCode -ne 200 -or $Asset.Headers['Content-Type'] -notmatch 'javascript') { throw 'Static asset failed.' }
    $Refresh = Invoke-WebRequest "$ServiceUrl/smoke/refresh/check" -Headers $Headers -TimeoutSec 65
    if ($Refresh.Content -ne $Page.Content) { throw 'SPA refresh failed.' }
    $Health = Invoke-WebRequest "$ServiceUrl/api/health" -Headers $Headers -TimeoutSec 65
    $Config = Invoke-WebRequest "$ServiceUrl/api/config" -Headers $Headers -TimeoutSec 65
    foreach ($JsonResponse in @($Health, $Config)) {
        if ($JsonResponse.StatusCode -ne 200 -or $JsonResponse.Headers['Content-Type'] -notmatch 'application/json') { throw 'Health/config JSON failed.' }
        if (-not ($JsonResponse.Content | ConvertFrom-Json).ok) { throw 'Health/config reported failure.' }
    }
    if (-not ($Config.Content | ConvertFrom-Json).api_key_configured) { throw 'Server secret unavailable.' }
    $Unknown = Invoke-WebRequest "$ServiceUrl/api/smoke-route-that-does-not-exist" -Headers $Headers -SkipHttpErrorCheck -TimeoutSec 65
    if ($Unknown.StatusCode -ne 404 -or $Unknown.Headers['Content-Type'] -notmatch 'application/json' -or
        ($Unknown.Content | ConvertFrom-Json).error.code -ne 'API_ROUTE_NOT_FOUND') { throw 'Unknown API JSON failed.' }
    $SyntheticInput = @{
        description = 'Synthetic expense: EMP-1042 spent $125.50 on a team meal; the receipt is missing.'
        amount_usd = '125.50'; receipt_status = 'missing'; employee_identifier = 'EMP-1042'
        model_id = 'gemini-3.1-flash-lite'
    } | ConvertTo-Json
    $Live = Invoke-WebRequest "$ServiceUrl/api/analyze" -Method Post -Headers $Headers -ContentType 'application/json' -Body $SyntheticInput -SkipHttpErrorCheck -TimeoutSec 65
    if ($Live.Headers['Content-Type'] -notmatch 'application/json') { throw 'Analysis did not return JSON.' }
    $Result = $Live.Content | ConvertFrom-Json
    $Result # Save this synthetic result/error as evidence; never save the auth headers.
    if ($Live.StatusCode -ne 200 -or -not $Result.ok -or $Result.upstream_status -ne 200) { throw 'Live Gemini acceptance failed; retain the actual failure.' }
} finally {
    $Headers.Clear()
    Remove-Variable IdentityToken -ErrorAction SilentlyContinue
}
```

Record every attempted live call, actual model/version, run ID, HTTP/upstream status, token usage where returned, elapsed time, and failure details. Also record source commit, image digest, build ID, runtime identity, region, secret version (never its value), service URL, ready revision, IAM check, and the anonymous-denial observation. Health checks establish that the process serves JSON; they do not establish Gemini availability or database correctness. G1's cloud check remains blocked until these steps really run and the synthetic Gemini request succeeds.

Before S4 public release, complete S3 Firebase token verification, visitor isolation, authorization binding, idempotent Firestore creation/readback, and S4 quotas/recovery checks. This runbook intentionally has no command that grants public access. The final judge URL must work without a private team Google login while business APIs still enforce the application's demo-session rules.

For a later rollback, choose a previously accepted ready revision and direct traffic to it; first inspect the selected revision's image, pinned secret version, and compatibility. Do not invent a known-good revision for the first deployment:

```powershell
$KnownGoodRevision = 'REPLACE_WITH_ACCEPTED_REVISION'
if ($KnownGoodRevision -like 'REPLACE_*') { throw 'Select an actually accepted revision first.' }
gcloud run services update-traffic $Service "--to-revisions=${KnownGoodRevision}=100" --region=$Region --project=$ProjectId
```

Run the same smoke checks after rollback. An S4 rollback drill and final public end-to-end test still require separate recorded evidence.
