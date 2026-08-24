import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { toEmail, customerName, orderId, orderStatus, paymentStatus, totalAmount, remainingBalance } = body;

        if (!toEmail) {
            return NextResponse.json({ success: false, error: 'No recipient email provided' }, { status: 400 });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const statusLabel: Record<string, string> = {
            processing: 'Confirmed',
            shipped: 'Shipped',
            delivered: 'Delivered',
            cancelled: 'Cancelled',
        };

        const mailOptions = {
            from: `"Jambostar Enterprises" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Update on your order ${orderId}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                    <h2 style="color: #dc2626;">Order Update</h2>
                    <p>Hi ${customerName || 'there'},</p>
                    <p>Your order <strong>${orderId}</strong> has been updated:</p>
                    <ul style="list-style-type: none; padding: 0;">
                        ${orderStatus ? `<li><strong>Order Status:</strong> ${statusLabel[orderStatus] || orderStatus}</li>` : ''}
                        ${paymentStatus ? `<li><strong>Payment Status:</strong> ${paymentStatus.toUpperCase()}</li>` : ''}
                        <li><strong>Total Amount:</strong> ₹${Number(totalAmount).toLocaleString()}</li>
                        ${remainingBalance ? `<li><strong>Remaining Balance:</strong> ₹${Number(remainingBalance).toLocaleString()}</li>` : ''}
                    </ul>
                    <br/>
                    <p style="font-size: 12px; color: #777;">This is an automated notification from Jambostar Enterprises.</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        return NextResponse.json({ success: true, message: 'Customer email sent successfully' });
    } catch (error: any) {
        console.error('Error sending customer email:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}