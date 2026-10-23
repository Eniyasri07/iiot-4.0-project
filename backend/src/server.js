import "dotenv/config";
import express from "express";
import cors from "cors";
import { EventHubConsumerClient, earliestEventPosition } from "@azure/event-hubs";
import { parseTelemetry } from "./telemetry.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",").map(value => value.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Permit command-line tools and same-origin requests without an Origin header.
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin not allowed by CORS configuration"));
  }
}));
app.use(express.json());

let consumerClient;
let subscription;
let latestTelemetry = null;
let connectionStatus = "disconnected";
let lastError = null;
let receivedCount = 0;
let isReconnecting = false;
let reconnectTimer = null;

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "azure-iot-telemetry-backend",
    connectionStatus,
    receivedCount,
    lastError
  });
});

app.get("/api/telemetry", (_req, res) => {
  res.json({
    connectionStatus,
    telemetry: latestTelemetry,
    receivedCount,
    lastError
  });
});

function scheduleReconnect() {
  if (isReconnecting) return;
  isReconnecting = true;
  clearTimeout(reconnectTimer);
  console.log("Scheduling Azure consumer reconnect in 5 seconds...");
  reconnectTimer = setTimeout(async () => {
    try {
      await subscription?.close();
      await consumerClient?.close();
    } catch {}
    isReconnecting = false;
    await startAzureConsumer();
  }, 5000);
}

async function startAzureConsumer() {
  const connectionString = process.env.AZURE_EVENTHUB_CONNECTION_STRING;
  if (!connectionString) {
    connectionStatus = "disconnected";
    lastError = "Azure endpoint is not configured on the backend.";
    console.warn(lastError);
    return;
  }

  try {
    const consumerGroup = process.env.AZURE_EVENTHUB_CONSUMER_GROUP || "$Default";
    consumerClient = new EventHubConsumerClient(consumerGroup, connectionString);
    const partitionIds = await consumerClient.getPartitionIds();
    if (!partitionIds.length) throw new Error("Azure endpoint returned no partitions.");

    connectionStatus = "connected";
    lastError = null;
    console.log(`Azure consumer initialized; partitions: ${partitionIds.join(", ")}`);

    subscription = consumerClient.subscribe({
      processEvents: async (events, context) => {
        for (const event of events) {
          latestTelemetry = parseTelemetry(event);
          receivedCount += 1;
        }
        if (events.length) {
          connectionStatus = "connected";
          lastError = null;
          console.log(`Received ${events.length} event(s); total=${receivedCount}`);
        }
      },
      processError: async (error, context) => {
        console.error("Azure consumer error:", error?.message, "partition:", context?.partitionId);
        // Only mark error status if we never received any events yet
        if (receivedCount === 0) {
          lastError = error?.message || "Azure connection issue";
          connectionStatus = "error";
        }
        scheduleReconnect();
      }
    }, { startPosition: earliestEventPosition });
  } catch (error) {
    if (receivedCount === 0) {
      connectionStatus = "error";
      lastError = error?.message || "Could not initialize Azure consumer";
    }
    console.error("Azure initialization failed:", error?.message);
    scheduleReconnect();
  }
}

const server = app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
  startAzureConsumer();
});

async function shutdown() {
  console.log("Shutting down...");
  try { await subscription?.close(); } catch {}
  try { await consumerClient?.close(); } catch {}
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
