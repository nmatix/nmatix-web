#!/usr/bin/env bash
# ==============================================================================
# Script: deploy-s3.sh
# Project: nmatix-www
# Purpose: Build Next.js static export and deploy to AWS S3 & CloudFront
#          Supports deploying to either 'dev' or 'prod' environments.
# ==============================================================================

set -euo pipefail

# Text colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load .env.local if present
if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
    log_info "Loading environment from .env.local..."
    set -a
    # shellcheck disable=SC1091
    source <(grep -v '^#' "$PROJECT_ROOT/.env.local" | grep -v '^[[:space:]]*$') || true
    set +a
fi

# Defaults
DEFAULT_REGION="ap-south-2"
DEFAULT_PROD_STACK="WebsiteStorageStack"
DEFAULT_DEV_STACK="Dev-WebsiteStorageStack"
DEFAULT_PROD_BUCKET="websitestoragestack-websitebucket75c24d94-crmpbwgbdoqa"
DEFAULT_PROD_DISTRIBUTION="E2TOEX67S5KWII"

AWS_REGION="${AWS_REGION:-$DEFAULT_REGION}"
ENVIRONMENT="${ENVIRONMENT:-}"
STACK_NAME="${STACK_NAME:-}"
S3_BUCKET="${S3_BUCKET:-}"
DISTRIBUTION_ID="${DISTRIBUTION_ID:-}"
SKIP_BUILD=false
DRY_RUN=false

# Parse command line options and environment argument
while [[ $# -gt 0 ]]; do
    case "$1" in
        dev|prod)
            ENVIRONMENT="$1"
            shift
            ;;
        -e|--env|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --stack)
            STACK_NAME="$2"
            shift 2
            ;;
        --bucket)
            S3_BUCKET="$2"
            shift 2
            ;;
        --distribution)
            DISTRIBUTION_ID="$2"
            shift 2
            ;;
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            echo "Usage: npm run deploy [-- <env>] OR npm run deploy:<env> OR ./scripts/deploy-s3.sh [env] [options]"
            echo ""
            echo "Environments:"
            echo "  dev                   Deploy to dev environment (Dev-WebsiteStorageStack)"
            echo "  prod                  Deploy to prod environment (WebsiteStorageStack)"
            echo ""
            echo "Options:"
            echo "  -e, --env <env>       Target environment ('dev' or 'prod', default: dev)"
            echo "  --stack <name>        CloudFormation stack name (overrides auto-detection)"
            echo "  --bucket <name>       S3 bucket name (auto-detected from CloudFormation if omitted)"
            echo "  --distribution <id>   CloudFront distribution ID (auto-detected from CloudFormation if omitted)"
            echo "  --region <region>     AWS Region (default: ap-south-2)"
            echo "  --skip-build          Skip npm run build, sync existing out/ directory directly"
            echo "  --dry-run             Show S3 sync operations without executing them"
            echo "  -h, --help            Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option or argument: $1"
            echo "Run './scripts/deploy-s3.sh --help' for usage."
            exit 1
            ;;
    esac
done

# Default to 'dev' if no environment was specified
if [[ -z "$ENVIRONMENT" ]]; then
    ENVIRONMENT="dev"
    log_info "No environment specified; defaulting to '$ENVIRONMENT'."
fi

# Validate environment
case "$ENVIRONMENT" in
    dev|prod)
        ;;
    *)
        log_error "Invalid environment: '$ENVIRONMENT'. Must be 'dev' or 'prod'."
        exit 1
        ;;
esac

# Resolve stack name based on environment if not explicitly overridden
if [[ -z "$STACK_NAME" ]]; then
    if [[ "$ENVIRONMENT" == "dev" ]]; then
        STACK_NAME="$DEFAULT_DEV_STACK"
    else
        STACK_NAME="$DEFAULT_PROD_STACK"
    fi
fi

log_info "Target Environment: ${GREEN}$ENVIRONMENT${NC}"
log_info "Target Stack:       ${BLUE}$STACK_NAME${NC}"

