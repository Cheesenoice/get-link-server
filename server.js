const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8080;
const api = process.env.API;

app.use(cors());
app.use(express.json());

// Add the GET route to respond with "Hello"
app.get("/", (req, res) => {
  res.json("Hello");
});

// Reuse axios instance with defaults for common settings
const axiosInstance = axios.create({
  baseURL: api,
  headers: {
    "Content-Type": "application/json",
  },
});

// Get Token
const getToken = async (loginPayload) => {
  try {
    const response = await axiosInstance.post("/token", loginPayload);
    return response.data.token || null;
  } catch (error) {
    console.error("Error fetching token:", error.message);
    return null;
  }
};

// Get Messages
const getMessages = async (token) => {
  try {
    const response = await axiosInstance.get("/messages", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching messages:", error.message);
    return null;
  }
};

// Get Message Details
const getMessageDetails = async (messageId, token) => {
  try {
    const response = await axiosInstance.get(`${messageId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching message details:", error.message);
    return null;
  }
};

// Optimized extractLink function
const extractLink = (messageData) => {
  const dataString = JSON.stringify(messageData);

  const codePatterns = [
    "Your temporary access code",
    "Mã truy cập Netflix tạm thời của bạn",
  ];

  const matchedPattern = codePatterns.find((pattern) =>
    dataString.includes(pattern)
  );

  if (matchedPattern) {
    let link = dataString.split(matchedPattern)[1]?.match(/\[(.*?)\]/)?.[1];
    if (link) {
      return link.replace(/\\u0026/g, "&");
    }
  }

  const updatePattern = /https?:\/\/[^\s\]]+/g;
  const updateLinks = dataString.match(updatePattern);
  return (
    updateLinks?.find((url) => url.includes("update-primary-location")) || null
  );
};

// Route to get the link from message
app.post("/get-link", async (req, res) => {
  const { email } = req.body;
  const password = process.env.PASSWORD;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  const loginPayload = { address: email, password };

  const token = await getToken(loginPayload);
  if (!token) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const messages = await getMessages(token);
  if (!messages || messages["hydra:totalItems"] === 0) {
    return res.status(404).json({ error: "No messages available." });
  }

  const firstMessageId = messages["hydra:member"][0]["@id"];
  const messageDetails = await getMessageDetails(firstMessageId, token);

  const link = extractLink(messageDetails);
  if (link) {
    return res.json({ link });
  } else {
    return res.status(404).json({ error: "No link found in the message." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
