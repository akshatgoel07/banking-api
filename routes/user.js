const express = require("express");
const router = express.Router();
const zod = require("zod");
const bcrypt = require("bcrypt");

const { User, Account } = require("../db");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

const saltRounds = 10;

const signupBody = zod.object({
	username: zod.string(),
	firstName: zod.string(),
	lastName: zod.string(),
	password: zod.string(),
});

router.post("/signup", async (req, res) => {
	const { success } = signupBody.safeParse(req.body);
	if (!success) {
		res.status(411).json({
			message: "Incorrect input format",
		});
	}

	const existingUser = await User.findOne({
		username: req.body.username,
	});

	if (existingUser) {
		return res.status(411).json({ Message: "user already exists" });
	}

	const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
	console.log(hashedPassword);

	console.log("Attempting to create user with data:", {
		username: req.body.username,
		firstName: req.body.firstName,
		lastName: req.body.lastName,
		password: hashedPassword,
	});

	const user = await User.create({
		username: req.body.username,
		firstName: req.body.firstName,
		lastName: req.body.lastName,
		password: hashedPassword,
	});

	console.log("User created:", user);

	if (!user || !user._id) {
		throw new Error("Failed to create user");
	}

	const userId = user._id;

	await Account.create({
		userId,
		balance: 1 + Math.random() * 10000,
	});

	const token = jwt.sign(
		{
			userId,
		},
		JWT_SECRET,
	);
	res.json({
		message: "User created successfully",
		token: token,
	});
});

const signinBody = zod.object({
	username: zod.string(),
	password: zod.string(),
});
router.post("/signin", async (req, res) => {
	const parseResult = signinBody.safeParse(req.body);
	if (!parseResult.success) {
		return res.status(400).json({
			message: "Invalid input",
			details: parseResult.error.errors,
		});
	}

	try {
		const user = await User.findOne({ username: req.body.username });
		if (!user) {
			return res.status(401).json({ message: "User not found" });
		}

		const passwordMatch = await bcrypt.compare(
			req.body.password,
			user.password,
		);
		if (!passwordMatch) {
			return res.status(401).json({ message: "Incorrect password" });
		}

		const token = jwt.sign(
			{
				userId: user._id,
			},
			JWT_SECRET,
		);

		res.json({
			token: token,
		});
	} catch (error) {
		console.error("Error during signin:", error);
		res.status(500).json({ message: "Error while logging in" });
	}
});

module.exports = router;
