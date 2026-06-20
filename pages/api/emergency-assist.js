// pages/api/emergency-assist.js

import fs from "fs";
import path from "path";
import axios from "axios";

// Load the knowledge base from JSON once at startup.
let knowledgeBase = {};
try {
  const kbPath = path.join(process.cwd(), "Chatbot", "Chatbot", "knowledge_base.json");
  const data = fs.readFileSync(kbPath, "utf8");
  knowledgeBase = JSON.parse(data);
  console.log("📚 Knowledge base loaded.");
} catch (error) {
  console.error("🚨 Error loading knowledge base:", error);
}

// Function to perform a simple keyword match search in the knowledge base.
function getKnowledgeContext(query) {
  const cleanQuery = query.toLowerCase();
  const categories = [
    "Ambulance Related Queries",
    "Fire Brigade Related Queries",
    "Police Related Queries",
    "Miscellaneous Serious Emergency Questions",
    "General Emergency Questions"
  ];
  for (const category of categories) {
    const entries = knowledgeBase[category];
    if (entries) {
      for (const key in entries) {
        const searchTerm = key.toLowerCase().replace(/_/g, " ");
        if (cleanQuery.includes(searchTerm)) {
          console.log(`🔍 Matched context in [${category}] with key: ${key}`);
          return entries[key];
        }
      }
    }
  }
  return "";
}

// Function to get chatbot response from OpenRouter API.
// Accepts an optional conversation array for maintaining context.
async function getChatbotResponse(query, context, conversation = null) {
  const fullPrompt = context ? `${context}\nUser: ${query}` : query;
  // Build the messages array using previous conversation if provided.
  const messages = conversation && Array.isArray(conversation)
    ? conversation.concat([{ role: "user", content: fullPrompt }])
    : [
        {
          role: "system",
          content:
            "You are an emergency response chatbot. Provide concise and helpful responses in plain language. Avoid repeating emergency advice unless absolutely necessary. If the user is in India or mentions India, advise to dial 112 instead of 911 only when needed."
        },
        { role: "user", content: fullPrompt }
      ];
  
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-small-24b-instruct-2501", // Ensure this is a valid model ID.
        messages: messages,
        max_tokens: 150
      },
      {
        headers: {
          Authorization: `Bearer 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`
        },
        timeout: 15000
      }
    );
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    } else {
      console.error("Unexpected response structure:", response.data);
      return "I'm sorry, I couldn't process your request.";
    }
  } catch (error) {
    console.error("Error from OpenRouter API:", error.response?.data || error.message);
    return "I'm sorry, I couldn't process your request.";
  }
}

// The API route handler.
export default async function handler(req, res) {
  if (req.method === "POST") {
    const { message, latitude, longitude, conversation } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }
    
    // Retrieve context from the knowledge base.
    const context = getKnowledgeContext(message);
    
    // Get chatbot response, passing along any conversation history.
    const chatbotResponse = await getChatbotResponse(message, context, conversation);
    
    return res.status(200).json({ response: chatbotResponse });
  }
  
  return res.status(405).json({ error: "Method not allowed" });
}
