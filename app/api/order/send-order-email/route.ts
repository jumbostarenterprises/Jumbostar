// app/api/send-order-email/route.ts
import { NextResponse } from "next/server";
import { transporter, FROM_ADDRESS } from "@/lib/mailer";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, orderId, status, items, total, paid, remaining, address } = body;

        if (!email) {
            return NextResponse.json(
                { success: false, error: "No recipient email provided" },
                { status: 400 }
            );
        }

        const itemsHtml =
            Array.isArray(items) && items.length > 0
                ? items
                      .map(
                          (item: any) => `
                    <tr>
                        <td style="padding: 12px 8px; border-bottom: 1px solid #edf2f7; color: #2d3748; font-size: 14px;">
                            ${item.product_name || "Item"}
                        </td>
                        <td style="padding: 12px 8px; border-bottom: 1px solid #edf2f7; text-align: center; color: #4a5568; font-size: 14px;">
                            ${item.quantity || 0} ${item.unit || ""}
                        </td>
                        <td style="padding: 12px 8px; border-bottom: 1px solid #edf2f7; text-align: right; color: #2d3748; font-size: 14px; font-weight: 500;">
                            ₹${Number(item.subtotal || 0).toLocaleString("en-IN")}
                        </td>
                    </tr>`
                      )
                      .join("")
                : `<tr><td colspan="3" style="padding: 16px; text-align: center; color: #718096;">No items found</td></tr>`;

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Arial, sans-serif;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f4f6f8; padding: 24px 0;">
                <tr>
                    <td align="center">
                        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                            
                            <!-- Header -->
                            <tr>
                                <td style="background-color: #ffffff; padding: 24px 32px; border-bottom: 1px solid #edf2f7;">
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                        <tr>
                                            <td>
                                                <h2 style="margin: 0; color: #E11D48; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Jumbo Star Wholesale</h2>
                                            </td>
                                            <td align="right">
                                                <span style="background-color: #fff1f2; color: #E11D48; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                                                    ${status || "Order Update"}
                                                </span>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Order Meta Info -->
                            <tr>
                                <td style="padding: 24px 32px 16px 32px;">
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 6px; padding: 16px;">
                                        <tr>
                                            <td style="padding-bottom: 8px;">
                                                <span style="color: #718096; font-size: 13px;">Order ID:</span><br>
                                                <strong style="color: #2d3748; font-size: 15px;">#${orderId || "N/A"}</strong>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <span style="color: #718096; font-size: 13px;">Delivery Address:</span><br>
                                                <span style="color: #2d3748; font-size: 14px; line-height: 1.4;">${address || "N/A"}</span>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Items Table -->
                            <tr>
                                <td style="padding: 0 32px;">
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-top: 8px;">
                                        <thead>
                                            <tr style="background-color: #f8fafc;">
                                                <th style="padding: 10px 8px; text-align: left; color: #4a5568; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #edf2f7;">Product</th>
                                                <th style="padding: 10px 8px; text-align: center; color: #4a5568; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #edf2f7;">Qty</th>
                                                <th style="padding: 10px 8px; text-align: right; color: #4a5568; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #edf2f7;">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${itemsHtml}
                                        </tbody>
                                    </table>
                                </td>
                            </tr>

                            <!-- Financial Breakdown -->
                            <tr>
                                <td style="padding: 20px 32px;">
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 6px; padding: 16px;">
                                        <tr>
                                            <td style="padding: 4px 0; color: #4a5568; font-size: 14px;">Total Amount:</td>
                                            <td style="padding: 4px 0; text-align: right; color: #2d3748; font-size: 14px; font-weight: 600;">₹${Number(total || 0).toLocaleString("en-IN")}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 4px 0; color: #4a5568; font-size: 14px;">Amount Paid:</td>
                                            <td style="padding: 4px 0; text-align: right; color: #10b981; font-size: 14px; font-weight: 600;">₹${Number(paid || 0).toLocaleString("en-IN")}</td>
                                        </tr>
                                        <tr>
                                            <td colspan="2" style="padding: 8px 0;"><hr style="border: none; border-top: 1px solid #edf2f7; margin: 0;"></td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 4px 0; color: #1a202c; font-size: 15px; font-weight: bold;">Remaining Balance:</td>
                                            <td style="padding: 4px 0; text-align: right; color: #E11D48; font-size: 16px; font-weight: bold;">₹${Number(remaining || 0).toLocaleString("en-IN")}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="padding: 24px 32px 32px 32px; text-align: center; border-top: 1px solid #edf2f7;">
                                    <p style="margin: 0 0 8px 0; color: #718096; font-size: 13px;">Thank you for choosing Jumbo Star Wholesale.</p>
                                    <p style="margin: 0; color: #cbd5e0; font-size: 11px;">If you have any questions, feel free to reply directly to this email.</p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>`;

        await transporter.sendMail({
            from: FROM_ADDRESS,
            to: email,
            subject: `Jumbo Star Wholesale — ${status || "Order Update"} (#${orderId || ""})`,
            html,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("send-order-email error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to send order email" },
            { status: 500 }
        );
    }
}