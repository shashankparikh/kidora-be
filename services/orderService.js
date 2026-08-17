const { getBook } = require("../utils/bookHelper");
const orderStore = require("../db/orderStore");
const analyticsService = require("./analyticsService");

// Base price lives on the frontend today (constants/pricing.ts) since
// there's no payment gateway wired up yet to verify it server-side — see
// checkout.paymentComingSoon. `total` is trusted from the client for now;
// once real payment processing exists, computing/verifying the total here
// (from the book + add-ons) should replace this.
function createOrder({ userId, bookId, total, gaClientId }) {

    const book = getBook(bookId);

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

    const order = orderStore.createOrder({
        userId,
        bookId,
        bookTitle: book.story.title ?? "Their Storybook",
        coverImageUrl,
        storyTheme: book.theme || null,
        childName: book.child?.name || null,
        total: Number(total) || 0
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

    return order;

}

function listOrdersForUser(userId) {
    return orderStore.listOrdersForUser(userId);
}

function getOrderForUser(orderId, userId) {
    return orderStore.getOrderByIdForUser(orderId, userId);
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

function listAllOrders({ status } = {}) {

    const dbStatus = status ? (DISPLAY_TO_DB_STATUS[status] || status) : undefined;
    const orders = orderStore.listAllOrders({ status: dbStatus });

    return orders.map((order) => ({
        ...order,
        status: DB_TO_DISPLAY_STATUS[order.status] || order.status
    }));

}

module.exports = {
    createOrder,
    listOrdersForUser,
    getOrderForUser,
    listAllOrders
};
