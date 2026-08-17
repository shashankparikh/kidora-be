// image/background are public/ path strings sent as-is — same pattern
// other content pages use for pre-placed frontend illustration assets.
function getContact() {

    return {
        hero: {
            eyebrow: "Contact Us",
            title_line1: "We'd Love to",
            title_line2: "Hear From",
            title_highlight: "You!",
            description: "Have a question about your storybook, an order, or OopsyInk? Our team is here to help make your experience as magical as the stories we create.",
            image: "/0opsyInk_mascot.png",
            background: "/book_ackground.png"
        },
        info: {
            heading: "Get in Touch",
            subtitle: "Have a question? We're here to help.",
            whether_label: "Whether it's about:",
            items: [
                {
                    id: "storybook",
                    image: "/personalized_storybook.png",
                    label: "Your personalized storybook"
                },
                {
                    id: "order",
                    image: "/existing_order.png",
                    label: "An existing order"
                },
                {
                    id: "careers",
                    image: "/career.png",
                    label: "Careers & internships"
                },
                {
                    id: "other",
                    image: "/contact_querires.png",
                    label: "Anything else about OopsyInk"
                }
            ],
            email_heading: "Email Us",
            email: "hello@oopsyink.com",
            email_icon: "/email.png",
            order_note_prefix: "For order-related queries, please include your",
            order_note_highlight: "Order ID",
            order_note_suffix: ".",
            response_time_label: "We usually respond within",
            response_time_value: "24–48 hours."
        },
        closing: {
            text_prefix: "Every magical story starts with a little",
            text_highlight: "conversation.",
            mascot_image: "/bottom_mascot.png",
            books_image: "/bottom_storybooks.png"
        },
        footer_strip: {
            response_time_label: "We usually respond within",
            response_time_value: "24–48 hours.",
            social_label: "You can also reach us on:"
        }
    };

}

module.exports = {
    getContact
};
