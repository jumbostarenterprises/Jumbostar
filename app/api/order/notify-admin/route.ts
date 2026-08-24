// app/api/notify-admin/route.ts
import { NextResponse } from "next/server";
import { transporter, FROM_ADDRESS } from "@/lib/mailer";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            orderId,
            total,
            paymentMethod,
            customerName,
            customerPhone,
            address,
            items,
            status,
        } = body;

        const itemsHtml =
            Array.isArray(items) && items.length > 0
                ? items
                      .map(
                          (item: any) => `
                    <tr>
                        <td style="padding:8px;border-bottom:1px solid #eee;">${item.product_name || "Item"}</td>
                        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity || 0} ${item.unit || ""}</td>
                        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">₹${Number(item.subtotal || 0).toLocaleString("en-IN")}</td>
                    </tr>`
                      )
                      .join("")
                : `<tr><td colspan="3" style="padding:8px;">No items</td></tr>`;

        const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color:#E11D48;">${status || "Order Update"}</h2>
            <p><strong>Order ID:</strong> ${orderId || "N/A"}</p>
            <p><strong>Customer:</strong> ${customerName || "N/A"}</p>
            <p><strong>Phone:</strong> ${customerPhone || "N/A"}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod || "N/A"}</p>
            <p><strong>Delivery Address:</strong> ${address || "N/A"}</p>
            <table style="width:100%;border-collapse:collapse;margin-top:12px;">
                <thead>
                    <tr style="background:#f8fafc;">
                        <th style="padding:8px;text-align:left;">Product</th>
                        <th style="padding:8px;text-align:center;">Qty</th>
                        <th style="padding:8px;text-align:right;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
            </table>
            <h3 style="text-align:right;margin-top:12px;">Total: ₹${Number(total || 0).toLocaleString("en-IN")}</h3>
        </div>`;

        await transporter.sendMail({
            from: FROM_ADDRESS,
            to: process.env.EMAIL_USER, // admin inbox
            subject: `[Jumbo Star] ${status || "Order Update"} — ${orderId || ""}`,
            html,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("notify-admin error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to send admin notification" },
            { status: 500 }
        );
    }
}