const { getBook } = require("../utils/bookHelper");
const orderStore = require("../db/orderStore");
const analyticsService = require("./analyticsService");
const { getSignedGetUrl } = require("./s3Service");
const { isS3Key } = require("./imageStorage");

// orders.cover_image_url is a bare S3 key for any order placed after the
// P0.1 privacy fix (see BACKLOG.md) — this signs it into a short-lived URL
// right before the order is handed to a client, same pattern as
// utils/bookHelper.toPublicBook. Older rows may still hold a plain public
// URL from before that fix; those pass through unchanged.
async function signOrder(order) {

    if (!order || !isS3Key(order.coverImageUrl)) {
        return order;
    }

    return {
        ...order,
        coverImageUrl: await getSignedGetUrl(order.coverImageUrl)
    };

}

// `total` is trusted here on purpose — this function is no longer reachable
// from any HTTP route directly (there is deliberately no POST /orders
// anymore; see routes/orders.js and BACKLOG.md P0.5). Its only caller is
// services/paymentService.js, after a Razorpay payment has actually been
// verified/captured, passing the amount that was really charged. Never
// wire a new route straight to this function without pricing/payment
// verification in front of it.
async function createOrder({ userId, bookId, gaClientId, total }) {

    if (!Number.isFinite(total) || total <= 0) {
        throw new Error("A valid order total is required.");
    }

    const book = await getBook(bookId);

    if (!book) {
        throw new Error("Book not found.");
    }

    if (book.userId && book.userId !== userId) {
        throw new Error("This storybook belongs to a different account.");
    }

    if (!book.story) {
        throw new Error("This storybook isn't ready yet.");
    }

    const coverImageUrl = book.story.pages?.[0]?.illustration ?? null;

    const order = await orderStore.createOrder({
        userId,
        bookId,
        bookTitle: book.story.title ?? "Their Storybook",
        coverImageUrl,
        storyTheme: book.theme || null,
        childName: book.child?.name || null,
        total
    });

    // Fire-and-forget: analyticsService catches its own errors, so this
    // never blocks or fails order creation on an analytics hiccup.
    analyticsService.sendPurchaseEvent({
        clientId: gaClientId,
        orderId: order.id,
        total: order.total,
        bookTitle: order.bookTitle,
        storyTheme: order.storyTheme
    });

    return signOrder(order);

}

async function listOrdersForUser(userId) {
    const orders = await orderStore.listOrdersForUser(userId);
    return Promise.all(orders.map(signOrder));
}

async function getOrderForUser(orderId, userId) {
    return await orderStore.getOrderByIdForUser(orderId, userId);
}

// Admin dashboard deals in "pending / success / rejected" — there's no
// real payment gateway yet, so every order the system creates today lands
// straight on the DB's 'delivered' status (see orders table comment in
// database.js). Rather than invent a literal 'success' status string in
// the DB (which would fork from the 'delivered' language the customer-
// facing Orders page already uses), this aliases at the API boundary:
// 'success' in <-> 'delivered' in the DB, everything else passes through
// unchanged so a real 'pending'/'rejected' status can be introduced later
// (e.g. once a payment gateway exists) without another migration here.
const DISPLAY_TO_DB_STATUS = { success: "delivered" };
const DB_TO_DISPLAY_STATUS = { delivered: "success" };

async function listAllOrders({ status } = {}) {

    const dbStatus = status ? (DISPLAY_TO_DB_STATUS[status] || status) : undefined;
    const orders = await orderStore.listAllOrders({ status: dbStatus });

    return Promise.all(orders.map(async (order) => signOrder({
        ...order,
        status: DB_TO_DISPLAY_STATUS[order.status] || order.status
    })));

}

module.exports = {
    createOrder,
    listOrdersForUser,
    getOrderForUser,
    listAllOrders
};
