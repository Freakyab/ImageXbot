const mongoose = require("mongoose");
const client = require("../config");

const ChatSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    tokenUsed: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["user", "bot"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: false,
    },
    // isImage: {
    //   type: Boolean,
    //   required: true,
    // },
  },
  {
    timestamps: true,
  }
);

const Chat = client.model("Chat", ChatSchema);
module.exports = Chat;
