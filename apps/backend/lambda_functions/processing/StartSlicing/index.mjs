// Import necessary AWS SDK v3 modules
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";

// Initialize clients
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const sfnClient = new SFNClient({});

// Read resource names from Environment Variables
const JOBS_TABLE_NAME = process.env.JOBS_TABLE_NAME;
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN;

export const handler = async (event) => {
  console.log("Received S3 event:", JSON.stringify(event, null, 2));

  try {
    // 1. Extract file information from the S3 event
    // S3 events can contain multiple records, process the first one
    const s3Record = event.Records[0].s3;
    const bucketName = s3Record.bucket.name;
    const objectKey = decodeURIComponent(s3Record.object.key.replace(/\+/g, " ")); // Handle spaces in filenames

    console.log(`Processing object ${objectKey} from bucket ${bucketName}`);

    // Extract JobId and FileName from the S3 key (e.g., jobs/jobId/fileName.stl)
    const keyParts = objectKey.split('/');
    if (keyParts.length < 3 || keyParts[0] !== 'jobs') {
      console.warn(`Object key ${objectKey} does not match expected format 'jobs/jobId/fileName'. Skipping.`);
      return { statusCode: 200, body: 'Object key format not applicable.' };
    }
    const jobId = keyParts[1];
    const fileName = keyParts.slice(2).join('/'); // Handle filenames with slashes if any

    console.log(`Extracted JobId: ${jobId}, FileName: ${fileName}`);

    // 2. Update DynamoDB status to "Slicing"
    const dbParams = {
      TableName: JOBS_TABLE_NAME,
      Key: { jobId: jobId },
      UpdateExpression: "set #st = :newStatus",
      ExpressionAttributeNames: { "#st": "status" },
      ExpressionAttributeValues: { ":newStatus": "Slicing" },
      // Optional: Add ConditionExpression to only update if status is 'PendingUpload'
      // ConditionExpression: "#st = :pendingStatus",
      // ExpressionAttributeValues: { ":newStatus": "Slicing", ":pendingStatus": "PendingUpload" },
    };

    console.log("Updating DynamoDB:", dbParams);
    await docClient.send(new UpdateCommand(dbParams));

    // 3. Prepare the input for the Step Function
    // For now, we assume fixed config paths. Later, these could come from DynamoDB or the event.
    const stateMachineInput = {
      JobId: jobId,
      StlFilePath: objectKey, // Pass the full S3 key
      MachineConfigPath: "machine.json", // Assuming this is always the same for now
      ProcessConfigPath: "process.json", // Assuming this is the default for now
      FilamentConfigPath: "filament.json",// Assuming this is the default for now
      OutputFileName: `sliced_${fileName.replace(/\.[^/.]+$/, "")}.3mf` // Generate an output name
    };

    // 4. Start the Step Function execution
    const sfnParams = {
      stateMachineArn: STATE_MACHINE_ARN,
      input: JSON.stringify(stateMachineInput),
      // Optional: Provide a unique name for the execution for traceability
      // name: `slicing-${jobId}-${Date.now()}`
    };

    console.log("Starting Step Function execution:", sfnParams);
    await sfnClient.send(new StartExecutionCommand(sfnParams));

    console.log("Successfully started Step Function for JobId:", jobId);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Slicing process started successfully", jobId: jobId }),
    };

  } catch (error) {
    console.error("Error processing S3 event:", error);
    // Consider adding error handling, e.g., updating DynamoDB status to "Failed"
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to process S3 event", error: error.message }),
    };
  }
};

