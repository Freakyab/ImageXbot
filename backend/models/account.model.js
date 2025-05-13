const mongoose = require("mongoose");
const client = require("../config");

const AccountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    picture: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Account = client.model("Account", AccountSchema);
module.exports = Account;