cd "$PROJECT_ROOT"

# 1. Check Prerequisites
command -v aws >/dev/null 2>&1 || { log_error "AWS CLI is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { log_error "npm is required but not installed."; exit 1; }

# Verify AWS credentials
log_info "Verifying AWS credentials..."
if ! aws sts get-caller-identity --region "$AWS_REGION" >/dev/null 2>&1; then
    log_error "Unable to authenticate with AWS. Please configure your AWS credentials."
    exit 1
fi

# 2. Retrieve S3 Bucket & CloudFront Distribution ID if not specified
if [[ -z "$S3_BUCKET" ]]; then
    log_info "Querying CloudFormation stack '$STACK_NAME' for WebsiteBucketName..."
    S3_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" \
        --output text 2>/dev/null || true)

    if [[ -z "$S3_BUCKET" || "$S3_BUCKET" == "None" ]]; then
        if [[ "$ENVIRONMENT" == "prod" ]]; then
            S3_BUCKET="$DEFAULT_PROD_BUCKET"
            log_warn "Could not fetch output from CloudFormation. Using default prod bucket: $S3_BUCKET"
        else
            log_error "Could not resolve S3 bucket from CloudFormation stack '$STACK_NAME'."
            log_error "Ensure the dev stack has been deployed with: cdk deploy Dev-WebsiteStorageStack"
            exit 1
        fi
    else
        log_success "Found S3 Bucket: $S3_BUCKET"
    fi
fi

if [[ -z "$DISTRIBUTION_ID" ]]; then
    log_info "Querying CloudFormation stack '$STACK_NAME' for CloudFrontDistributionId..."
    DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
        --output text 2>/dev/null || true)

    if [[ -z "$DISTRIBUTION_ID" || "$DISTRIBUTION_ID" == "None" ]]; then
        if [[ "$ENVIRONMENT" == "prod" ]]; then
            DISTRIBUTION_ID="$DEFAULT_PROD_DISTRIBUTION"
            log_warn "Could not fetch output from CloudFormation. Using default prod Distribution ID: $DISTRIBUTION_ID"
        else
            log_warn "Could not resolve CloudFront Distribution from CloudFormation stack '$STACK_NAME'. CloudFront cache invalidation will be skipped."
            DISTRIBUTION_ID=""
        fi
    else
        log_success "Found CloudFront Distribution: $DISTRIBUTION_ID"
    fi
fi

# 3. Build Next.js Static Export
if [[ "$SKIP_BUILD" = false ]]; then
    log_info "Verifying next.config.mjs configuration..."
    if ! grep -q "output:[[:space:]]*['\"]export['\"]" next.config.mjs next.config.js 2>/dev/null; then
        log_warn "Neither next.config.mjs nor next.config.js appears to have output: 'export'."
        log_warn "Please ensure output: 'export' is configured so that static files are written to out/."
    fi

    if [[ ! -d "node_modules" ]]; then
        log_info "Installing dependencies..."
        npm install
    fi

    log_info "Building Next.js static export for [$ENVIRONMENT]..."
    npm run build
fi

OUT_DIR="$PROJECT_ROOT/out"
if [[ ! -d "$OUT_DIR" ]]; then
    log_error "Static output directory '$OUT_DIR' not found. Ensure next.config.mjs contains: output: 'export'"
    exit 1
fi

log_success "Static export directory confirmed: $OUT_DIR"

DRY_RUN_FLAG=""
if [[ "$DRY_RUN" = true ]]; then
    DRY_RUN_FLAG="--dry-run"
    log_warn "Running in DRY-RUN mode. No files will be modified."
fi

# 4. Sync to S3 with optimized caching headers
log_info "1/3 Uploading immutable static assets (_next/static)..."
if [[ -d "$OUT_DIR/_next" ]]; then
    aws s3 sync "$OUT_DIR/_next" "s3://$S3_BUCKET/_next" \
        --region "$AWS_REGION" \
        --cache-control "public, max-age=31536000, immutable" \
        $DRY_RUN_FLAG
fi

