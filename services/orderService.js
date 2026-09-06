const { getBook } = require("../utils/bookHelper");
const pipeline = require("./orderPipeline");
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

// The admin Orders ledger filters by where an order is, not by the eleven
// individual pipeline statuses — an operator wants "still ours", "at the
// printer", "done", not a tab per state. Groups live here rather than in the
// admin app so the API and the screen cannot drift apart.
const STATUS_GROUPS = {
    open: [
        pipeline.STATUS.NEW_ORDER,
        pipeline.STATUS.PREVIEW_GENERATED,
        pipeline.STATUS.PENDING_REVIEW,
        pipeline.STATUS.BUYER_COMMENTS,
        pipeline.STATUS.PREVIEW_APPROVED,
        pipeline.STATUS.PREVIEW_AUTO_APPROVED
    ],
    production: [
        pipeline.STATUS.BOOK_GENERATED,
        pipeline.STATUS.PRINTING,
        pipeline.STATUS.SHIPPED
    ],
    delivered: [pipeline.STATUS.DELIVERED],
    cancelled: [pipeline.STATUS.CANCELLED]
};

async function listAllOrders({ status, group } = {}) {

    const orders = await orderStore.listAllOrders({
        status: status || undefined,
        statuses: group ? STATUS_GROUPS[group] : undefined
    });

    return Promise.all(orders.map(signOrder));

}

module.exports = {
    STATUS_GROUPS,
    createOrder,
    listOrdersForUser,
    getOrderForUser,
    listAllOrders
};
