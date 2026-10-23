function isByte(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 255;
}

function extractAscii(payload) {
  if (Array.isArray(payload) && payload.length && payload.every(isByte)) {
    return payload.map(Number);
  }

  if (payload && typeof payload === "object") {
    const candidates = [
      payload.asciiValues,
      payload.ascii,
      payload.values,
      payload.data,
      payload.payload
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate) && candidate.length && candidate.every(isByte)) {
        return candidate.map(Number);
      }
    }
  }

  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (/^\d{1,3}(?:\s*,\s*\d{1,3})+$/.test(trimmed)) {
      const values = trimmed.split(",").map(v => Number(v.trim()));
      if (values.every(isByte)) return values;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed !== payload) return extractAscii(parsed);
    } catch {
      // Plain text is valid telemetry, just not an ASCII-number list.
    }
  }

  return null;
}

function normalizeBody(body) {
  if (Buffer.isBuffer(body)) body = body.toString("utf8");
  if (typeof body === "string") {
    const trimmed = body.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return body;
}

export function parseTelemetry(event, receivedAt = new Date()) {
  const body = normalizeBody(event?.body);
  let asciiValues = extractAscii(body);
  let convertedString = "";

  if (asciiValues && asciiValues.length > 0) {
    convertedString = String.fromCharCode(...asciiValues);
  } else if (typeof body === "string") {
    convertedString = body;
    asciiValues = Array.from(body).map(c => c.charCodeAt(0));
  } else if (body && typeof body === "object") {
    const textVal = body.message || body.msg || body.text || body.status || JSON.stringify(body);
    convertedString = typeof textVal === "string" ? textVal : JSON.stringify(textVal);
    asciiValues = Array.from(convertedString).map(c => c.charCodeAt(0));
  } else if (body !== undefined && body !== null) {
    convertedString = JSON.stringify(body);
    asciiValues = Array.from(convertedString).map(c => c.charCodeAt(0));
  }

  return {
    asciiValues: asciiValues ?? [],
    convertedString,
    rawPayload: body ?? null,
    timestamp: event?.enqueuedTimeUtc
      ? new Date(event.enqueuedTimeUtc).toISOString()
      : receivedAt.toISOString()
  };
}
