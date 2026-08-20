import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { orderId, total, paymentMethod, customerName, customerPhone, address, items, deliveryEstimate } = body;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Format items as a clean, normal text list (No tables)
        const itemsList = items.map((item: any) => 
            `• ${item.product_name} (${item.variant_name}) - Qty: ${item.quantity} ${item.unit || ''} | Price: ₹${item.price_at_purchase} | Subtotal: ₹${item.subtotal}`
        ).join('<br/>');

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Sending to ADMIN
            subject: `🚨 New Wholesale Order Received: ${orderId}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                    <h2 style="color: #dc2626;">New Order Received! 🎉</h2>
                    <p>A new wholesale order has just been placed. Here are the details:</p>
                    
                    <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Customer Details</h3>
                    <ul style="list-style-type: none; padding: 0;">
                        <li><strong>Company/Name:</strong> ${customerName}</li>
                        <li><strong>Phone:</strong> ${customerPhone}</li>
                        <li><strong>Delivery Address:</strong> ${address}</li>
                    </ul>

                    <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Order Summary</h3>
                    <ul style="list-style-type: none; padding: 0;">
                        <li><strong>Order ID:</strong> ${orderId}</li>
                        <li><strong>Total Amount:</strong> ₹${total}</li>
                        <li><strong>Payment Method:</strong> ${paymentMethod.toUpperCase()}</li>
                        <li><strong>Est. Delivery:</strong> ${deliveryEstimate}</li>
                    </ul>

                    <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Products Ordered</h3>
                    <p>
                        ${itemsList}
                    </p>
                    
                    <br/>
                    <p style="font-size: 12px; color: #777;">This is an automated notification from your Wholesale Management System.</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        return NextResponse.json({ success: true, message: 'Admin email sent successfully' });
    } catch (error: any) {
        console.error('Error sending admin email:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}