// lib/mailer.ts
// Shared nodemailer transporter. Put this file at: lib/mailer.ts
// Requires: npm install nodemailer
// Requires .env.local: EMAIL_USER, EMAIL_PASS (see note at bottom of this response)

import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const FROM_ADDRESS = `"Jumbo Star Wholesale" <${process.env.EMAIL_USER}>`;