#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
    echo "Usage: $0 <s3-bucket> <aws-region> [--dry-run]" >&2
    exit 1
fi

S3_BUCKET="$1"
AWS_REGION="$2"
DRY_RUN="${3:-}"

if [[ -n "$DRY_RUN" && "$DRY_RUN" != "--dry-run" ]]; then
    echo "Unknown option: $DRY_RUN" >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="$PROJECT_ROOT/out"

if [[ ! -d "$OUT_DIR" ]]; then
    echo "Static export directory '$OUT_DIR' not found." >&2
    exit 1
fi

while IFS= read -r -d '' html_file; do
    rel_path="${html_file#"$OUT_DIR"/}"
    if [[ "$rel_path" == "index.html" ]]; then
        continue
    fi

    directory="${rel_path%/index.html}"
    if [[ "$directory" == "$rel_path" ]]; then
        continue
    fi

    object_key="$directory/"
    echo "Uploading /$object_key"
    if [[ "$DRY_RUN" == "--dry-run" ]]; then
        continue
    fi

    aws s3api put-object \
        --bucket "$S3_BUCKET" \
        --key "$object_key" \
        --body "$html_file" \
        --content-type "text/html" \
        --cache-control "public, max-age=0, must-revalidate" \
        --region "$AWS_REGION" \
        >/dev/null
done < <(find "$OUT_DIR" -type f -name "index.html" -print0)
