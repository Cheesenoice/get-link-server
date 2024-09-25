// Replace express with native Fetch API and other built-in features
addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // Check the route
  if (url.pathname === "/") {
    return new Response(JSON.stringify("Hello"), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } else if (url.pathname === "/get-link" && request.method === "POST") {
    const body = await request.json();
    return await getLink(body);
  }

  return new Response("Not Found", { status: 404 });
}

async function getLink(body) {
  const { email } = body;
  const password = YOUR_PASSWORD_HERE; // Store your password securely

  if (!email || !password) {
    return new Response(
      JSON.stringify({ error: "Missing email or password" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const token = await getToken({ address: email, password });
  if (!token) {
    return new Response(JSON.stringify({ error: "Sai mail" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = await getMessages(token);
  if (!messages || messages["hydra:totalItems"] === 0) {
    return new Response(JSON.stringify({ error: "No messages available." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const firstMessageId = messages["hydra:member"][0]["@id"];
  const messageDetails = await getMessageDetails(firstMessageId, token);
  const link = extractLink(messageDetails);

  if (link) {
    return new Response(JSON.stringify({ link }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } else {
    return new Response(JSON.stringify({ error: "Mail chưa về" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function getToken(loginPayload) {
  const api = YOUR_API_URL_HERE; // Store your API URL securely
  try {
    const response = await fetch(`${api}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginPayload),
    });
    const data = await response.json();
    return data.token || null;
  } catch (error) {
    console.error("Error fetching token:", error.message);
    return null;
  }
}

async function getMessages(token) {
  const api = YOUR_API_URL_HERE;
  try {
    const response = await fetch(`${api}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await response.json();
  } catch (error) {
    console.error("Error fetching messages:", error.message);
    return null;
  }
}

async function getMessageDetails(messageId, token) {
  const api = YOUR_API_URL_HERE;
  try {
    const response = await fetch(`${api}/${messageId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await response.json();
  } catch (error) {
    console.error("Error fetching message details:", error.message);
    return null;
  }
}

function extractLink(messageData) {
  const dataString = JSON.stringify(messageData);

  if (
    dataString.includes("Your temporary access code") ||
    dataString.includes("Mã truy cập Netflix tạm thời của bạn")
  ) {
    let link =
      dataString
        .split("Get Code")[1]
        ?.split("[")[1]
        ?.split("]")[0]
        .replace("\\", "") ||
      dataString
        .split("Nhận mã")[1]
        ?.split("[")[1]
        ?.split("]")[0]
        .replace("\\", "");
    if (link) {
      link = link.replace("u0026", "&").replace("&", "&");
      return link;
    }
  }

  if (dataString.includes("update-primary-location")) {
    const urlRegex = /https?:\/\/[^\s\]]+/g;
    const urls = dataString.match(urlRegex);
    const specificUrl = urls.find((url) =>
      url.includes("update-primary-location")
    );
    if (specificUrl) {
      return specificUrl;
    }
  }

  return null;
}
