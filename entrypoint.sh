#!/bin/sh

# 'set -e' means the script will immediately fail if any command fails.
# This is great for debugging.
set -e

echo "--- [entrypoint.sh] Starting job: $JOB_ID ---"

# 1. Prepare folders inside the container
INPUT_DIR="/data/inputs"
OUTPUT_DIR="/data/outputs"
mkdir -p $INPUT_DIR
mkdir -p $OUTPUT_DIR

echo "--- [entrypoint.sh] Downloading files from S3 ---"

# 2. Download specific files
echo "Downloading STL: s3://$UPLOADS_BUCKET/$STL_FILE_PATH"
aws s3 cp s3://$UPLOADS_BUCKET/$STL_FILE_PATH $INPUT_DIR/input.stl

echo "Downloading Machine Config: s3://$CONFIG_BUCKET/$MACHINE_CONFIG_PATH"
aws s3 cp s3://$CONFIG_BUCKET/$MACHINE_CONFIG_PATH $INPUT_DIR/machine.json

echo "Downloading Process Config: s3://$CONFIG_BUCKET/$PROCESS_CONFIG_PATH"
aws s3 cp s3://$CONFIG_BUCKET/$PROCESS_CONFIG_PATH $INPUT_DIR/process.json

echo "Downloading Filament Config: s3://$CONFIG_BUCKET/$FILAMENT_CONFIG_PATH"
aws s3 cp s3://$CONFIG_BUCKET/$FILAMENT_CONFIG_PATH $INPUT_DIR/filament.json

echo "--- [entrypoint.sh] Downloaded files: ---"
ls -l $INPUT_DIR

# 3. Define fixed paths inside the container
STL_PATH="$INPUT_DIR/input.stl"
OUTPUT_PATH="$OUTPUT_DIR/$OUTPUT_FILE_NAME"

echo "--- [entrypoint.sh] Running Bambu Studio CLI ---"

# 4. Execute the command (single quotes are fine since we're in a script)
/app/squashfs-root/AppRun \
  --orient 1 \
  --arrange 1 \
  --load-settings "$INPUT_DIR/machine.json;$INPUT_DIR/process.json" \
  --load-filaments "$INPUT_DIR/filament.json" \
  --slice 0 \
  --debug 5 \
  --export-3mf $OUTPUT_PATH \
  $STL_PATH

echo "--- [entrypoint.sh] Slicing finished, checking output ---"
ls -l $OUTPUT_DIR

if [ ! -f "$OUTPUT_PATH" ]; then
  echo "❌ ERROR: Output file $OUTPUT_PATH was not created!"
  exit 1
fi

# 5. Upload the result
echo "--- [entrypoint.sh] Uploading $OUTPUT_PATH to s3://$PROCESSED_BUCKET/jobs/$JOB_ID/$OUTPUT_FILE_NAME ---"
aws s3 cp $OUTPUT_PATH s3://$PROCESSED_BUCKET/jobs/$JOB_ID/$OUTPUT_FILE_NAME

echo "--- [entrypoint.sh] Job completed ---"
