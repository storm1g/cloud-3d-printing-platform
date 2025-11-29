// This file is for the CreateJobLambda (PrintPlatform_CreateJob)
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// Initialize AWS clients
const s3Client = new S3Client({});
const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

// Get table and bucket names from environment variables
const TABLE_NAME = process.env.JOBS_TABLE_NAME;
const BUCKET = process.env.UPLOADS_BUCKET_NAME;

export const handler = async (event) => {
  console.log("Received event:", event);

  if (!TABLE_NAME || !BUCKET) {
    console.error("Missing environment variables: JOBS_TABLE_NAME or UPLOADS_BUCKET_NAME");
    return { statusCode: 500, body: JSON.stringify({ message: "Internal server error: Configuration missing." }) };
  }
  
  let fileName;
  try {
      const body = JSON.parse(event.body);
      fileName = body.fileName;
      if (!fileName) {
          throw new Error("fileName is missing from request body");
      }
  } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return { statusCode: 400, body: JSON.stringify({ message: "Invalid request: Could not parse body." }) };
  }

  // --- SOLUTION ---
  // Standardize the filename to lowercase to ensure S3 trigger compatibility
  const originalFileName = fileName;
  const standardizedFileName = fileName.toLowerCase();
  
  // Backend validation, in case frontend validation was bypassed
  if (!standardizedFileName.endsWith('.stl')) {
      console.error("Invalid file type passed to API:", originalFileName);
      return { statusCode: 400, body: JSON.stringify({ message: "Invalid file type. Only .stl files are allowed." }) };
  }
  
  const jobId = randomUUID();
  // Use the standardized lowercase filename for the S3 key
  const s3Key = `jobs/${jobId}/${standardizedFileName}`;
  const timestamp = new Date().toISOString();

  // 1. Prepare DynamoDB entry
  const ddbParams = {
    TableName: TABLE_NAME,
    Item: {
      jobId: jobId,
      createdAt: timestamp,
      updatedAt: timestamp,
      fileName: originalFileName, // Store the original name for user display
      s3UploadKey: s3Key, // Store the standardized key we actually used
      status: "PendingUpload", // Initial status
    },
  };

  // 2. Prepare S3 Presigned URL
  const s3Params = {
    Bucket: BUCKET,
    Key: s3Key,
    // ContentType: 'model/stl' // Optional: You can enforce content type
  };

  try {
    // 1. Generate Presigned URL
    console.log("Generating presigned URL for key:", s3Key);
    const command = new PutObjectCommand(s3Params);
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minute expiry
    console.log("Presigned URL generated.");

    // 2. Write initial job status to DynamoDB
    console.log("Writing to DynamoDB:", ddbParams);
    await ddbDocClient.send(new PutCommand(ddbParams));
    console.log("DynamoDB write successful.");

    // 3. Return success response to frontend
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Allow all origins (for local testing)
      },
      body: JSON.stringify({
        jobId: jobId,
        presignedUrl: presignedUrl,
        s3Key: s3Key // Return the actual key being used
      }),
    };
  } catch (error) {
    console.error("Failed to create job:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: "Failed to create job", error: error.message }),
    };
  }
};
