const orderStore = require("../db/orderStore");
const reviewStore = require("../db/reviewStore");

// Seed testimonials shown when there aren't enough real approved reviews
// yet (a fresh install, or early on in production) so the homepage never
// looks empty or broken. Once real reviews exist they take over — see
// getFeaturedReviews below.
const FALLBACK_REVIEWS = [
    {
        id: "seed-riya",
        rating: 5,
        title: null,
        comment: "My son asks for his OopsyInk book every single night. Seeing his own name on the page still makes him light up.",
        childName: null,
        storyTheme: null,
        author: "Riya K.",
        meta: "Mother of Kabir, age 5"
    },
    {
        id: "seed-arjun",
        rating: 5,
        title: null,
        comment: "We gave it as a birthday gift. Watching her realize she was the hero of the story was worth every bit of it.",
        childName: null,
        storyTheme: null,
        author: "Arjun D.",
        meta: "Father of Ananya, age 6"
    },
    {
        id: "seed-meera",
        rating: 4,
        title: null,
        comment: "It's become part of our bedtime routine. It's not just a book anymore — it's part of his childhood.",
        childName: null,
        storyTheme: null,
        author: "Meera S.",
        meta: "Mother of Vihaan, age 4"
    }
];

function getEligibility(orderId, userId) {

    const order = orderStore.getOrderByIdForUser(orderId, userId);

    if (!order) {
        return { eligible: false, reason: "not_found" };
    }

    if (order.status !== "delivered") {
        return { eligible: false, reason: "not_delivered" };
    }

    if (order.hasReview) {
        return { eligible: false, reason: "already_reviewed" };
    }

    return { eligible: true, reason: null };

}

function createReview({ orderId, userId, rating, title, comment }) {

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new Error("Rating must be a whole number from 1 to 5.");
    }

    const order = orderStore.getOrderByIdForUser(orderId, userId);

    if (!order) {
        throw new Error("Order not found.");
    }

    if (order.status !== "delivered") {
        throw new Error("This order hasn't been delivered yet.");
    }

    if (order.hasReview) {
        throw new Error("This order has already been reviewed.");
    }

    return reviewStore.createReview({
        orderId,
        userId,
        bookId: order.bookId,
        childName: order.childName,
        storyTheme: order.storyTheme,
        rating,
        title: title?.trim() || null,
        comment: comment?.trim() || null
    });

}

// Real approved reviews, formatted the same shape the (now-retired)
// hand-written testimonials used, so TestimonialsWidget doesn't need to
// know the difference. Falls back to the seed quotes when there aren't at
// least MIN_REAL_REVIEWS approved yet.
const MIN_REAL_REVIEWS = 3;

function getFeaturedReviews(limit = 6) {

    const approved = reviewStore.listApprovedReviews({ limit });

    if (approved.length < MIN_REAL_REVIEWS) {
        return FALLBACK_REVIEWS.slice(0, limit);
    }

    return approved.map((review) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        childName: review.childName,
        storyTheme: review.storyTheme,
        author: review.author,
        meta: review.childName ? `Parent of ${review.childName}` : null
    }));

}

function getSummary() {

    const summary = reviewStore.getSummary();

    if (summary.count < MIN_REAL_REVIEWS) {
        // Not enough real data yet to show an honest aggregate — omit it
        // rather than publish a misleading "5.0 from 1 review".
        return null;
    }

    return summary;

}

function listPublicReviews({ theme, limit } = {}) {
    return reviewStore.listApprovedReviews({ theme, limit });
}

// Admin dashboard: every review, optionally filtered by moderation status
// (pending / approved / rejected).
function listAllReviews({ status } = {}) {
    return reviewStore.listAllReviews({ status });
}

function moderateReview(id, status) {

    if (!["approved", "rejected"].includes(status)) {
        throw new Error("Status must be 'approved' or 'rejected'.");
    }

    return reviewStore.setReviewStatus(id, status);

}

module.exports = {
    getEligibility,
    createReview,
    getFeaturedReviews,
    getSummary,
    listPublicReviews,
    listAllReviews,
    moderateReview
};
