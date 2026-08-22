const { getBook } = require("../utils/bookHelper");
const orderStore = require("../db/orderStore");
const analyticsService = require("./analyticsService");
const { getSignedGetUrl } = require("./s3Service");
const { isS3Key } = require("./imageStorage");
const storyThemes = require("../data/storyThemes");

// The only server-side source of truth for what a book costs — see
// BACKLOG.md P0.5. Never trust a `total` supplied by the client; this is
// what closes the "anyone can create a total: 0 order" hole.
function getThemePrice(themeId) {

    const theme = storyThemes.find((candidate) => candidate.id === themeId);

    if (!theme) {
        throw new Error("This storybook's theme is missing or unrecognized; cannot price the order.");
    }

    return theme.price;

}

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

// There's no payment gateway wired up yet — see checkout.paymentComingSoon
// on the frontend — so this doesn't verify a payment, only the price. Once
// a gateway exists, this total is what should be charged/verified against.
async function createOrder({ userId, bookId, gaClientId }) {

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
        total: getThemePrice(book.theme)
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
    const orders = orderStore.listOrdersForUser(userId);
    return Promise.all(orders.map(signOrder));
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

async function listAllOrders({ status } = {}) {

    const dbStatus = status ? (DISPLAY_TO_DB_STATUS[status] || status) : undefined;
    const orders = orderStore.listAllOrders({ status: dbStatus });

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