log_info "2/3 Uploading public media/images..."
if [[ -d "$OUT_DIR/images" ]]; then
    aws s3 sync "$OUT_DIR/images" "s3://$S3_BUCKET/images" \
        --region "$AWS_REGION" \
        --cache-control "public, max-age=86400" \
        $DRY_RUN_FLAG
fi

log_info "3/3 Uploading HTML, root files, and syncing deletions..."
aws s3 sync "$OUT_DIR" "s3://$S3_BUCKET" \
    --region "$AWS_REGION" \
    --exclude "_next/*" \
    --exclude "images/*" \
    --cache-control "public, max-age=0, must-revalidate" \
    --delete \
    $DRY_RUN_FLAG

# 5. Clean URL support for direct browser access / page refreshes
log_info "Ensuring clean URL support for subpages..."
while IFS= read -r html_file; do
    rel_path="${html_file#$OUT_DIR/}"
    
    # Handle /page/index.html -> key "page"
    if [[ "$rel_path" == */index.html && "$rel_path" != "index.html" ]]; then
        clean_key="${rel_path%/index.html}"
        log_info "  Mapping clean URL: /$clean_key"
        aws s3 cp "$html_file" "s3://$S3_BUCKET/$clean_key" \
            --region "$AWS_REGION" \
            --content-type "text/html" \
            --cache-control "public, max-age=0, must-revalidate" \
            $DRY_RUN_FLAG >/dev/null
    # Handle /page.html -> key "page"
    elif [[ "$rel_path" == *.html && "$rel_path" != "index.html" && "$rel_path" != "404.html" ]]; then
        clean_key="${rel_path%.html}"
        log_info "  Mapping clean URL: /$clean_key"
        aws s3 cp "$html_file" "s3://$S3_BUCKET/$clean_key" \
            --region "$AWS_REGION" \
            --content-type "text/html" \
            --cache-control "public, max-age=0, must-revalidate" \
            $DRY_RUN_FLAG >/dev/null
    fi
done < <(find "$OUT_DIR" -type f -name "*.html")

# Publish directory index files at their exact trailing-slash request paths.
log_info "Uploading trailing-slash route pages..."
if [[ "$DRY_RUN" = true ]]; then
    bash "$SCRIPT_DIR/upload-directory-indexes.sh" "$S3_BUCKET" "$AWS_REGION" --dry-run
else
    bash "$SCRIPT_DIR/upload-directory-indexes.sh" "$S3_BUCKET" "$AWS_REGION"
fi

# 6. CloudFront Cache Invalidation
if [[ "$DRY_RUN" = false && -n "$DISTRIBUTION_ID" ]]; then
    log_info "Invalidating CloudFront cache for distribution: $DISTRIBUTION_ID..."
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$DISTRIBUTION_ID" \
        --paths "/*" \
        --query "Invalidation.Id" \
        --output text)
    log_success "CloudFront invalidation created (ID: $INVALIDATION_ID)"
fi

# 7. Summary
CF_DOMAIN=""
if [[ -n "$DISTRIBUTION_ID" ]]; then
    CF_DOMAIN=$(aws cloudfront get-distribution \
        --id "$DISTRIBUTION_ID" \
        --query "Distribution.DomainName" \
        --output text 2>/dev/null || true)
fi

echo ""
echo "================================================================="
log_success "Deployment to [$ENVIRONMENT] Complete!"
echo "  • Environment:            $ENVIRONMENT"
echo "  • Stack:                  $STACK_NAME"
echo "  • S3 Bucket:              s3://$S3_BUCKET"
if [[ -n "$DISTRIBUTION_ID" ]]; then
    echo "  • CloudFront ID:          $DISTRIBUTION_ID"
    if [[ -n "$CF_DOMAIN" && "$CF_DOMAIN" != "None" ]]; then
        echo "  • CloudFront URL:         https://$CF_DOMAIN"
        echo "  • Form Service Endpoint:  https://$CF_DOMAIN/api/form/submit"
    fi
fi
echo "================================================================="
