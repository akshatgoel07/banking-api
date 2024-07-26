const mongoose = require("mongoose");
require("dotenv").config();

mongoose
	.connect(process.env.MONGODB_URI)

	.then(() => console.log("MongoDB connected successfully"))
	.catch((err) => console.error("MongoDB connection error:", err));

const userSchema = new mongoose.Schema({
	username: {
		type: String,
		required: true,
		unique: true,
		minLength: 4,
	},
	password: {
		type: String,
		required: true,
		minLength: 6,
	},
	firstName: {
		type: String,
		required: true,
	},
	lastName: {
		type: String,
		required: true,
	},
});

const accountSchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	balance: {
		type: Number,
		required: true,
	},
});

const User = mongoose.model("User", userSchema);
const Account = mongoose.model("Account", accountSchema);

module.exports = {
	User,
	Account,
};
