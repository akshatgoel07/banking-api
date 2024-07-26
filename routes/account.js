const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware");
const { Account } = require("../db");
const mongoose = require("mongoose");

router.get("/balance", authMiddleware, async (req, res) => {
	try {
		console.log("Authenticated userId:", req.userId);

		const account = await Account.findOne({
			userId: req.userId,
		});

		console.log("Found account:", account);

		if (!account) {
			return res.status(404).json({ message: "Account not found" });
		}

		res.json({
			balance: account.balance,
		});
	} catch (error) {
		console.error("Error fetching balance:", error);
		res.status(500).json({
			message: "Error fetching balance",
			error: error.message,
		});
	}
});
router.post("/transfer", authMiddleware, async (req, res) => {
	const session = await mongoose.startSession();

	session.startTransaction();
	const { amount, to } = req.body;

	const account = await Account.findOne({ userId: req.userId }).session(
		session,
	);

	if (!account || account.balance < amount) {
		await session.abortTransaction();
		return res.status(400).json({
			message: "Insufficient balance",
		});
	}

	const toAccount = await Account.findOne({ userId: to }).session(session);

	if (!toAccount) {
		await session.abortTransaction();
		return res.status(400).json({
			message: "Invalid account",
		});
	}

	await Account.updateOne(
		{ userId: req.userId },
		{ $inc: { balance: -amount } },
	).session(session);
	await Account.updateOne(
		{ userId: to },
		{ $inc: { balance: amount } },
	).session(session);

	await session.commitTransaction();
	res.json({
		message: "Transfer successful",
	});
});
router.post("/deposit", authMiddleware, async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const { amount } = req.body;

		if (!amount || amount <= 0) {
			return res.status(400).json({
				message: "Invalid deposit amount",
			});
		}

		const account = await Account.findOne({ userId: req.userId }).session(
			session,
		);

		if (!account) {
			await session.abortTransaction();
			return res.status(404).json({
				message: "Account not found",
			});
		}

		await Account.updateOne(
			{ userId: req.userId },
			{ $inc: { balance: amount } },
		).session(session);

		await session.commitTransaction();

		res.json({
			message: "Deposit successful",
			newBalance: account.balance + amount,
		});
	} catch (error) {
		await session.abortTransaction();
		console.error("Error processing deposit:", error);
		res.status(500).json({
			message: "Error processing deposit",
			error: error.message,
		});
	}
});

router.post("/withdraw", authMiddleware, async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const { amount } = req.body;

		if (!amount || amount <= 0) {
			return res.status(400).json({
				message: "Invalid withdrawal amount",
			});
		}

		const account = await Account.findOne({ userId: req.userId }).session(
			session,
		);

		if (!account) {
			await session.abortTransaction();
			return res.status(404).json({
				message: "Account not found",
			});
		}

		if (account.balance < amount) {
			await session.abortTransaction();
			return res.status(400).json({
				message: "Insufficient balance",
			});
		}

		await Account.updateOne(
			{ userId: req.userId },
			{ $inc: { balance: -amount } },
		).session(session);

		await session.commitTransaction();

		res.json({
			message: "Withdrawal successful",
			newBalance: account.balance - amount,
		});
	} catch (error) {
		await session.abortTransaction();
		console.error("Error processing withdrawal:", error);
		res.status(500).json({
			message: "Error processing withdrawal",
			error: error.message,
		});
	}
});

module.exports = router;
