const express = require("express");
const cors = require("cors");

const app = express();
const jwt = require("jsonwebtoken");
const Account = require("./models/account.model");
const Chat = require("./models/chats.model");
const { cloudinary } = require("./cloundinary");
const { GoogleGenAI, Modality, Type } = require("@google/genai");

const PORT = process.env.PORT || 8000;
app.use(cors());
app.use(express.json());

app.get("/", async (_, res) => {
  try {
    return res.status(200).json({
      message: "Welcome to the Image-X-Bot API",
      status: true,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { name, email, password, picture } = req.body;
    const existingAccount = await Account.findOne({ email });

    if (existingAccount) {
      const token = jwt.sign(
        { id: existingAccount._id },
        process.env.JWT_SECRET,
        {}
      );
      return res.status(201).json({
        message: "User found",
        status: true,
        user: { ...existingAccount._doc, token },
      });
    }

    const newAccount = new Account({ name, email, password, picture });
    await newAccount.save();

    const newToken = jwt.sign(
      { id: newAccount._id },
      process.env.JWT_SECRET,
      {}
    );
    return res.status(201).json({
      message: "User created successfully",
      status: true,
      user: { ...newAccount._doc, token: newToken },
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

const uploadImageToCloudinary = async (base64, fileName) => {
  try {
    const stream = await cloudinary.uploader.upload(
      "data:image/png;base64," + base64,
      {
        public_id: fileName,
        overwrite: true,
      }
    );

    setTimeout(async () => {
      try {
        await cloudinary.uploader.destroy(fileName);
      } catch (err) {
        console.error(`Failed to delete image ${fileName}: `, err.message);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return stream.secure_url;
  } catch (err) {
    console.error("Cloudinary upload failed:", err.message);
    return null;
  }
};

app.post("/upload", async (req, res) => {
  try {
    const { context, imageUrl, userId, history } = req.body;
    if (!context || !userId) {
      return res.status(400).json({
        message: "All fields are required",
        status: false,
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
    const userInputDate = new Date();

    let aiResult;
    let result;
    let isImageRequest = !!imageUrl;
    let chatType = "text";

    switch (true) {
      case /^\/imagine/i.test(context):
        chatType = "image_generation";
        break;
      case isImageRequest:
        chatType = "image_analysis";
        break;
      case /^\/code/i.test(context):
        chatType = "code";
        break;
      default:
        chatType = "text";
    }

    switch (chatType) {
      case "image_generation": {
        aiResult = await ai.models.generateContent({
          model: "gemini-2.0-flash-preview-image-generation",
          contents: context,
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE],
          },
        });

        const candidate = aiResult?.candidates?.[0];
        const contentParts = candidate?.content?.parts || [];

        let imageUrlResult = null;
        let textResponse = "";

        for (const part of contentParts) {
          if (part.inlineData?.data) {
            const fileName = `imageBot_generated_image_${Date.now()}`;
            imageUrlResult = await uploadImageToCloudinary(
              part.inlineData.data,
              fileName
            );
          }
          if (part.text) textResponse += part.text;
        }
        if (!imageUrlResult) {
          return res.status(400).json({
            message: "Image generation failed",
            status: false,
          });
        }

        result = { context: textResponse, imageUrl: imageUrlResult };
        break;
      }

      case "image_analysis": {
        const imageResponse = await fetch(imageUrl);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString("base64");

        aiResult = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [
            {
              inlineData: {
                mimeType: "image/jpeg", // you can improve this by detecting actual type
                data: base64Image,
              },
            },
            {
              text: `prompt: ${context}`,
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              type: Type.OBJECT,
              properties: {
                context: {
                  type: Type.STRING,
                  description: "AI generated response",
                },
              },
            },
          },
        });

        result = JSON.parse(aiResult.text);

        // delete the image from cloudinary using url
        const imageUrlParts = imageUrl.split("/");
        const publicId = imageUrlParts[imageUrlParts.length - 1].split(".")[0];

        setTimeout(async () => {
          try {
            await cloudinary.uploader.destroy(publicId, {
              resource_type: "image",
            });
          } catch (err) {
            console.error(`Failed to delete image ${publicId}: `, err.message);
          }
        }, 2 * 60 * 1000); // 2 minutes
        break;
      }

      case "text":
      default: {
        aiResult = ai.chats.create({
          model: "gemini-2.0-flash",
          history,
          config: {
            ...(chatType === "code" && { tools: [{ codeExecution: {} }] }),
          },
        });

        const stream = await aiResult.sendMessage({
          message: context,
        });

        const chunks = stream.text;

        result = {
          context: chunks,
        };

        aiResult.usageMetadata = {
          promptTokenCount: stream.usageMetadata.promptTokenCount,
          candidatesTokenCount: stream.usageMetadata.candidatesTokenCount,
        };
        break;
      }
    }

    if (!result?.context) {
      return res.status(400).json({
        message: "Invalid AI response format",
        status: false,
      });
    }

    // Save user prompt
    const userPromptChat = new Chat({
      userId,
      content: context,
      imageUrl:
        chatType === "image_generation"
          ? null
          : isImageRequest
          ? imageUrl
          : null,
      type: "user",
      tokenUsed: aiResult.usageMetadata.promptTokenCount,
      createdAt: userInputDate,
    });
    await userPromptChat.save();

    // Save AI response
    const aiResponseChat = new Chat({
      userId,
      content: result.context,
      type: "bot",
      imageUrl: chatType === "image_generation" ? result.imageUrl : null,
      tokenUsed: aiResult?.usageMetadata?.candidatesTokenCount || 0,
      createdAt: new Date(),
    });
    await aiResponseChat.save();

    return res.status(200).json({
      message: "AI response generated successfully",
      status: true,
      chats: {
        user: userPromptChat._doc,
        ai: aiResponseChat._doc,
      },
    });
  } catch (err) {
    console.error("Upload Error:", err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
      error: err.message,
    });
  }
});

app.get("/getChats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    //get all images from cloudinary starting with imageBot_generated_image
    const images = await cloudinary.api.resources({
      type: "upload",
      prefix: "imageBot_generated_image",
      max_results: 30,
    });

    // delete all images from cloudinary
    if (images.resources.length !== 0) {
      for (const image of images.resources) {
        const publicId = image.public_id;
        const createdAt = new Date(image.created_at);
        const now = new Date();
        const diffMs = now - createdAt;
        const diffMinutes = diffMs / (60 * 1000);

        if (diffMinutes >= 5) {
          await cloudinary.uploader.destroy(publicId, {
            resource_type: "image",
          });
        }
      }
    }

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
        status: false,
      });
    }

    const chats = await Chat.find({ userId });
    return res.status(200).json({
      message: "Chats fetched successfully",
      status: true,
      chats,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.listen(PORT, () => {
  console.warn(`🚀 Server is listening on port ${PORT}`);
});
