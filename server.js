const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8080;
const api = process.env.API;

app.use(cors());
app.use(express.json());

const axiosInstance = axios.create({
  baseURL: api,
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper function to get a token
const getToken = async (loginPayload) => {
  try {
    const response = await axiosInstance.post("/token", loginPayload);
    return response.data.token || null;
  } catch (error) {
    console.error("Error fetching token:", error.message);
    return null;
  }
};

// Helper function to get messages
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

// Helper function to get message details
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

// Helper function to extract the link
const extractLink = (messageData, email) => {
  const dataString = JSON.stringify(messageData);

  if (
    (dataString.includes("travel/verify?nftoken") ||
      dataString.includes("update-primary-location")) &&
    (email ? dataString.includes(email) : true)
  ) {
    const urlRegex = /https?:\/\/[^\s\]]+/g;
    const urls = dataString.match(urlRegex);
    return urls?.find(
      (url) =>
        url.includes("travel/verify?nftoken") ||
        url.includes("update-primary-location")
    );
  }

  return null;
};

// Route for the first logic (specific token-based email extraction)
app.post("/get-link", async (req, res) => {
  const { email } = req.body;
  const password = process.env.PASSWORD;

  if (!email || !password) {
    return res.status(400).json({ error: "Vui lòng nhập mail" });
  }

  const loginPayload = { address: email, password };
  const token = await getToken(loginPayload);

  if (!token) {
    return res.status(401).json({
      error: "Mail ko đúng hoặc ko thuộc dịch vụ bên mình",
    });
  }

  const messages = await getMessages(token);
  if (!messages || messages["hydra:totalItems"] === 0) {
    return res.status(404).json({ error: "No messages available." });
  }

  const relevantMessages = messages["hydra:member"].slice(0, 3);
  for (const message of relevantMessages) {
    const messageId = message["@id"];
    const messageDetails = await getMessageDetails(messageId, token);

    const link = extractLink(messageDetails);
    if (link) {
      return res.json({ link });
    }
  }

  return res.status(404).json({
    error: "Mail chưa về, bạn làm lại theo thứ tự - Bấm Send mail trước nha.",
  });
});

// Route for the second logic (general email extraction)
app.post("/yandex-link", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Vui lòng nhập mail" });
  }

  const loginPayload = {
    address: process.env.EMAIL,
    password: process.env.PASSWORD,
  };

  const token = await getToken(loginPayload);

  if (!token) {
    return res.status(500).json({ error: "Unable to retrieve token." });
  }

  const messages = await getMessages(token);
  if (!messages || messages["hydra:totalItems"] === 0) {
    return res.status(404).json({ error: "No messages available." });
  }

  const relevantMessages = messages["hydra:member"].slice(0, 3);
  for (const message of relevantMessages) {
    const messageId = message["@id"];
    const messageDetails = await getMessageDetails(messageId, token);

    const link = extractLink(messageDetails, email);
    if (link) {
      return res.json({ link });
    }
  }

  return res.status(404).json({
    error:
      "Mail chưa về hoặc sai mail, bạn làm lại theo thứ tự - Bấm Send mail trước nha.",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
