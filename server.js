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

  // Check for access code patterns
  if (dataString.includes("travel/verify?nftoken")) {
    const urlRegex = /https?:\/\/[^\s\]]+/g;
    const urls = dataString.match(urlRegex);
    const specificUrl = urls?.find((url) =>
      url.includes("travel/verify?nftoken")
    );
    if (specificUrl) {
      return specificUrl;
    }
  }

  // Check for update-primary-location URL
  if (dataString.includes("update-primary-location")) {
    const urlRegex = /https?:\/\/[^\s\]]+/g;
    const urls = dataString.match(urlRegex);
    const specificUrl = urls?.find((url) =>
      url.includes("update-primary-location")
    );
    if (specificUrl) {
      return specificUrl;
    }
  }

  return null;
};

// Route to get the link from message
app.post("/get-link", async (req, res) => {
  const { email } = req.body;
  const password = process.env.PASSWORD;

  if (!email || !password) {
    return res.status(400).json({ error: "Nhập lại mail" });
  }

  const loginPayload = { address: email, password };

  const token = await getToken(loginPayload);
  if (!token) {
    return res
      .status(401)
      .json({ error: "Mail ko đúng hoặc ko thuộc dịch vụ bên mình" });
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
    return res.status(404).json({
      error: "Mail chưa về, bạn làm lại theo thứ tự - Bấm Send mail trước nha.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
